"""
Generation Worker for Aurastream.

This worker processes generation jobs from a Redis queue using RQ (Redis Queue).
It handles the complete lifecycle of asset generation:
1. Receives job from queue
2. Updates job status to PROCESSING
3. Calls Nano Banana (Gemini) API to generate image
4. Optionally composites brand logo onto generated image
5. For Twitch emotes: removes background and creates all 3 required sizes (112, 56, 28)
6. Uploads generated image(s) to Supabase Storage
7. Creates asset record(s) in database
8. Updates job status to COMPLETED (or FAILED on error)

Note: CPU-intensive operations (PIL, rembg) run in thread pool executors
to avoid blocking the async event loop.

Graceful Shutdown Note:
    RQ Worker handles graceful shutdown via SIGTERM/SIGINT signals. When a shutdown
    signal is received, RQ will:
    1. Stop accepting new jobs
    2. Wait for the current job to complete (up to job_timeout)
    3. Then terminate cleanly
    This ensures in-progress uploads complete before worker shutdown.
    See: https://python-rq.org/docs/workers/#graceful-shutdown

Usage:
    python -m backend.workers.generation_worker
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from io import BytesIO
from typing import List, Optional, TYPE_CHECKING

from PIL import Image
from redis import Redis
from rq import Worker, Queue

from backend.services.generation_service import (
    get_generation_service,
    JobStatus,
    ASSET_DIMENSIONS,
)
from backend.services.nano_banana_client import (
    GenerationRequest,
    MediaAssetInput,
)
from backend.services.nano_banana_provenance import (
    get_provenance_nano_banana_client,
    GenerationContext,
)
from backend.services.storage_service import get_storage_service
from backend.services.logo_service import get_logo_service
from backend.services.logo_compositor import get_logo_compositor
from backend.services.creator_media.placement_formatter import get_placement_formatter
from backend.services.exceptions import (
    RateLimitError,
    ContentPolicyError,
    GenerationTimeoutError,
    GenerationError,
    JobNotFoundError,
)
from backend.services.async_executor import run_cpu_bound
from backend.workers.execution_report import (
    create_report,
    submit_execution_report,
    ExecutionOutcome,
)
from backend.services.sse.completion_store import get_completion_store

if TYPE_CHECKING:
    from backend.services.generation_service import Asset

# Configure logging at module level for RQ job processes
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

WORKER_NAME = "generation_worker"
QUEUE_NAME = "generation"
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# Twitch emote sizes required for upload (largest to smallest)
TWITCH_EMOTE_SIZES = [112, 56, 28]

# TikTok emote sizes required for upload (largest to smallest)
TIKTOK_EMOTE_SIZES = [300, 200, 100]


async def _store_sse_progress(job_id: str, progress: int, message: str = "") -> None:
    """
    Store SSE progress event for real-time frontend updates.
    
    Uses the canonical stream ID format `gen:{job_id}` which matches
    what the frontend polls for via the SSE recovery endpoint.
    
    Args:
        job_id: Generation job UUID
        progress: Progress percentage (0-100)
        message: Optional progress message
    """
    try:
        from backend.services.sse import get_stream_registry, StreamType

        completion_store = get_completion_store()
        registry = get_stream_registry()
        stream_id = f"gen:{job_id}"

        # Ensure stream is registered (idempotent - won't fail if already registered)
        try:
            existing = await registry.get_stream(stream_id)
            if not existing:
                # Get user_id from job for registration
                from backend.database.supabase_client import get_supabase_client
                db = get_supabase_client()
                job_result = db.table("generation_jobs").select("user_id").eq("id", job_id).single().execute()
                if job_result.data:
                    await registry.register(
                        stream_id=stream_id,
                        stream_type=StreamType.GENERATION,
                        user_id=job_result.data["user_id"],
                        metadata={"job_id": job_id, "source": "worker"},
                    )
            else:
                # Update heartbeat for existing stream
                await registry.heartbeat(stream_id)
        except Exception as reg_err:
            logger.debug(f"Stream registration skipped (non-fatal): {reg_err}")

        # Store the progress event
        await completion_store.store_event(
            stream_id=stream_id,
            event_id=f"progress_{progress}",
            event_data={
                "type": "progress",
                "job_id": job_id,
                "progress": progress,
                "message": message,
            },
        )
        logger.debug(f"Stored SSE progress: job_id={job_id}, progress={progress}")
    except Exception as e:
        # Non-fatal - don't block generation for SSE issues
        logger.debug(f"Failed to store SSE progress (non-fatal): {e}")


def is_twitch_emote(asset_type: str) -> bool:
    """Check if asset type is a Twitch emote that needs multi-size processing."""
    return asset_type in {"twitch_emote", "twitch_emote_112"}


def is_tiktok_emote(asset_type: str) -> bool:
    """Check if asset type is a TikTok emote that needs multi-size processing."""
    return asset_type in {"tiktok_emote", "tiktok_emote_300"}


async def download_media_assets(
    placements: List[dict],
    timeout: float = 30.0,
) -> tuple[List[MediaAssetInput], List[dict]]:
    """
    Download media assets from their URLs for attachment to Nano Banana.
    
    Args:
        placements: List of placement dictionaries containing asset URLs
        timeout: HTTP timeout in seconds
        
    Returns:
        Tuple of (successfully downloaded MediaAssetInput list, successful placement dicts)
        Only returns placements that were successfully downloaded to ensure 1:1 mapping.
    """
    import httpx

    media_assets = []
    successful_placements = []

    # Sort by z_index for consistent ordering (matches prompt formatter)
    sorted_placements = sorted(placements, key=lambda p: p.get('zIndex') or p.get('z_index', 1))

    async with httpx.AsyncClient(timeout=timeout) as client:
        for placement in sorted_placements:
            url = placement.get('url', '')
            if not url:
                logger.warning(f"Skipping placement with no URL: {placement.get('displayName', 'unknown')}")
                continue

            try:
                # Use processed_url (background removed) if available, otherwise original
                processed_url = placement.get('processedUrl') or placement.get('processed_url')
                fetch_url = processed_url if processed_url else url

                response = await client.get(fetch_url)
                if response.status_code == 200:
                    # Determine MIME type from response or default to PNG
                    content_type = response.headers.get('content-type', 'image/png')
                    if ';' in content_type:
                        content_type = content_type.split(';')[0].strip()

                    # Validate we got actual image data
                    if len(response.content) < 100:
                        logger.warning(
                            f"Downloaded asset too small, likely invalid: "
                            f"name={placement.get('displayName', 'unknown')}, size={len(response.content)}"
                        )
                        continue

                    media_assets.append(MediaAssetInput(
                        image_data=response.content,
                        mime_type=content_type,
                        asset_id=placement.get('assetId') or placement.get('asset_id', ''),
                        display_name=placement.get('displayName') or placement.get('display_name', 'asset'),
                        asset_type=placement.get('assetType') or placement.get('asset_type', 'image'),
                    ))
                    # Only add to successful placements if download succeeded
                    successful_placements.append(placement)

                    logger.info(
                        f"Downloaded media asset: name={placement.get('displayName', 'unknown')}, "
                        f"type={placement.get('assetType', 'unknown')}, "
                        f"size={len(response.content)} bytes"
                    )
                else:
                    logger.warning(
                        f"Failed to download media asset: status={response.status_code}, "
                        f"name={placement.get('displayName', 'unknown')}"
                    )
            except Exception as e:
                logger.warning(
                    f"Error downloading media asset: error={e}, "
                    f"name={placement.get('displayName', 'unknown')}"
                )

    return media_assets, successful_placements


def _process_emote_sync(image_data: bytes, sizes: List[int]) -> List[tuple]:
    """
    Synchronous emote processing - runs in thread pool.
    
    Removes background and creates all size variants.
    Returns list of (size, png_bytes) tuples.
    """
    import rembg

    # Step 1: Remove background (CPU-intensive)
    transparent_bytes = rembg.remove(image_data)

    # Load as PIL Image for resizing
    img = Image.open(BytesIO(transparent_bytes)).convert("RGBA")

    results = []

    # Step 2: Process each size
    for size in sizes:
        # Resize using Lanczos for best quality
        resized = img.resize((size, size), Image.Resampling.LANCZOS)

        # Export as PNG with transparency
        buffer = BytesIO()
        resized.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)
        png_bytes = buffer.read()

        results.append((size, png_bytes))

    return results


async def process_twitch_emote_sizes(
    image_data: bytes,
    user_id: str,
    job_id: str,
    generation_service,
    storage_service,
) -> List[dict]:
    """
    Process a Twitch emote into all three required sizes (112, 56, 28).
    
    Steps:
    1. Remove background using rembg (in thread pool)
    2. Resize to each Twitch size using Lanczos (in thread pool)
    3. Upload each size to storage
    4. Create asset records for each size
    
    All CPU-intensive PIL/rembg operations run in thread pool executor
    to avoid blocking the async event loop.
    
    Args:
        image_data: Raw image bytes from AI generation
        user_id: User ID for storage path
        job_id: Job ID for storage path and asset linking
        generation_service: Service for creating asset records
        storage_service: Service for uploading to storage
        
    Returns:
        List of created asset dicts with id, url, width, height
    """
    logger.info(f"Processing Twitch emote (background removal + resize): job_id={job_id}")

    # Run CPU-intensive processing in thread pool
    processed_sizes = await run_cpu_bound(_process_emote_sync, image_data, TWITCH_EMOTE_SIZES)

    created_assets = []

    # Upload and create records for each size
    for size, png_bytes in processed_sizes:
        logger.info(f"Uploading emote size {size}x{size}: job_id={job_id}")

        # Determine asset type for this size
        asset_type = f"twitch_emote_{size}"

        # Upload to storage
        upload_result = await storage_service.upload_asset(
            user_id=user_id,
            job_id=job_id,
            image_data=png_bytes,
            content_type="image/png",
            suffix=f"_{size}x{size}"  # Add size suffix to filename
        )

        # Verify upload succeeded with expected size
        if upload_result.file_size != len(png_bytes):
            logger.error(f"Upload size mismatch for emote {size}x{size}: expected={len(png_bytes)}, got={upload_result.file_size}")
            raise GenerationError(f"Upload verification failed for emote {size}x{size} - size mismatch")

        # Create asset record
        asset = await generation_service.create_asset(
            job_id=job_id,
            user_id=user_id,
            asset_type=asset_type,
            url=upload_result.url,
            storage_path=upload_result.path,
            width=size,
            height=size,
            file_size=len(png_bytes),
            is_public=False
        )

        created_assets.append({
            "id": asset.id,
            "url": upload_result.url,
            "width": size,
            "height": size,
            "asset_type": asset_type,
        })

        logger.info(f"Created emote asset {size}x{size}: asset_id={asset.id}")

    return created_assets


async def process_tiktok_emote_sizes(
    image_data: bytes,
    user_id: str,
    job_id: str,
    generation_service,
    storage_service,
) -> List[dict]:
    """
    Process a TikTok emote into all three required sizes (300, 200, 100).
    
    Steps:
    1. Remove background using rembg (in thread pool)
    2. Resize to each TikTok size using Lanczos (in thread pool)
    3. Upload each size to storage
    4. Create asset records for each size
    
    All CPU-intensive PIL/rembg operations run in thread pool executor
    to avoid blocking the async event loop.
    
    Args:
        image_data: Raw image bytes from AI generation
        user_id: User ID for storage path
        job_id: Job ID for storage path and asset linking
        generation_service: Service for creating asset records
        storage_service: Service for uploading to storage
        
    Returns:
        List of created asset dicts with id, url, width, height
    """
    logger.info(f"Processing TikTok emote (background removal + resize): job_id={job_id}")

    # Run CPU-intensive processing in thread pool
    processed_sizes = await run_cpu_bound(_process_emote_sync, image_data, TIKTOK_EMOTE_SIZES)

    created_assets = []

    # Upload and create records for each size
    for size, png_bytes in processed_sizes:
        logger.info(f"Uploading TikTok emote size {size}x{size}: job_id={job_id}")

        # Determine asset type for this size
        asset_type = f"tiktok_emote_{size}"

        # Upload to storage
        upload_result = await storage_service.upload_asset(
            user_id=user_id,
            job_id=job_id,
            image_data=png_bytes,
            content_type="image/png",
            suffix=f"_{size}x{size}"  # Add size suffix to filename
        )

        # Verify upload succeeded with expected size
        if upload_result.file_size != len(png_bytes):
            logger.error(f"Upload size mismatch for TikTok emote {size}x{size}: expected={len(png_bytes)}, got={upload_result.file_size}")
            raise GenerationError(f"Upload verification failed for TikTok emote {size}x{size} - size mismatch")

        # Create asset record
        asset = await generation_service.create_asset(
            job_id=job_id,
            user_id=user_id,
            asset_type=asset_type,
            url=upload_result.url,
            storage_path=upload_result.path,
            width=size,
            height=size,
            file_size=len(png_bytes),
            is_public=False
        )

        created_assets.append({
            "id": asset.id,
            "url": upload_result.url,
            "width": size,
            "height": size,
            "asset_type": asset_type,
        })

        logger.info(f"Created TikTok emote asset {size}x{size}: asset_id={asset.id}")

    return created_assets


def get_redis_connection() -> Redis:
    """Create a Redis connection from the configured URL."""
    return Redis.from_url(REDIS_URL)


def get_queue() -> Queue:
    """Get the generation queue instance."""
    redis_conn = get_redis_connection()
    return Queue(QUEUE_NAME, connection=redis_conn)


async def _prepare_generation_context(
    job,
    job_params: dict,
    width: int,
    height: int,
    job_id: str,
) -> dict:
    """
    Pre-flight preparation: gather all resources needed for generation.
    
    This ensures all async operations (downloads, lookups) complete BEFORE
    we call Nano Banana, preventing race conditions.
    
    Args:
        job: The generation job object
        job_params: Job parameters dict
        width: Target width
        height: Target height
        job_id: Job ID for logging
        
    Returns:
        Dict with all prepared context:
        - final_prompt: The complete prompt with any placement instructions
        - input_image: Optional reference image bytes
        - conversation_history: Optional multi-turn history
        - media_assets: List of downloaded MediaAssetInput objects
        - verified: Boolean indicating all required resources are ready
        - warnings: List of non-fatal warnings
    """
    context = {
        "final_prompt": job.prompt,
        "input_image": None,
        "input_mime_type": "image/png",
        "conversation_history": None,
        "media_assets": None,
        "verified": True,
        "warnings": [],
    }

    # 1. Check for recreation mode - download reference thumbnail
    if job_params.get("recreation_mode") and job_params.get("reference_thumbnail_url"):
        logger.info(f"Recreation mode: downloading reference thumbnail for job_id={job_id}")
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                ref_url = job_params["reference_thumbnail_url"]
                response = await client.get(ref_url)
                if response.status_code == 200 and len(response.content) > 100:
                    context["input_image"] = response.content
                    context["input_mime_type"] = "image/jpeg"
                    logger.info(f"Downloaded reference thumbnail: {len(response.content)} bytes")
                else:
                    context["warnings"].append(f"Failed to download reference thumbnail: status={response.status_code}")
                    logger.warning(f"Failed to download reference thumbnail: {response.status_code}")
        except Exception as e:
            context["warnings"].append(f"Error downloading reference thumbnail: {e}")
            logger.warning(f"Error downloading reference thumbnail: {e}")

    # 2. Check for refinement mode - load conversation history
    if job_params.get("is_refinement") and job_params.get("conversation_history"):
        context["conversation_history"] = job_params["conversation_history"]
        logger.info(f"Refinement mode: using conversation history with {len(context['conversation_history'])} turns")

    # 3. Check for canvas snapshot mode (single-image mode)
    # Canvas is the SOURCE OF TRUTH for composition - prompt provides style/standards
    canvas_snapshot_url = job_params.get("canvas_snapshot_url")
    canvas_snapshot_description = job_params.get("canvas_snapshot_description")

    # DEBUG: Log all job params to trace canvas snapshot flow
    logger.info(f"[CANVAS DEBUG] job_id={job_id} job_params keys: {list(job_params.keys())}")
    logger.info(f"[CANVAS DEBUG] job_id={job_id} canvas_snapshot_url: {canvas_snapshot_url}")
    logger.info(f"[CANVAS DEBUG] job_id={job_id} canvas_snapshot_description: {canvas_snapshot_description}")

    if canvas_snapshot_url:
        logger.info(f"Canvas snapshot mode: downloading snapshot for job_id={job_id}, url={canvas_snapshot_url}")
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(canvas_snapshot_url)
                if response.status_code == 200 and len(response.content) > 100:
                    # Use canvas snapshot as input image
                    context["input_image"] = response.content
                    context["input_mime_type"] = "image/png"

                    # Build prompt with CANVAS as reference, coach prompt as PRIMARY instructions
                    canvas_description = job_params.get("canvas_snapshot_description", "")
                    coach_prompt = job.prompt.strip() if job.prompt else ""

                    # Log what we're working with
                    logger.info(f"[CANVAS DEBUG] job_id={job_id} coach_prompt: {coach_prompt[:500] if coach_prompt else 'NONE'}...")
                    logger.info(f"[CANVAS DEBUG] job_id={job_id} canvas_description: {canvas_description}")

                    # Check if coach_prompt already contains structured sections (from service.py)
                    # If it has "CANVAS LAYOUT:" and "USER REQUESTS:", use it directly
                    if "CANVAS LAYOUT:" in coach_prompt and "USER REQUESTS:" in coach_prompt:
                        # Coach already built a structured prompt - use it with wrapper
                        canvas_section = f"""CREATE a professional YouTube gaming thumbnail based on this reference layout.

