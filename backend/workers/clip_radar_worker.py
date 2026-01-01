"""
Clip Radar Background Worker

Polls Twitch clips every 5 minutes to detect viral content.
Run with: python -m backend.workers.clip_radar_worker
"""

import asyncio
import logging
import signal
import sys
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("clip_radar_worker")

# Polling interval in seconds (5 minutes)
POLL_INTERVAL = 5 * 60

# Flag for graceful shutdown
shutdown_requested = False


def handle_shutdown(signum, frame):
    """Handle shutdown signals."""
    global shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True


async def run_poll():
    """Run a single poll cycle."""
    from backend.services.clip_radar import get_clip_radar_service
    
    service = get_clip_radar_service()
    
    try:
        logger.info("Starting clip radar poll...")
        start_time = datetime.utcnow()
        
        results = await service.poll_clips()
        
        # Log summary
        total_clips = sum(r.total_clips for r in results.values())
        total_viral = sum(len(r.viral_clips) for r in results.values())
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(
            f"Poll complete in {duration:.1f}s: "
            f"{total_clips} clips scanned, {total_viral} viral detected"
        )
        
        # Log viral clips
        for gid, stats in results.items():
            if stats.viral_clips:
                for clip in stats.viral_clips[:3]:  # Top 3 per category
                    logger.info(
                        f"  🔥 [{stats.game_name}] {clip.broadcaster_name}: "
                        f"{clip.title[:40]} ({clip.view_count} views, {clip.velocity:.1f}/min)"
                    )
        
        return True
        
    except Exception as e:
        logger.error(f"Poll failed: {e}", exc_info=True)
        return False


async def main():
    """Main worker loop."""
    global shutdown_requested
    
    # Register signal handlers
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    logger.info("=" * 60)
    logger.info("Clip Radar Worker Starting")
    logger.info(f"Poll interval: {POLL_INTERVAL} seconds")
    logger.info("=" * 60)
    
    # Initial poll
    await run_poll()
    
    # Main loop
    while not shutdown_requested:
        try:
            # Wait for next poll interval
            logger.info(f"Next poll in {POLL_INTERVAL // 60} minutes...")
            
            # Sleep in small increments to allow for graceful shutdown
            for _ in range(POLL_INTERVAL):
                if shutdown_requested:
                    break
                await asyncio.sleep(1)
            
            if not shutdown_requested:
                await run_poll()
                
        except Exception as e:
            logger.error(f"Error in main loop: {e}", exc_info=True)
            # Wait a bit before retrying
            await asyncio.sleep(30)
    
    logger.info("Clip Radar Worker shutting down...")


if __name__ == "__main__":
    asyncio.run(main())
