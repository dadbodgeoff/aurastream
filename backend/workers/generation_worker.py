"""
Generation Worker for Aurastream.

This worker processes generation jobs from a Redis queue using RQ (Redis Queue).
It handles the complete lifecycle of asset generation:
1. Receives job from queue
2. Updates job status to PROCESSING
3. Calls Nano Banana (Gemini) API to generate image
4. Optionally composites brand logo onto generated image
5. Uploads generated image to Supabase Storage
6. Creates asset record in database
7. Updates job status to COMPLETED (or FAILED on error)

Usage:
    python -m backend.workers.generation_worker
"""

import asyncio
import logging
import os
import sys
from typing import Optional

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
        asset_type = job.asset_type
        dimensions = ASSET_DIMENSIONS.get(asset_type, (1280, 720))
        width, height = dimensions
        
        # Step 4: Call Nano Banana API
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=30)
        
        generation_request = GenerationRequest(prompt=job.prompt, width=width, height=height)
        generation_response = await nano_banana_client.generate(generation_request)
        
        logger.info(f"Image generated: job_id={job_id}, inference_time_ms={generation_response.inference_time_ms}")
        
        # Step 5: Composite logo if requested
        image_data = generation_response.image_data
        job_params = job.parameters or {}
        
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
        
        # Step 6: Upload to storage
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.PROCESSING, progress=70)
        
        upload_result = await storage_service.upload_asset(
            user_id=user_id,
            job_id=job_id,
            image_data=image_data,
            content_type="image/png"
        )
        
        logger.info(f"Image uploaded: job_id={job_id}, path={upload_result.path}")
        
        # Step 7: Create asset record
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
        
        # Increment user's asset counter
        try:
            from backend.database.supabase_client import get_supabase_client
            db = get_supabase_client()
            db.rpc("increment_user_usage", {"p_user_id": user_id}).execute()
            logger.info(f"Incremented usage counter: user_id={user_id}")
        except Exception as e:
            # Don't fail the job if counter increment fails
            logger.warning(f"Failed to increment usage counter: {e}")
        
        # Link asset to coach session if this was generated from coach
        coach_session_id = job_params.get("coach_session_id")
        if coach_session_id:
            try:
                from backend.database.supabase_client import get_supabase_client
                db = get_supabase_client()
                
                # Update asset with coach_session_id
                db.table("assets").update({"coach_session_id": coach_session_id}).eq("id", asset.id).execute()
                
                # Add asset ID to session's generated_asset_ids array
                db.rpc("array_append_unique", {
                    "table_name": "coach_sessions",
                    "column_name": "generated_asset_ids",
                    "row_id": coach_session_id,
                    "new_value": asset.id
                }).execute()
                
                logger.info(f"Linked asset to coach session: asset_id={asset.id}, session_id={coach_session_id}")
            except Exception as e:
                # Don't fail the job if linking fails
                logger.warning(f"Failed to link asset to coach session: {e}")
        
        # Step 8: Update job status to COMPLETED
        await generation_service.update_job_status(job_id=job_id, status=JobStatus.COMPLETED, progress=100)
        
        logger.info(f"Generation job completed: job_id={job_id}, asset_id={asset.id}")
        
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
    
    logger.info(f"Starting generation worker...")
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