REFERENCE IMAGE: Shows element positions to follow (attached image)

{coach_prompt}

=== CRITICAL RULES ===
1. CREATE NEW ARTWORK - Do NOT copy the reference image pixel-for-pixel
2. Follow the LAYOUT (where things are positioned) but make it look professional
3. TEXT STYLING: Any text must be BOLD, LARGE, and use YouTube gaming thumbnail style fonts
   - Main text should be HUGE and eye-catching
   - Use dramatic colors, outlines, and shadows
   - Text should POP and be readable at small sizes
4. If the USER REQUESTS say to REMOVE text, DO NOT include that text
5. If the USER REQUESTS say to CHANGE text, use the NEW text they specified
6. Add professional lighting, depth, and visual polish
7. Make it look like a TOP YouTube gaming thumbnail that gets clicks

Output: {width}x{height} pixels"""
                    else:
                        # Legacy format - build prompt from scratch
                        canvas_section = f"""CREATE a professional YouTube gaming thumbnail based on this reference layout.

REFERENCE IMAGE: Shows element positions to follow (attached image)
Canvas elements: {canvas_description}

=== YOUR INSTRUCTIONS ===
{coach_prompt if coach_prompt else "Transform this into a polished, professional gaming thumbnail."}

=== CRITICAL RULES ===
1. CREATE NEW ARTWORK - Do NOT copy the reference image pixel-for-pixel
2. Follow the LAYOUT (where things are positioned) but make it look professional
3. TEXT STYLING: Any text must be BOLD, LARGE, and use YouTube gaming thumbnail style fonts
   - Main text should be HUGE and eye-catching
   - Use dramatic colors, outlines, and shadows
   - Text should POP and be readable at small sizes
