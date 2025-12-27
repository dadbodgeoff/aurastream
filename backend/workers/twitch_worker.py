"""
Twitch Asset Generation Worker for Aurastream.

This worker processes Twitch asset generation jobs from a Redis queue using RQ.
It handles:
1. Single Twitch asset generation (emotes, badges, panels, etc.)
2. Pack generation (seasonal, emote, stream packs)

Usage:
    python -m backend.workers.twitch_worker
"""

import asyncio
import logging
import os
import sys
from typing import Optional

from redis import Redis
from rq import Worker, Queue

from backend.services.twitch import (
    ContextEngine,
    PromptConstructor,
    AssetPipeline,
    QCGate,
    PackGenerationService,
    get_context_engine,
    get_pack_service,
    get_dimension_spec,
    ASSET_TYPE_DIRECTIVES,
)
from backend.services.nano_banana_client import (
    get_nano_banana_client,
    GenerationRequest,
)
from backend.services.storage_service import get_storage_service
from backend.services.generation_service import (
    get_generation_service,
    JobStatus,
)
from backend.services.exceptions import (
    RateLimitError,
    ContentPolicyError,
    GenerationTimeoutError,
    GenerationError,
    JobNotFoundError,
)


logger = logging.getLogger(__name__)

QUEUE_NAME = "twitch_generation"
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


def get_redis_connection() -> Redis:
    """Create a Redis connection from the configured URL."""
    return Redis.from_url(REDIS_URL)


def get_queue() -> Queue:
    """Get the Twitch generation queue instance."""
    redis_conn = get_redis_connection()
    return Queue(QUEUE_NAME, connection=redis_conn)


async def process_twitch_generation_job(
    job_id: str,
    user_id: str,
    brand_kit_id: str,
    asset_type: str,
    custom_prompt: Optional[str] = None,
    game_id: Optional[str] = None,
    text_overlay: Optional[str] = None,
) -> dict:
    """
    Process a single Twitch asset generation job.
    
    Steps:
    1. Build generation context from brand kit
    2. Construct mega-prompt
    3. Generate image with Nano Banana
    4. Process through asset pipeline
    5. Validate through QC gate
    6. Upload to storage
    7. Create asset record
    """
    logger.info(f"Starting Twitch generation job: job_id={job_id}, asset_type={asset_type}")
    
    generation_service = get_generation_service()
    context_engine = get_context_engine()
    prompt_constructor = PromptConstructor()
    asset_pipeline = AssetPipeline()
    qc_gate = QCGate()
    nano_banana_client = get_nano_banana_client()
    storage_service = get_storage_service()
    
    try:
        # Step 1: Update status to PROCESSING
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.PROCESSING, progress=5
        )
        
        # Step 2: Build generation context
        context = await context_engine.build_context(
            user_id=user_id,
            brand_kit_id=brand_kit_id,
            asset_type=asset_type,
            game_id=game_id,
        )
        
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.PROCESSING, progress=15
        )
        
        # Step 3: Construct mega-prompt
        prompt = prompt_constructor.build_mega_prompt(context, custom_prompt)
        
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.PROCESSING, progress=25
        )
        
        # Step 4: Get dimensions and generate image
        spec = get_dimension_spec(asset_type)
        
        generation_request = GenerationRequest(
            prompt=prompt,
            width=spec.generation_size[0],
            height=spec.generation_size[1],
        )
        generation_response = await nano_banana_client.generate(generation_request)
        
        logger.info(f"Image generated: job_id={job_id}, inference_time_ms={generation_response.inference_time_ms}")
        
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.PROCESSING, progress=50
        )
        
        # Step 5: Process through asset pipeline
        processed_data = await asset_pipeline.process(
            image_data=generation_response.image_data,
            asset_type=asset_type,
            context=context,
            text_overlay=text_overlay,
        )
        
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.PROCESSING, progress=70
        )
        
        # Step 6: Validate through QC gate
        passed, error, final_data = await qc_gate.validate(
            image_data=processed_data,
            asset_type=asset_type,
            expected_dimensions=spec.export_size,
        )
        
        if not passed:
            raise GenerationError(f"QC validation failed: {error}")
        
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.PROCESSING, progress=80
        )
        
        # Step 7: Upload to storage
        upload_result = await storage_service.upload_asset(
            user_id=user_id,
            job_id=job_id,
            image_data=final_data,
            content_type="image/png",
        )
        
        logger.info(f"Image uploaded: job_id={job_id}, path={upload_result.path}")
        
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.PROCESSING, progress=90
        )
        
        # Step 8: Create asset record
        asset = await generation_service.create_asset(
            job_id=job_id,
            user_id=user_id,
            asset_type=asset_type,
            url=upload_result.url,
            storage_path=upload_result.path,
            width=spec.export_size[0],
            height=spec.export_size[1],
            file_size=upload_result.file_size,
            is_public=False,
        )
        
        # Step 9: Update job status to COMPLETED
        await generation_service.update_job_status(
            job_id=job_id, status=JobStatus.COMPLETED, progress=100
        )
        
        logger.info(f"Twitch generation job completed: job_id={job_id}, asset_id={asset.id}")
        
        return {"job_id": job_id, "status": "completed", "asset_id": asset.id}
        
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
        
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        logger.exception(f"Unexpected error: job_id={job_id}")
        try:
            await _fail_job(generation_service, job_id, error_message)
        except Exception:
            pass
        return {"job_id": job_id, "status": "failed", "error": error_message}


