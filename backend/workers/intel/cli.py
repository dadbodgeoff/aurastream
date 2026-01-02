"""
Creator Intel V2 - CLI Entry Point

Command-line interface for running the Intel worker system.
Provides commands for starting the orchestrator, running individual tasks,
and checking system health.

Uses Supabase client for database operations (not asyncpg).
"""

import argparse
import asyncio
import logging
import os
import sys
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def get_redis_client():
    """Get Redis client."""
    import redis.asyncio as redis
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    return redis.from_url(redis_url, decode_responses=True)


def get_supabase_db():
    """Get Supabase client for database operations."""
    from backend.database.supabase_client import get_supabase_client
    return get_supabase_client()


async def cmd_start(args: argparse.Namespace) -> int:
    """Start the orchestrator."""
    from backend.workers.intel.orchestrator import IntelOrchestrator
    
    logger.info("Starting Intel Orchestrator...")
    
    redis_client = await get_redis_client()
    db = get_supabase_db()
    
    orchestrator = IntelOrchestrator(
        redis_client=redis_client,
        db=db,
    )
    
    try:
        await orchestrator.start()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    finally:
        await redis_client.aclose()
    
    return 0


async def cmd_run_task(args: argparse.Namespace) -> int:
    """Run a specific task."""
    from backend.workers.intel.orchestrator import IntelOrchestrator
    
    task_name = args.task
    logger.info(f"Running task: {task_name}")
    
    redis_client = await get_redis_client()
    db = get_supabase_db()
    
    orchestrator = IntelOrchestrator(
        redis_client=redis_client,
        db=db,
    )
    orchestrator.register_tasks()
    
    task = orchestrator.tasks.get(task_name)
    if not task:
        logger.error(f"Unknown task: {task_name}")
        logger.info(f"Available tasks: {', '.join(orchestrator.tasks.keys())}")
        return 1
    
    try:
        await orchestrator._execute_task(task)
        logger.info(f"Task {task_name} completed")
    except Exception as e:
        logger.error(f"Task {task_name} failed: {e}")
        return 1
    finally:
        await redis_client.aclose()
    
    return 0


async def cmd_analyze(args: argparse.Namespace) -> int:
    """Run analyzers for a category."""
    from backend.services.intel.analyzers.runner import AnalyzerRunner
    
    category = args.category
    analyzers = args.analyzers.split(",") if args.analyzers else None
    force = args.force
    
    logger.info(f"Running analysis for {category}")
    
    runner = AnalyzerRunner()
    result = await runner.run_category(category, analyzers, force)
    
    logger.info(f"Analysis complete:")
    logger.info(f"  Succeeded: {result.analyzers_succeeded}")
    logger.info(f"  Failed: {result.analyzers_failed}")
    logger.info(f"  Duration: {result.duration_seconds:.2f}s")
    
    if result.errors:
        logger.warning(f"  Errors: {result.errors}")
    
    return 0 if not result.analyzers_failed else 1


async def cmd_health(args: argparse.Namespace) -> int:
    """Check system health."""
    from backend.workers.intel.health import HealthChecker, HealthStatus
    
    redis_client = await get_redis_client()
    db = get_supabase_db()
    
    checker = HealthChecker(redis_client, db)
    
    if args.simple:
        status = await checker.get_simple_status()
        print(f"Status: {status['status']}")
        await redis_client.aclose()
        return 0 if status['status'] == 'ok' else 1
    
    health = await checker.check_all()
    
    print(f"\nSystem Health: {health.status.value.upper()}")
    print(f"Timestamp: {health.timestamp.isoformat()}")
    print("\nComponents:")
    
    for component in health.components:
        status_icon = {
            HealthStatus.HEALTHY: "✓",
            HealthStatus.DEGRADED: "⚠",
            HealthStatus.UNHEALTHY: "✗",
            HealthStatus.UNKNOWN: "?",
        }.get(component.status, "?")
        
        print(f"  {status_icon} {component.name}: {component.status.value}")
        if component.message:
            print(f"    {component.message}")
    
    await redis_client.aclose()
    
    return 0 if health.status == HealthStatus.HEALTHY else 1


async def cmd_status(args: argparse.Namespace) -> int:
    """Show orchestrator status."""
    import json
    
    redis_client = await get_redis_client()
    
    # Get orchestrator metrics
    metrics_data = await redis_client.get("orchestrator:metrics")
    if not metrics_data:
        print("Orchestrator not running or no metrics available")
        await redis_client.aclose()
        return 1
    
    metrics = json.loads(metrics_data)
    
    print("\nOrchestrator Status")
    print("=" * 40)
    print(f"Tasks Executed: {metrics.get('tasks_executed', 0)}")
    print(f"Tasks Succeeded: {metrics.get('tasks_succeeded', 0)}")
    print(f"Tasks Failed: {metrics.get('tasks_failed', 0)}")
    print(f"Success Rate: {metrics.get('success_rate', 0):.1%}")
    print(f"Avg Duration: {metrics.get('avg_duration', 0):.2f}s")
    print(f"Uptime: {metrics.get('uptime_seconds', 0) / 3600:.1f} hours")
    
    # Get task states
    print("\nTask Status")
    print("-" * 40)
    
    task_keys = await redis_client.keys("orchestrator:task:*")
    for key in sorted(task_keys):
        state_data = await redis_client.get(key)
        if state_data:
            state = json.loads(state_data)
            task_name = key.split(":")[-1]
            
            last_success = state.get("last_success", "never")
            failures = state.get("consecutive_failures", 0)
            
            status = "✓" if failures == 0 else f"✗ ({failures} failures)"
            print(f"  {task_name}: {status}")
            print(f"    Last success: {last_success}")
    
    await redis_client.aclose()
    return 0


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Creator Intel V2 Worker CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start the orchestrator")
    
    # Run task command
    run_parser = subparsers.add_parser("run", help="Run a specific task")
    run_parser.add_argument("task", help="Task name to run")
    
    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Run analyzers for a category")
    analyze_parser.add_argument("category", help="Category to analyze (e.g., fortnite)")
    analyze_parser.add_argument(
        "--analyzers",
        help="Comma-separated list of analyzers to run (default: all)",
    )
    analyze_parser.add_argument(
        "--force",
        action="store_true",
        help="Force refresh, bypass cache",
    )
    
    # Health command
    health_parser = subparsers.add_parser("health", help="Check system health")
    health_parser.add_argument(
        "--simple",
        action="store_true",
        help="Simple health check (just ok/error)",
    )
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Show orchestrator status")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Map commands to handlers
    handlers = {
        "start": cmd_start,
        "run": cmd_run_task,
        "analyze": cmd_analyze,
        "health": cmd_health,
        "status": cmd_status,
    }
    
    handler = handlers.get(args.command)
    if not handler:
        parser.print_help()
        return 1
    
    return asyncio.run(handler(args))


if __name__ == "__main__":
    sys.exit(main())