4. If the instructions say to REMOVE text, DO NOT include that text
5. If the instructions say to CHANGE text, use the NEW text they specified
6. Add professional lighting, depth, and visual polish
7. Make it look like a TOP YouTube gaming thumbnail that gets clicks

Output: {width}x{height} pixels"""

                    context["final_prompt"] = canvas_section

                    # LOG THE FULL PROMPT FOR DEBUGGING
                    logger.info(f"[NANO BANANA PROMPT] job_id={job_id}")
                    logger.info(f"{'='*60}")
                    logger.info(f"{context['final_prompt']}")
                    logger.info(f"{'='*60}")

                    logger.info(f"[CANVAS DEBUG] job_id={job_id} Downloaded canvas snapshot: {len(response.content)} bytes")
                    logger.info(f"[CANVAS DEBUG] job_id={job_id} Canvas-first prompt built, length={len(context['final_prompt'])}")
                    logger.info(f"[CANVAS DEBUG] job_id={job_id} input_image set: {context.get('input_image') is not None}")
                else:
                    context["warnings"].append(f"Failed to download canvas snapshot: status={response.status_code}")
                    logger.warning(f"Failed to download canvas snapshot: {response.status_code}")
        except Exception as e:
            context["warnings"].append(f"Error downloading canvas snapshot: {e}")
            logger.warning(f"Error downloading canvas snapshot: {e}")

    # 4. Download media assets if placements provided (legacy mode, skipped if canvas snapshot used)
    elif not canvas_snapshot_url:
        media_placements = job_params.get("media_asset_placements") or job_params.get("media_placements")
        if media_placements:
            logger.info(f"Downloading media assets for generation: job_id={job_id}, count={len(media_placements)}")

            try:
                media_assets, successful_placements = await download_media_assets(media_placements)

                if media_assets:
                    context["media_assets"] = media_assets

                    # CRITICAL: Only use placements that successfully downloaded
                    # This ensures 1:1 mapping between Image 1, Image 2, etc. in prompt and attached images
                    if len(successful_placements) != len(media_placements):
                        context["warnings"].append(
                            f"Only {len(successful_placements)}/{len(media_placements)} media assets downloaded successfully"
                        )
                        logger.warning(
                            f"Partial media download: {len(successful_placements)}/{len(media_placements)} succeeded"
                        )

                    # Format placement instructions ONLY for successfully downloaded assets
                    placement_formatter = get_placement_formatter()
                    placement_prompt_section = placement_formatter.format_placements(
                        placements=successful_placements,  # Use only successful ones!
                        canvas_width=width,
                        canvas_height=height,
                    )

                    # Append placement instructions to prompt
                    context["final_prompt"] = f"{job.prompt}\n\n{placement_prompt_section}"

                    logger.info(
                        f"Media assets prepared: job_id={job_id}, "
                        f"count={len(media_assets)}, "
                        f"types={[a.asset_type for a in media_assets]}"
                    )
                else:
                    context["warnings"].append("No media assets could be downloaded")
                    logger.warning(f"No media assets downloaded despite {len(media_placements)} placements")

            except Exception as e:
                context["warnings"].append(f"Failed to prepare media assets: {e}")
                logger.warning(f"Failed to download media assets: {e}")

    # 5. Download reference assets from coach session (visual references user attached)
    # These are different from media_asset_placements - they're visual references
    # the user attached during the coach conversation to show what they want
    reference_assets = job_params.get("reference_assets")
    if reference_assets and not context["media_assets"]:
        logger.info(f"Downloading reference assets for generation: job_id={job_id}, count={len(reference_assets)}")

        try:
            # Convert reference assets to placement format for download
            ref_placements = [
                {
                    "url": ref.get("url"),
                    "displayName": ref.get("display_name", f"Reference {i+1}"),
                    "assetType": ref.get("asset_type", "reference"),
                    "assetId": ref.get("asset_id", ""),
                }
                for i, ref in enumerate(reference_assets)
            ]

            ref_media_assets, successful_refs = await download_media_assets(ref_placements)

            if ref_media_assets:
                # Initialize media_assets if not already set
                if context["media_assets"] is None:
                    context["media_assets"] = []

                context["media_assets"].extend(ref_media_assets)

                # Add reference context to prompt
                ref_context = "\n\nREFERENCE IMAGES:\n"
                for i, ref in enumerate(successful_refs, 1):
                    ref_name = ref.get("displayName", f"Reference {i}")
                    ref_desc = reference_assets[i-1].get("description", "") if i <= len(reference_assets) else ""
                    ref_context += f"- Image {i}: \"{ref_name}\""
                    if ref_desc:
                        ref_context += f" - {ref_desc}"
                    ref_context += "\n"
                ref_context += "\nUse these reference images as visual inspiration for style, mood, and composition.\n"

                context["final_prompt"] = f"{context['final_prompt']}{ref_context}"

                logger.info(
                    f"Reference assets prepared: job_id={job_id}, "
                    f"count={len(ref_media_assets)}, "
                    f"names={[a.display_name for a in ref_media_assets]}"
                )
            else:
                context["warnings"].append("No reference assets could be downloaded")
                logger.warning(f"No reference assets downloaded despite {len(reference_assets)} provided")

        except Exception as e:
            context["warnings"].append(f"Failed to prepare reference assets: {e}")
            logger.warning(f"Failed to download reference assets: {e}")

    # 6. Auto-fetch image references for game elements in prompt
    # This prevents hallucination by giving NanoBanana actual images to reference
    # Skip if we already have media assets or canvas snapshot (user provided their own references)
    auto_reference_enabled = job_params.get("auto_reference_images", True)  # Default enabled
    if auto_reference_enabled and not context["input_image"] and not context["media_assets"]:
        try:
            from backend.services.coach.grounding import get_image_reference_service
            from backend.services.nano_banana_client import MediaAssetInput

            ref_service = get_image_reference_service()
            game_hint = job_params.get("game_name") or job_params.get("game")

            # Search for game elements in the prompt
            ref_result = await ref_service.get_references_for_prompt(
                prompt=context["final_prompt"],
                game_hint=game_hint,
                max_references=3,  # Limit to avoid overwhelming the model
            )

            if ref_result.references:
                logger.info(
                    f"Auto-fetched {len(ref_result.references)} image references for job_id={job_id}: "
                    f"{[r.element.name for r in ref_result.references]}"
                )

                # Convert to MediaAssetInput format
                if context["media_assets"] is None:
                    context["media_assets"] = []

                # Build reference context for prompt
                ref_context = "\n\nVISUAL REFERENCES (use these as ground truth for appearance):\n"

                for i, ref in enumerate(ref_result.references, 1):
                    # Add as media asset
                    context["media_assets"].append(MediaAssetInput(
                        image_data=ref.image_data,
                        mime_type=ref.mime_type,
                        asset_id=f"auto_ref_{i}",
                        display_name=ref.element.name,
                        asset_type=ref.element.element_type.value,
                    ))

                    # Add to prompt context
                    ref_context += (
                        f"- Image {i}: {ref.element.name} ({ref.element.element_type.value}) "
                        f"- COPY this exact appearance, do NOT hallucinate\n"
                    )

                ref_context += "\nIMPORTANT: Use these reference images as the EXACT visual source. Do not guess or imagine what these elements look like.\n"

                context["final_prompt"] = f"{context['final_prompt']}{ref_context}"

            elif ref_result.elements_found:
                # Found elements but couldn't fetch images
                context["warnings"].append(
                    f"Found game elements but couldn't fetch references: {[e.name for e in ref_result.elements_not_found]}"
                )
                logger.warning(
                    f"Could not fetch image references for: {[e.name for e in ref_result.elements_not_found]}"
                )

        except ImportError:
            logger.debug("Image reference service not available")
        except Exception as e:
            context["warnings"].append(f"Auto-reference fetch failed: {e}")
            logger.warning(f"Failed to auto-fetch image references: {e}")

    # 7. Final verification
    # Log the prepared context for debugging
    logger.info(
        f"Generation context prepared: job_id={job_id}, "
        f"prompt_length={len(context['final_prompt'])}, "
        f"has_input_image={context['input_image'] is not None}, "
        f"has_history={context['conversation_history'] is not None}, "
        f"media_asset_count={len(context['media_assets']) if context['media_assets'] else 0}, "
        f"has_reference_assets={bool(reference_assets)}, "
        f"warnings={len(context['warnings'])}"
    )

    return context


async def _try_claim_job(generation_service, job_id: str) -> tuple[bool, str]:
    """
    Attempt to claim a job for processing using optimistic locking.
    
    This prevents race conditions where multiple workers try to process
    the same job simultaneously.
    
    Args:
        generation_service: The generation service instance
        job_id: Job UUID to claim
        
    Returns:
        Tuple of (success: bool, current_status: str)
        - success=True if job was successfully claimed (transitioned to PROCESSING)
        - success=False if job was already claimed or in terminal state
    """
    from backend.database.supabase_client import get_supabase_client

    db = get_supabase_client()

    # Atomically update status from QUEUED to PROCESSING
    # This uses optimistic locking - only succeeds if status is still QUEUED
    result = (
        db.table("generation_jobs")
        .update({
            "status": JobStatus.PROCESSING.value,
            "progress": 10,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", job_id)
        .eq("status", JobStatus.QUEUED.value)  # Optimistic lock: only if still QUEUED
        .execute()
    )

    if result.data:
        # Successfully claimed the job
        return True, JobStatus.PROCESSING.value

    # Job was not in QUEUED state - check current status
    check_result = db.table("generation_jobs").select("status").eq("id", job_id).execute()

    if check_result.data:
        return False, check_result.data[0]["status"]

    return False, "not_found"


async def _create_asset_with_usage_increment(
    generation_service,
    job_id: str,
    user_id: str,
    asset_type: str,
    url: str,
    storage_path: str,
    width: int,
    height: int,
    file_size: int,
    is_public: bool = False,
    thought_signature: Optional[str] = None,
) -> "Asset":
    """
    Create an asset and increment user usage in a single transaction.
    
    This prevents double-increment race conditions by ensuring both operations
    happen atomically. If asset creation fails, usage is not incremented.
    If usage increment fails, the asset is still created but logged.
    
    Args:
        generation_service: The generation service instance
        job_id: Associated generation job ID
        user_id: Owner's user ID
        asset_type: Type of asset
        url: Public URL to access the asset
        storage_path: Internal storage path
        width: Asset width in pixels
        height: Asset height in pixels
        file_size: File size in bytes
        is_public: Whether asset is publicly accessible
        thought_signature: Optional Gemini thought signature for multi-turn refinements (base64)
        
    Returns:
        Created Asset with generated ID
    """
    from backend.database.supabase_client import get_supabase_client

    db = get_supabase_client()

    # First, create the asset
    asset = await generation_service.create_asset(
        job_id=job_id,
        user_id=user_id,
        asset_type=asset_type,
        url=url,
        storage_path=storage_path,
        width=width,
        height=height,
        file_size=file_size,
        is_public=is_public,
        thought_signature=thought_signature,
    )

    # Then increment usage - this is idempotent per job via the asset creation
    # If this fails, the asset is still created but usage won't be tracked
    try:
        db.rpc("increment_user_usage", {"p_user_id": user_id}).execute()
        logger.info(f"Incremented usage counter: user_id={user_id}, asset_id={asset.id}")
    except Exception as e:
        logger.warning(f"Failed to increment usage counter (asset still created): user_id={user_id}, error={e}")

    return asset


async def _try_complete_job(job_id: str) -> bool:
    """
    Attempt to complete a job using optimistic locking.
    
    Only completes the job if it's still in PROCESSING state, preventing
    race conditions where the job status may have changed.
    
    Args:
        job_id: Job UUID to complete
        
    Returns:
        True if job was successfully completed, False if status had changed
    """
    from backend.database.supabase_client import get_supabase_client

    db = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()

    # Atomically update status from PROCESSING to COMPLETED
    # This uses optimistic locking - only succeeds if status is still PROCESSING
    result = (
        db.table("generation_jobs")
        .update({
            "status": JobStatus.COMPLETED.value,
            "progress": 100,
            "completed_at": now,
            "updated_at": now,
        })
        .eq("id", job_id)
        .eq("status", JobStatus.PROCESSING.value)  # Optimistic lock: only if still PROCESSING
        .execute()
    )

    return bool(result.data)


def _validate_job_parameters(job_params: dict, asset_type: str) -> tuple[bool, str]:
    """
    Validate job parameters before processing.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Validate asset type
    if not asset_type:
        return False, "Missing asset_type"

    # Validate dimensions if provided
    width = job_params.get("width")
    height = job_params.get("height")
    if width is not None and height is not None:
        if not isinstance(width, int) or not isinstance(height, int):
            return False, "width and height must be integers"
        if width < 1 or height < 1:
            return False, "width and height must be positive"
        if width > 4096 or height > 4096:
            return False, "width and height must be <= 4096"

    # Validate brand_kit_id format if provided
    brand_kit_id = job_params.get("brand_kit_id")
    if brand_kit_id and not isinstance(brand_kit_id, str):
        return False, "brand_kit_id must be a string"

    # Validate logo parameters if include_logo is set
    if job_params.get("include_logo"):
        if not job_params.get("brand_kit_id"):
            return False, "brand_kit_id required when include_logo is true"

    return True, ""