async def process_pack_generation_job(
    pack_id: str,
    user_id: str,
    brand_kit_id: str,
    pack_type: str,
    custom_prompt: Optional[str] = None,
    game_id: Optional[str] = None,
) -> dict:
    """
    Process a pack generation job.
    
    Generates multiple assets in a pack with consistent branding.
    """
    logger.info(f"Starting pack generation job: pack_id={pack_id}, pack_type={pack_type}")
    
    pack_service = get_pack_service()
    storage_service = get_storage_service()
    nano_banana_client = get_nano_banana_client()
    
    try:
        # Generate the pack
        pack = await pack_service.generate_pack(
            user_id=user_id,
            brand_kit_id=brand_kit_id,
            pack_type=pack_type,
            custom_prompt=custom_prompt,
            game_id=game_id,
            image_generator=nano_banana_client,
        )
        
        # Upload each asset to storage
        uploaded_assets = []
        for asset in pack.assets:
            upload_result = await storage_service.upload_asset(
                user_id=user_id,
                job_id=pack_id,
                image_data=asset.image_data,
                content_type="image/png",
                filename=asset.filename,
            )
            uploaded_assets.append({
                "id": asset.id,
                "asset_type": asset.asset_type,
                "url": upload_result.url,
                "width": asset.width,
                "height": asset.height,
                "file_size": asset.file_size,
            })
        
        logger.info(f"Pack generation completed: pack_id={pack_id}, assets={len(uploaded_assets)}")
        
        return {
            "pack_id": pack_id,
            "status": "completed",
            "pack_type": pack_type,
            "assets": uploaded_assets,
        }
        
    except Exception as e:
        error_message = f"Pack generation failed: {str(e)}"
        logger.exception(f"Pack generation error: pack_id={pack_id}")
        return {
            "pack_id": pack_id,
            "status": "failed",
            "error": error_message,
        }


async def _fail_job(generation_service, job_id: str, error_message: str) -> None:
    """Helper function to fail a job with an error message."""
    try:
        await generation_service.update_job_status(
            job_id=job_id,
            status=JobStatus.FAILED,
            progress=0,
            error_message=error_message,
        )
    except Exception as e:
        logger.error(f"Failed to update job status: job_id={job_id}, error={str(e)}")


def process_twitch_generation_job_sync(
    job_id: str,
    user_id: str,
    brand_kit_id: str,
    asset_type: str,
    custom_prompt: Optional[str] = None,
    game_id: Optional[str] = None,
    text_overlay: Optional[str] = None,
) -> dict:
    """Synchronous wrapper for process_twitch_generation_job."""
    return asyncio.run(
        process_twitch_generation_job(
            job_id, user_id, brand_kit_id, asset_type, custom_prompt, game_id, text_overlay
        )
    )


def process_pack_generation_job_sync(
    pack_id: str,
    user_id: str,
    brand_kit_id: str,
    pack_type: str,
    custom_prompt: Optional[str] = None,
    game_id: Optional[str] = None,
) -> dict:
    """Synchronous wrapper for process_pack_generation_job."""
    return asyncio.run(
        process_pack_generation_job(
            pack_id, user_id, brand_kit_id, pack_type, custom_prompt, game_id
        )
    )


def enqueue_twitch_generation_job(
    job_id: str,
    user_id: str,
    brand_kit_id: str,
    asset_type: str,
    custom_prompt: Optional[str] = None,
    game_id: Optional[str] = None,
    text_overlay: Optional[str] = None,
) -> str:
    """Add a Twitch generation job to the Redis queue."""
    queue = get_queue()
    
    rq_job = queue.enqueue(
        process_twitch_generation_job_sync,
        job_id,
        user_id,
        brand_kit_id,
        asset_type,
        custom_prompt,
        game_id,
        text_overlay,
        job_id=f"twitch-{job_id}",
        job_timeout="10m",
        result_ttl=86400,
        failure_ttl=86400,
    )
    
    logger.info(f"Enqueued Twitch generation job: job_id={job_id}, rq_job_id={rq_job.id}")
    return rq_job.id


def enqueue_pack_generation_job(
    pack_id: str,
    user_id: str,
    brand_kit_id: str,
    pack_type: str,
    custom_prompt: Optional[str] = None,
    game_id: Optional[str] = None,
) -> str:
    """Add a pack generation job to the Redis queue."""
    queue = get_queue()
    
    rq_job = queue.enqueue(
        process_pack_generation_job_sync,
        pack_id,
        user_id,
        brand_kit_id,
        pack_type,
        custom_prompt,
        game_id,
        job_id=f"pack-{pack_id}",
        job_timeout="30m",  # Packs take longer
        result_ttl=86400,
        failure_ttl=86400,
    )
    
    logger.info(f"Enqueued pack generation job: pack_id={pack_id}, rq_job_id={rq_job.id}")
    return rq_job.id


def run_worker():
    """Start the Twitch generation worker."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    
    logger.info("Starting Twitch generation worker...")
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
