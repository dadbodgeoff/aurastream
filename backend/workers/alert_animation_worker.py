"""
Alert Animation Worker

Processes async jobs for:
1. Depth map generation (Depth Anything V2)
2. Server-side animation export (FFmpeg fallback)

Uses RQ (Redis Queue) for job management.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

from redis import Redis
from rq import Worker, Queue

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

WORKER_NAME = "alert_animation_worker"
QUEUE_NAME = "alert_animation"
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


def run_async(coro):
    """Run async function in sync context for RQ."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _store_sse_progress(job_id: str, progress: int, message: str = "") -> None:
    """Store SSE progress event for real-time frontend updates."""
    try:
        from backend.services.sse.completion_store import get_completion_store
        store = get_completion_store()
        await store.store_progress(job_id, progress, message)
    except Exception as e:
        logger.warning(f"Failed to store SSE progress: {e}")


async def _process_depth_map_job(
    job_id: str,
    project_id: str,
    user_id: str,
    source_url: str,
) -> dict:
    """
    Process depth map generation job.
    
    1. Generate depth map using Depth Anything V2
    2. Upload to storage
    3. Update project record
    4. Send SSE completion event
    """
    logger.info(f"Processing depth map job {job_id} for project {project_id}")
    
    try:
        from backend.services.alert_animation.depth_service import get_depth_service
        from backend.database.supabase_client import get_supabase_client
        
        # Update progress
        await _store_sse_progress(job_id, 10, "Downloading source image...")
        
        # Generate depth map
        depth_service = get_depth_service()
        await _store_sse_progress(job_id, 30, "Generating depth map...")
        
        result = await depth_service.generate_depth_map(
            source_url=source_url,
            user_id=user_id,
            project_id=project_id,
        )
        
        await _store_sse_progress(job_id, 80, "Uploading depth map...")
        
        # Update project record
        supabase = get_supabase_client()
        supabase.table("alert_animation_projects").update({
            "depth_map_url": result["depth_map_url"],
            "depth_map_storage_path": result["storage_path"],
            "depth_map_generated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", project_id).execute()
        
        await _store_sse_progress(job_id, 100, "Complete!")
        
        logger.info(f"Depth map job {job_id} completed successfully")
        
        return {
            "status": "completed",
            "depth_map_url": result["depth_map_url"],
        }
        
    except Exception as e:
        logger.error(f"Depth map job {job_id} failed: {e}")
        await _store_sse_progress(job_id, -1, f"Error: {str(e)}")
        raise


async def _process_export_job(
    job_id: str,
    project_id: str,
    user_id: str,
    source_url: str,
    depth_map_url: str,
    animation_config: dict,
    format: str,
    width: int,
    height: int,
    fps: int,
    duration_ms: int,
) -> dict:
    """
    Process server-side animation export job.
    
    Used as fallback for browsers that don't support WebM alpha.
    """
    logger.info(f"Processing export job {job_id} for project {project_id}")
    
    try:
        from backend.services.alert_animation.export_service import get_export_service
        from backend.database.supabase_client import get_supabase_client
        
        await _store_sse_progress(job_id, 10, "Preparing export...")
        
        export_service = get_export_service()
        
        await _store_sse_progress(job_id, 30, "Generating frames...")
        
        result = await export_service.export_animation(
            project_id=project_id,
            user_id=user_id,
            source_url=source_url,
            depth_map_url=depth_map_url,
            animation_config=animation_config,
            format=format,
            width=width,
            height=height,
            fps=fps,
            duration_ms=duration_ms,
        )
        
        await _store_sse_progress(job_id, 90, "Saving export...")
        
        # Insert export record
        supabase = get_supabase_client()
        supabase.table("alert_animation_exports").insert({
            "project_id": project_id,
            "user_id": user_id,
            "format": format,
            "url": result["url"],
            "storage_path": result["storage_path"],
            "file_size": result["file_size"],
            "width": width,
            "height": height,
            "fps": fps,
            "duration_ms": duration_ms,
            "animation_config_snapshot": animation_config,
        }).execute()
        
        await _store_sse_progress(job_id, 100, "Complete!")
        
        logger.info(f"Export job {job_id} completed successfully")
        
        return {
            "status": "completed",
            "url": result["url"],
            "file_size": result["file_size"],
        }
        
    except Exception as e:
        logger.error(f"Export job {job_id} failed: {e}")
        await _store_sse_progress(job_id, -1, f"Error: {str(e)}")
        raise


# RQ job wrappers (sync)
def depth_map_job(job_id: str, project_id: str, user_id: str, source_url: str):
    """RQ-compatible sync wrapper for depth map generation."""
    return run_async(_process_depth_map_job(job_id, project_id, user_id, source_url))


def export_job(
    job_id: str,
    project_id: str,
    user_id: str,
    source_url: str,
    depth_map_url: str,
    animation_config: dict,
    format: str,
    width: int,
    height: int,
    fps: int,
    duration_ms: int,
):
    """RQ-compatible sync wrapper for animation export."""
    return run_async(_process_export_job(
        job_id, project_id, user_id, source_url, depth_map_url,
        animation_config, format, width, height, fps, duration_ms
    ))


if __name__ == "__main__":
    redis_conn = Redis.from_url(REDIS_URL)
    queue = Queue(QUEUE_NAME, connection=redis_conn)
    
    worker = Worker([queue], connection=redis_conn, name=WORKER_NAME)
    logger.info(f"Starting {WORKER_NAME} listening on queue '{QUEUE_NAME}'")
    worker.work()