async def process_generation_job(job_id: str, user_id: str) -> dict:
    """
    Process a single generation job.
    
    Steps:
    1. Idempotency check - skip if already processed or processing
    2. Claim job with optimistic locking
    3. Get asset dimensions for asset type
    4. Call Nano Banana API with prompt
    5. Optionally composite logo onto generated image
    6. Upload generated image to storage
    7. Create asset record with atomic usage increment
    8. Update job status to COMPLETED
    """
    logger.info(f"Starting generation job: job_id={job_id}, user_id={user_id}")

    generation_service = get_generation_service()
    nano_banana_client = get_provenance_nano_banana_client()
    storage_service = get_storage_service()
    logo_service = get_logo_service()
    logo_compositor = get_logo_compositor()

    try:
        # Step 1: Idempotency check - get job and verify it's in a processable state
        job = await generation_service.get_job(user_id, job_id)

        # Check if job is already in a terminal or processing state
        if job.status == JobStatus.COMPLETED:
            logger.info(f"Skipping already completed job: job_id={job_id}")
            return {"job_id": job_id, "status": "skipped", "reason": "already_completed"}

        if job.status == JobStatus.FAILED:
            logger.info(f"Skipping already failed job: job_id={job_id}")
            return {"job_id": job_id, "status": "skipped", "reason": "already_failed"}

        if job.status == JobStatus.PROCESSING:
            logger.info(f"Skipping job already being processed: job_id={job_id}")
            return {"job_id": job_id, "status": "skipped", "reason": "already_processing"}

        # Validate job parameters before claiming
        is_valid, error_msg = _validate_job_parameters(job.parameters or {}, job.asset_type)
        if not is_valid:
            logger.error(f"Invalid job parameters: job_id={job_id}, error={error_msg}")
            await _fail_job(generation_service, job_id, f"Invalid parameters: {error_msg}")
            return {"job_id": job_id, "status": "failed", "error": error_msg}

        # Step 2: Claim job with optimistic locking
        # This prevents race conditions where multiple workers pick up the same job
        claimed, current_status = await _try_claim_job(generation_service, job_id)

        if not claimed:
            logger.info(
                f"Failed to claim job (already claimed or processed): "
                f"job_id={job_id}, current_status={current_status}"
            )
            return {"job_id": job_id, "status": "skipped", "reason": f"claim_failed_{current_status}"}

        # Step 3: Get asset dimensions
        # Profile Creator passes custom dimensions in parameters
        asset_type = job.asset_type
        job_params = job.parameters or {}

        if job_params.get("width") and job_params.get("height"):
            # Use custom dimensions from Profile Creator
            width = job_params["width"]
            height = job_params["height"]
        else:
            # Fall back to ASSET_DIMENSIONS lookup
            dimensions = ASSET_DIMENSIONS.get(asset_type, (1280, 720))
            width, height = dimensions

        # Step 4: Prepare all generation context (downloads, placements, etc.)
        # This is a pre-flight check that ensures all resources are ready BEFORE calling Nano Banana
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=20)
        await _store_sse_progress(job_id, 20, "Analyzing prompt...")

        generation_context = await _prepare_generation_context(
            job=job,
            job_params=job_params,
            width=width,
            height=height,
            job_id=job_id,
        )

        # Log any warnings from preparation
        for warning in generation_context["warnings"]:
            logger.warning(f"Preparation warning for job_id={job_id}: {warning}")

        # Step 5: Call Nano Banana API with prepared context and provenance capture
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=30)
        await _store_sse_progress(job_id, 30, "Generating asset...")

        # DEBUG: Log what we're sending to Nano Banana
        logger.info(f"[CANVAS DEBUG] Worker: Building GenerationRequest for job_id={job_id}")
        logger.info(f"[CANVAS DEBUG] Worker: input_image present: {generation_context.get('input_image') is not None}")
        logger.info(f"[CANVAS DEBUG] Worker: final_prompt length: {len(generation_context.get('final_prompt', ''))}")
        if generation_context.get('input_image'):
            logger.info(f"[CANVAS DEBUG] Worker: input_image size: {len(generation_context['input_image'])} bytes")

        # Determine if grounding should be enabled
        # Grounding uses Google Search to get real-time information about games, events, etc.
        # This helps avoid hallucinating details about new game content (POIs, skins, locations)
        # Enable by default for gemini-3-pro-image-preview, can be disabled via job params
        enable_grounding = job_params.get("enable_grounding", True)  # Default to True for better accuracy
        if enable_grounding:
            logger.info(f"[GROUNDING] Grounding enabled for job_id={job_id}")

        generation_request = GenerationRequest(
            prompt=generation_context["final_prompt"],
            width=width,
            height=height,
            input_image=generation_context["input_image"],
            input_mime_type=generation_context["input_mime_type"],
            conversation_history=generation_context["conversation_history"],
            media_assets=generation_context["media_assets"],
            enable_grounding=enable_grounding,
        )

        # Build provenance context for tracking
        provenance_ctx = GenerationContext(
            job_id=job_id,
            user_id=user_id,
            execution_id=f"gen_{job_id[:8]}",
            asset_type=asset_type,
            brand_kit_id=job.brand_kit_id,
            is_refinement=bool(job_params.get("is_refinement")),
        )

        # Generate with full provenance capture
        generation_response = await nano_banana_client.generate_with_provenance(
            request=generation_request,
            context=provenance_ctx,
        )

        logger.info(f"Image generated: job_id={job_id}, inference_time_ms={generation_response.inference_time_ms}")

        # Step 5: Composite logo if requested
        image_data = generation_response.image_data

        if job_params.get("include_logo") and job_params.get("brand_kit_id"):
            await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=50)
            await _store_sse_progress(job_id, 50, "Applying brand elements...")

            try:
                # Fetch logo bytes
                logo_bytes = await logo_service.get_logo_for_generation(
                    user_id=user_id,
                    brand_kit_id=job_params["brand_kit_id"],
                    preferred_type=job_params.get("logo_type", "primary")
                )

                if logo_bytes:
                    # Composite logo onto image
                    image_data = logo_compositor.composite(
                        base_image=image_data,
                        logo=logo_bytes,
                        position=job_params.get("logo_position", "bottom-right"),
                        size=job_params.get("logo_size", "medium"),
                        opacity=job_params.get("logo_opacity", 1.0)
                    )
                    logger.info(f"Logo composited: job_id={job_id}")
                else:
                    logger.warning(f"No logo found for compositing: job_id={job_id}")

            except Exception as e:
                # Log but don't fail the job if logo compositing fails
                logger.error(f"Logo compositing failed, continuing without logo: job_id={job_id}, error={e}")

        # NOTE: Media asset placement is now handled by Nano Banana directly.
        # The assets are downloaded and attached to the generation request,
        # and the prompt tells Nano Banana where to place them.
        # The old PIL-based compositor has been removed.

        # Step 6 & 7: Process and upload assets
        # For Twitch/TikTok emotes, create all 3 required sizes
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=70)
        await _store_sse_progress(job_id, 70, "Uploading to storage...")

        if is_twitch_emote(asset_type):
            # Process Twitch emote into all 3 sizes with background removal
            logger.info(f"Processing Twitch emote multi-size: job_id={job_id}")

            created_assets = await process_twitch_emote_sizes(
                image_data=image_data,
                user_id=user_id,
                job_id=job_id,
                generation_service=generation_service,
                storage_service=storage_service,
            )

            # Use the largest (112x112) as the primary asset for response
            primary_asset = created_assets[0]  # 112x112 is first
            asset_id = primary_asset["id"]

            logger.info(f"Created {len(created_assets)} Twitch emote sizes: job_id={job_id}")

            # Increment usage counter once for the emote (counts as 1 generation)
            # This is done separately for emotes since process_twitch_emote_sizes
            # creates multiple assets but should only count as one generation
            try:
                from backend.database.supabase_client import get_supabase_client
                db = get_supabase_client()
                db.rpc("increment_user_usage", {"p_user_id": user_id}).execute()
                logger.info(f"Incremented usage counter for Twitch emote: user_id={user_id}")
            except Exception as e:
                logger.warning(f"Failed to increment usage counter for Twitch emote: {e}")

            # Link all assets to coach session if applicable
            coach_session_id = job_params.get("coach_session_id")
            if coach_session_id:
                try:
                    from backend.database.supabase_client import get_supabase_client
                    db = get_supabase_client()

                    for asset_info in created_assets:
                        db.table("assets").update({"coach_session_id": coach_session_id}).eq("id", asset_info["id"]).execute()
                        db.rpc("array_append_unique", {
                            "table_name": "coach_sessions",
                            "column_name": "generated_asset_ids",
                            "row_id": coach_session_id,
                            "new_value": asset_info["id"]
                        }).execute()

                    logger.info(f"Linked Twitch emote assets to coach session: session_id={coach_session_id}")
                except Exception as e:
                    logger.warning(f"Failed to link assets to coach session: {e}")

        elif is_tiktok_emote(asset_type):
            # Process TikTok emote into all 3 sizes with background removal
            logger.info(f"Processing TikTok emote multi-size: job_id={job_id}")

            created_assets = await process_tiktok_emote_sizes(
                image_data=image_data,
                user_id=user_id,
                job_id=job_id,
                generation_service=generation_service,
                storage_service=storage_service,
            )

            # Use the largest (300x300) as the primary asset for response
            primary_asset = created_assets[0]  # 300x300 is first
            asset_id = primary_asset["id"]

            logger.info(f"Created {len(created_assets)} TikTok emote sizes: job_id={job_id}")

            # Increment usage counter once for the emote (counts as 1 generation)
            try:
                from backend.database.supabase_client import get_supabase_client
                db = get_supabase_client()
                db.rpc("increment_user_usage", {"p_user_id": user_id}).execute()
                logger.info(f"Incremented usage counter for TikTok emote: user_id={user_id}")
            except Exception as e:
                logger.warning(f"Failed to increment usage counter for TikTok emote: {e}")

            # Link all assets to coach session if applicable
            coach_session_id = job_params.get("coach_session_id")
            if coach_session_id:
                try:
                    from backend.database.supabase_client import get_supabase_client
                    db = get_supabase_client()

                    for asset_info in created_assets:
                        db.table("assets").update({"coach_session_id": coach_session_id}).eq("id", asset_info["id"]).execute()
                        db.rpc("array_append_unique", {
                            "table_name": "coach_sessions",
                            "column_name": "generated_asset_ids",
                            "row_id": coach_session_id,
                            "new_value": asset_info["id"]
                        }).execute()

                    logger.info(f"Linked TikTok emote assets to coach session: session_id={coach_session_id}")
                except Exception as e:
                    logger.warning(f"Failed to link assets to coach session: {e}")
        else:
            # Standard single-asset processing
            upload_result = await storage_service.upload_asset(
                user_id=user_id,
                job_id=job_id,
                image_data=image_data,
                content_type="image/png"
            )

            # Verify upload succeeded with expected size
            if upload_result.file_size != len(image_data):
                logger.error(f"Upload size mismatch: expected={len(image_data)}, got={upload_result.file_size}")
                raise GenerationError("Upload verification failed - size mismatch")

            logger.info(f"Image uploaded: job_id={job_id}, path={upload_result.path}")

            await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=85)
            await _store_sse_progress(job_id, 85, "Finalizing...")

            # Encode thought_signature as base64 for storage
            thought_sig_b64 = None
            if generation_response.thought_signature:
                import base64
                thought_sig_b64 = base64.b64encode(generation_response.thought_signature).decode()
                logger.info(f"Storing thought_signature for asset: job_id={job_id}")

            # Create asset and increment usage atomically to prevent double-increment race condition
            asset = await _create_asset_with_usage_increment(
                generation_service=generation_service,
                job_id=job_id,
                user_id=user_id,
                asset_type=asset_type,
                url=upload_result.url,
                storage_path=upload_result.path,
                width=width,
                height=height,
                file_size=upload_result.file_size,
                is_public=False,
                thought_signature=thought_sig_b64,
            )

            asset_id = asset.id

            # Link asset to coach session if this was generated from coach
            coach_session_id = job_params.get("coach_session_id")
            if coach_session_id:
                try:
                    from backend.database.supabase_client import get_supabase_client
                    db = get_supabase_client()

                    db.table("assets").update({"coach_session_id": coach_session_id}).eq("id", asset.id).execute()
                    db.rpc("array_append_unique", {
                        "table_name": "coach_sessions",
                        "column_name": "generated_asset_ids",
                        "row_id": coach_session_id,
                        "new_value": asset.id
                    }).execute()

                    logger.info(f"Linked asset to coach session: asset_id={asset.id}, session_id={coach_session_id}")

                    # Update session's gemini_history for multi-turn refinements
                    await _update_session_gemini_history(
                        session_id=coach_session_id,
                        user_id=user_id,
                        prompt=job.prompt,
                        image_data=image_data,
                        asset_id=asset.id,
                        thought_signature=generation_response.thought_signature,
                    )
                except Exception as e:
                    logger.warning(f"Failed to link asset to coach session: {e}")

        # Step 8: Store SSE completion FIRST, then update job status
        # This order prevents race condition where frontend sees completed status
        # but completion store doesn't have data yet

        # Store completion data BEFORE updating job status
        try:
            completion_store = get_completion_store()
            await completion_store.store_completion(
                stream_id=f"gen:{job_id}",
                event_type="completed",
                event_data={
                    "job_id": job_id,
                    "asset_id": asset_id,
                    "status": "completed",
                    "progress": 100,
                },
            )
            logger.info(f"SSE completion stored: job_id={job_id}, asset_id={asset_id}")
        except Exception as e:
            logger.warning(f"Failed to store SSE completion (non-fatal): {e}")

        # Now update job status to COMPLETED with optimistic locking
        # Only complete if job is still in PROCESSING state (prevents race conditions)
        completed = await _try_complete_job(job_id)

        if completed:
            logger.info(f"Generation job completed: job_id={job_id}, asset_id={asset_id}")
            return {"job_id": job_id, "status": "completed", "asset_id": asset_id}
        else:
            logger.warning(f"Job completion skipped (status changed): job_id={job_id}")
            return {"job_id": job_id, "status": "completed", "asset_id": asset_id, "warning": "status_already_changed"}

    except RateLimitError as e:
        error_message = f"Rate limit exceeded. Retry after {e.retry_after} seconds."
        logger.warning(f"Rate limit error: job_id={job_id}")
        await _fail_job(generation_service, job_id, error_message)
        return {"job_id": job_id, "status": "failed", "error": error_message}

    except ContentPolicyError as e:
        error_message = f"Content policy violation: {e.reason}"
        logger.warning(f"Content policy error: job_id={job_id}")
        await _fail_job(generation_service, job_id, error_message)
        return {"job_id": job_id, "status": "failed", "error": error_message}

    except GenerationTimeoutError as e:
        error_message = f"Generation timed out after {e.timeout_seconds} seconds."
        logger.error(f"Timeout error: job_id={job_id}")
        await _fail_job(generation_service, job_id, error_message)
        return {"job_id": job_id, "status": "failed", "error": error_message}

    except GenerationError as e:
        error_message = f"Generation failed: {e.message}"
        logger.error(f"Generation error: job_id={job_id}, error={e.message}")
        await _fail_job(generation_service, job_id, error_message)
        return {"job_id": job_id, "status": "failed", "error": error_message}

    except JobNotFoundError:
        logger.error(f"Job not found: job_id={job_id}")
        return {"job_id": job_id, "status": "failed", "error": "Job not found"}

    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        logger.exception(f"Unexpected error: job_id={job_id}")
        try:
            await _fail_job(generation_service, job_id, error_message)
        except Exception:
            pass
        return {"job_id": job_id, "status": "failed", "error": error_message}


