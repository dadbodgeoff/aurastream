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

Usage:
    python -m backend.workers.generation_worker
"""

import asyncio
import logging
import os
import sys
from io import BytesIO
from typing import List

from PIL import Image
from redis import Redis
from rq import Worker, Queue

from backend.services.generation_service import (
    get_generation_service,
    JobStatus,
    ASSET_DIMENSIONS,
)
from backend.services.nano_banana_client import (
    get_nano_banana_client,
    GenerationRequest,
)
from backend.services.storage_service import get_storage_service
from backend.services.logo_service import get_logo_service
from backend.services.logo_compositor import get_logo_compositor
from backend.services.exceptions import (
    RateLimitError,
    ContentPolicyError,
    GenerationTimeoutError,
    GenerationError,
    JobNotFoundError,
)

# Configure logging at module level for RQ job processes
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

QUEUE_NAME = "generation"
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# Twitch emote sizes required for upload (largest to smallest)
TWITCH_EMOTE_SIZES = [112, 56, 28]


def is_twitch_emote(asset_type: str) -> bool:
    """Check if asset type is a Twitch emote that needs multi-size processing."""
    return asset_type in {"twitch_emote", "twitch_emote_112"}


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
    1. Remove background using rembg
    2. Resize to each Twitch size using Lanczos
    3. Upload each size to storage
    4. Create asset records for each size
    
    Args:
        image_data: Raw image bytes from AI generation
        user_id: User ID for storage path
        job_id: Job ID for storage path and asset linking
        generation_service: Service for creating asset records
        storage_service: Service for uploading to storage
        
    Returns:
        List of created asset dicts with id, url, width, height
    """
    import rembg
    
    # Step 1: Remove background
    logger.info(f"Removing background for emote: job_id={job_id}")
    transparent_bytes = rembg.remove(image_data)
    
    # Load as PIL Image for resizing
    img = Image.open(BytesIO(transparent_bytes)).convert("RGBA")
    
    created_assets = []
    
    # Step 2-4: Process each size
    for size in TWITCH_EMOTE_SIZES:
        logger.info(f"Processing emote size {size}x{size}: job_id={job_id}")
        
        # Resize using Lanczos for best quality
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Export as PNG with transparency
        buffer = BytesIO()
        resized.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)
        png_bytes = buffer.read()
        
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


def get_redis_connection() -> Redis:
    """Create a Redis connection from the configured URL."""
    return Redis.from_url(REDIS_URL)


def get_queue() -> Queue:
    """Get the generation queue instance."""
    redis_conn = get_redis_connection()
    return Queue(QUEUE_NAME, connection=redis_conn)


async def process_generation_job(job_id: str, user_id: str) -> dict:
    """
    Process a single generation job.
    
    Steps:
    1. Get job details from database
    2. Update status to PROCESSING
    3. Get asset dimensions for asset type
    4. Call Nano Banana API with prompt
    5. Optionally composite logo onto generated image
    6. Upload generated image to storage
    7. Create asset record
    8. Update job status to COMPLETED
    """
    logger.info(f"Starting generation job: job_id={job_id}, user_id={user_id}")
    
    generation_service = get_generation_service()
    nano_banana_client = get_nano_banana_client()
    storage_service = get_storage_service()
    logo_service = get_logo_service()
    logo_compositor = get_logo_compositor()
    
    try:
        # Step 1: Get job details
        job = await generation_service.get_job(user_id, job_id)
        
        # Step 2: Update status to PROCESSING
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=10)
        
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
        
        # Step 4: Call Nano Banana API
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=30)
        
        # Check for recreation mode - download reference thumbnail as input image
        input_image = None
        if job_params.get("recreation_mode") and job_params.get("reference_thumbnail_url"):
            logger.info(f"Recreation mode: downloading reference thumbnail for job_id={job_id}")
            try:
                import httpx
                async with httpx.AsyncClient(timeout=30.0) as client:
                    ref_url = job_params["reference_thumbnail_url"]
                    response = await client.get(ref_url)
                    if response.status_code == 200:
                        input_image = response.content
                        logger.info(f"Downloaded reference thumbnail: {len(input_image)} bytes")
                    else:
                        logger.warning(f"Failed to download reference thumbnail: {response.status_code}")
            except Exception as e:
                logger.warning(f"Error downloading reference thumbnail: {e}")
        
        generation_request = GenerationRequest(
            prompt=job.prompt, 
            width=width, 
            height=height,
            input_image=input_image,
            input_mime_type="image/jpeg" if input_image else "image/png"
        )
        generation_response = await nano_banana_client.generate(generation_request)
        
        logger.info(f"Image generated: job_id={job_id}, inference_time_ms={generation_response.inference_time_ms}")
        
        # Step 5: Composite logo if requested
        image_data = generation_response.image_data
        
        if job_params.get("include_logo") and job_params.get("brand_kit_id"):
            await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=50)
            
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
        
        # Step 6 & 7: Process and upload assets
        # For Twitch emotes, create all 3 required sizes (112, 56, 28)
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=70)
        
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
            
            logger.info(f"Created {len(created_assets)} emote sizes: job_id={job_id}")
            
            # Increment usage counter once for the emote (counts as 1 generation)
            try:
                from backend.database.supabase_client import get_supabase_client
                db = get_supabase_client()
                db.rpc("increment_user_usage", {"p_user_id": user_id}).execute()
                logger.info(f"Incremented usage counter: user_id={user_id}")
            except Exception as e:
                logger.warning(f"Failed to increment usage counter: {e}")
            
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
                    
                    logger.info(f"Linked emote assets to coach session: session_id={coach_session_id}")
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
            
            logger.info(f"Image uploaded: job_id={job_id}, path={upload_result.path}")
            
            await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=85)
            
            asset = await generation_service.create_asset(
                job_id=job_id,
                user_id=user_id,
                asset_type=asset_type,
                url=upload_result.url,
                storage_path=upload_result.path,
                width=width,
                height=height,
                file_size=upload_result.file_size,
                is_public=False
            )
            
            asset_id = asset.id
            
            # Increment user's asset counter
            try:
                from backend.database.supabase_client import get_supabase_client
                db = get_supabase_client()
                db.rpc("increment_user_usage", {"p_user_id": user_id}).execute()
                logger.info(f"Incremented usage counter: user_id={user_id}")
            except Exception as e:
                logger.warning(f"Failed to increment usage counter: {e}")
            
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
                except Exception as e:
                    logger.warning(f"Failed to link asset to coach session: {e}")
        
        # Step 8: Update job status to COMPLETED
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.COMPLETED, progress=100)
        
        logger.info(f"Generation job completed: job_id={job_id}, asset_id={asset_id}")
        
        return {"job_id": job_id, "status": "completed", "asset_id": asset_id}
        
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
    except Exception as e:
        logger.error(f"Failed to update job status: job_id={job_id}, error={str(e)}")


def process_generation_job_sync(job_id: str, user_id: str) -> dict:
    """Synchronous wrapper for process_generation_job."""
    return asyncio.run(process_generation_job(job_id, user_id))


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