async def _fail_job(generation_service, job_id: str, error_message: str) -> None:
    """Helper function to fail a job with an error message."""
    try:
        await generation_service.update_job_status(
            job_id=job_id,
            status=JobStatus.FAILED,
            progress=0,
            error_message=error_message
        )

        # Notify SSE completion store so frontend polling can detect failure
        try:
            completion_store = get_completion_store()
            await completion_store.store_completion(
                stream_id=f"gen:{job_id}",
                event_type="failed",
                event_data={
                    "job_id": job_id,
                    "status": "failed",
                    "error": error_message,
                    "progress": 0,
                },
            )
            logger.info(f"SSE failure stored: job_id={job_id}")
        except Exception as e:
            logger.warning(f"Failed to store SSE failure (non-fatal): {e}")

    except Exception as e:
        logger.error(f"Failed to update job status: job_id={job_id}, error={str(e)}")


async def _update_session_gemini_history(
    session_id: str,
    user_id: str,
    prompt: str,
    image_data: bytes,
    asset_id: str,
    thought_signature: Optional[bytes] = None,
) -> None:
    """
    Update the coach session's gemini_history for multi-turn refinements.
    
    This stores the conversation context so future refinements can use
    multi-turn without re-uploading the image.
    
    Args:
        session_id: Coach session UUID
        user_id: User ID for ownership verification
        prompt: The prompt used for generation
        image_data: The generated image bytes
        asset_id: The created asset ID
        thought_signature: Optional Gemini thought signature for multi-turn (required for refinements)
    """
    import base64

    try:
        from backend.services.coach import get_session_manager

        session_manager = get_session_manager()
        session = await session_manager.get(session_id)

        if session is None or session.user_id != user_id:
            logger.warning(f"Session not found for gemini history update: {session_id}")
            return

        # Add the user prompt turn
        session.gemini_history.append({
            "role": "user",
            "text": prompt,
        })

        # Add the model response turn (with image)
        # Store image as base64 for JSON serialization
        image_b64 = base64.b64encode(image_data).decode()
        model_turn = {
            "role": "model",
            "image_data": image_b64,
            "image_mime_type": "image/png",
        }

        # CRITICAL: Store thought_signature for multi-turn refinements
        # This is required by Gemini API when referencing model-generated images
        if thought_signature:
            model_turn["thought_signature"] = base64.b64encode(thought_signature).decode()
            logger.info(f"Stored thought_signature for session: {session_id}")

        session.gemini_history.append(model_turn)

        # Update last generated asset ID
        session.last_generated_asset_id = asset_id

        # Save the updated session
        await session_manager._save(session)

        logger.info(
            f"Updated session gemini history: session_id={session_id}, "
            f"history_turns={len(session.gemini_history)}, "
            f"has_thought_signature={thought_signature is not None}"
        )

    except Exception as e:
        logger.warning(f"Failed to update session gemini history: {e}")


def process_generation_job_sync(job_id: str, user_id: str) -> dict:
    """Synchronous wrapper for process_generation_job with execution reporting."""
    import time
    start_time = time.time()

    result = asyncio.run(process_generation_job(job_id, user_id))

    duration_ms = int((time.time() - start_time) * 1000)

    # Submit execution report
    report = create_report(WORKER_NAME)
    report.duration_ms = duration_ms

    status = result.get("status", "unknown")
    if status == "completed":
        report.outcome = ExecutionOutcome.SUCCESS
        report.data_verification.records_processed = 1
        report.data_verification.records_stored = 1
        report.custom_metrics = {
            "job_id": job_id,
            "asset_id": result.get("asset_id"),
        }
    elif status == "skipped":
        report.outcome = ExecutionOutcome.SKIPPED
        report.custom_metrics = {
            "job_id": job_id,
            "reason": result.get("reason", "unknown"),
        }
    else:
        report.outcome = ExecutionOutcome.FAILED
        report.error_message = result.get("error", "Unknown error")
        report.custom_metrics = {"job_id": job_id}

    submit_execution_report(report)

    return result


def enqueue_generation_job(job_id: str, user_id: str) -> str:
    """Add a generation job to the Redis queue."""
    queue = get_queue()

    rq_job = queue.enqueue(
        process_generation_job_sync,
        job_id,
        user_id,
        job_id=f"gen-{job_id}",
        job_timeout="5m",
        result_ttl=86400,
        failure_ttl=86400,
    )

    logger.info(f"Enqueued generation job: job_id={job_id}, rq_job_id={rq_job.id}")
    return rq_job.id


def run_worker():
    """Start the generation worker."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    logger.info("Starting generation worker...")
    logger.info(f"Redis URL: {REDIS_URL}")
    logger.info(f"Queue name: {QUEUE_NAME}")

    redis_conn = get_redis_connection()

    try:
        redis_conn.ping()
        logger.info("Successfully connected to Redis")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)

    queues = [Queue(QUEUE_NAME, connection=redis_conn)]
    worker = Worker(queues, connection=redis_conn)
    logger.info(f"Worker started. Listening for jobs on '{QUEUE_NAME}' queue...")
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    run_worker()
