# 🎼 AuraStream Head Orchestrator Design
## The Symphony of Workers

**Version:** 1.0.0  
**Created:** January 2, 2026  
**Purpose:** Enterprise-grade orchestration of all 14 AuraStream workers

---

## 📊 Worker Inventory & Classification

### Worker Categories

| Category | Workers | Execution Model | Priority |
|----------|---------|-----------------|----------|
| **Data Collection** | youtube_worker, twitch_streams_worker, clip_radar_worker | Scheduled polling | HIGH |
| **Intelligence** | creator_intel_worker, thumbnail_intel_worker | Scheduled analysis | HIGH |
| **Aggregation** | intel_aggregation_worker (hourly + daily) | Time-triggered | NORMAL |
| **Generation** | generation_worker, twitch_worker | On-demand (RQ queue) | CRITICAL |
| **Reporting** | playbook_worker | Scheduled synthesis | NORMAL |
| **Maintenance** | analytics_flush_worker, coach_cleanup_worker, clip_radar_recap_worker | Scheduled cleanup | LOW |

---

## 🎵 The 14 Workers - Complete Analysis

### 1. Generation Worker (`generation_worker.py`)
- **Type:** On-demand (RQ Queue)
- **Trigger:** API request → RQ job
- **Schedule:** N/A - event-driven
- **Timeout:** 5 minutes
- **Dependencies:** None (standalone)
- **Orchestrator Role:** Monitor queue depth, track success rates
- **Score Metrics:** Jobs completed, failure rate, avg duration, queue wait time

### 2. Twitch Worker (`twitch_worker.py`)
- **Type:** On-demand (RQ Queue)
- **Trigger:** API request → RQ job
- **Schedule:** N/A - event-driven
- **Timeout:** 10 minutes (packs: 30 min)
- **Dependencies:** None (standalone)
- **Orchestrator Role:** Monitor queue depth, track success rates
- **Score Metrics:** Jobs completed, failure rate, avg duration

### 3. YouTube Worker (`youtube_worker.py`)
- **Type:** Scheduled polling
- **Schedule:** Every 30 minutes (trending), Daily at 5am UTC (games)
- **Timeout:** 5 minutes
- **Dependencies:** None (data source)
- **Blocks:** playbook_worker, creator_intel_worker (need fresh data)
- **Orchestrator Role:** Trigger on schedule, track quota usage
- **Score Metrics:** Categories fetched, quota used, cache freshness

### 4. Twitch Streams Worker (`twitch_streams_worker.py`)
- **Type:** Scheduled polling
- **Schedule:** Every 15 minutes
- **Timeout:** 5 minutes
- **Dependencies:** None (data source)
- **Blocks:** playbook_worker (need fresh data)
- **Orchestrator Role:** Trigger on schedule, track API health
- **Score Metrics:** Games fetched, total streams, total viewers

### 5. Clip Radar Worker (`clip_radar_worker.py`)
- **Type:** Scheduled polling
- **Schedule:** Every 5 minutes
- **Timeout:** 4 minutes
- **Dependencies:** None (data source)
- **Blocks:** clip_radar_recap_worker
- **Orchestrator Role:** Trigger on schedule, track viral detection
- **Score Metrics:** Clips scanned, viral detected, poll duration

### 6. Creator Intel Worker (`creator_intel_worker.py`)
- **Type:** Scheduled analysis
- **Schedule:** Every 4 hours
- **Timeout:** 30 minutes
- **Dependencies:** youtube_worker (needs fresh YouTube data)
- **Blocks:** intel_aggregation_worker (sets in_progress flag)
- **Orchestrator Role:** Trigger after youtube_worker, coordinate with aggregation
- **Score Metrics:** Games processed, analyzers succeeded, duration

### 7. Thumbnail Intel Worker (`thumbnail_intel_worker.py`)
- **Type:** Scheduled analysis
- **Schedule:** Daily at 6am EST (11am UTC)
- **Timeout:** 30 minutes
- **Dependencies:** None (fetches own data)
- **Orchestrator Role:** Trigger on schedule, monitor memory usage
- **Score Metrics:** Categories analyzed, thumbnails processed, duration

### 8. Intel Aggregation Worker (`intel_aggregation_worker.py`)
- **Type:** Time-triggered
- **Schedule:** Hourly at :05, Daily at 00:15 UTC
- **Timeout:** 5 minutes (hourly), 10 minutes (daily)
- **Dependencies:** creator_intel_worker (checks in_progress flag)
- **Orchestrator Role:** Trigger on schedule, coordinate with intel generation
- **Score Metrics:** Categories aggregated, duration

### 9. Playbook Worker (`playbook_worker.py`)
- **Type:** Scheduled synthesis
- **Schedule:** Every 4 hours
- **Timeout:** 10 minutes
- **Dependencies:** youtube_worker, twitch_streams_worker (need fresh data)
- **Orchestrator Role:** Trigger after data workers, check data freshness
- **Score Metrics:** Report generated, data freshness, duration

### 10. Analytics Flush Worker (`analytics_flush_worker.py`)
- **Type:** Scheduled maintenance
- **Schedule:** Every hour
- **Timeout:** 10 minutes
- **Dependencies:** None
- **Orchestrator Role:** Trigger on schedule, track flush success
- **Score Metrics:** Events flushed, asset types updated, duration

### 11. Coach Cleanup Worker (`coach_cleanup_worker.py`)
- **Type:** Scheduled maintenance
- **Schedule:** Every hour
- **Timeout:** 5 minutes
- **Dependencies:** None
- **Orchestrator Role:** Trigger on schedule, track cleanup
- **Score Metrics:** Sessions cleaned, sessions skipped, duration

### 12. Clip Radar Recap Worker (`clip_radar_recap_worker.py`)
- **Type:** Scheduled maintenance
- **Schedule:** Daily at 6am UTC
- **Timeout:** 60 minutes
- **Dependencies:** clip_radar_worker (needs day's data)
- **Orchestrator Role:** Trigger on schedule, track compression
- **Score Metrics:** Clips compressed, viral clips, duration

### 13. Intel Orchestrator (`intel/orchestrator.py`)
- **Type:** Meta-orchestrator (existing)
- **Schedule:** Continuous with internal scheduling
- **Note:** This is a sub-orchestrator for intel tasks
- **Orchestrator Role:** Monitor health, delegate to head orchestrator

### 14. Graceful Shutdown (`graceful_shutdown.py`)
- **Type:** Utility module
- **Note:** Not a worker, but used by all workers
- **Orchestrator Role:** Coordinate shutdown across all workers

---

## 🎼 The Symphony Schedule

```
Hour  :00  :05  :10  :15  :20  :25  :30  :35  :40  :45  :50  :55
      ─────────────────────────────────────────────────────────────
      │    │    │    │    │    │    │    │    │    │    │    │
      │    │    │    │    │    │    │    │    │    │    │    │
  ┌───┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴───┐
  │                                                               │
  │  :00 - Analytics Flush, Coach Cleanup                         │
  │  :05 - Intel Aggregation (hourly)                             │
  │  :05 - Clip Radar Poll (every 5 min)                          │
  │  :15 - Twitch Streams (every 15 min)                          │
  │  :30 - YouTube Trending (every 30 min)                        │
  │                                                               │
  │  Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00):    │
  │    → YouTube Games Fetch                                      │
  │    → Creator Intel (after YouTube)                            │
  │    → Playbook Generation (after data workers)                 │
  │                                                               │
  │  Daily:                                                       │
  │    00:15 UTC - Intel Daily Rollup                             │
  │    05:00 UTC - YouTube Games Fetch                            │
  │    06:00 UTC - Clip Radar Recap                               │
  │    11:00 UTC - Thumbnail Intel (6am EST)                      │
  │                                                               │
  └───────────────────────────────────────────────────────────────┘
```

---

## 🔗 Dependency Graph

```
                    ┌─────────────────┐
                    │  HEAD           │
                    │  ORCHESTRATOR   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ DATA COLLECTION │ │   GENERATION    │ │   MAINTENANCE   │
│                 │ │   (On-Demand)   │ │                 │
│ • youtube       │ │                 │ │ • analytics     │
│ • twitch_streams│ │ • generation    │ │ • coach_cleanup │
│ • clip_radar    │ │ • twitch        │ │ • clip_recap    │
└────────┬────────┘ └─────────────────┘ └─────────────────┘
         │
         │ (data flows down)
         ▼
┌─────────────────┐
│  INTELLIGENCE   │
│                 │
│ • creator_intel │◄──── depends on youtube
│ • thumbnail     │
└────────┬────────┘
         │
         │ (intel flows down)
         ▼
┌─────────────────┐
│  AGGREGATION    │
│                 │
│ • hourly_agg    │◄──── waits for creator_intel
│ • daily_rollup  │
└────────┬────────┘
         │
         │ (aggregated data flows down)
         ▼
┌─────────────────┐
│   REPORTING     │
│                 │
│ • playbook      │◄──── depends on youtube + twitch_streams
└─────────────────┘
```

---

## 📊 Score Report Card Structure

Each worker reports a score (0-100) after execution:

```python
@dataclass
class WorkerScoreReport:
    worker_name: str
    execution_id: str
    started_at: datetime
    completed_at: datetime
    
    # Core metrics
    success: bool
    duration_ms: int
    
    # Scoring components (0-100 each)
    reliability_score: float    # Did it complete without errors?
    performance_score: float    # Was it fast enough?
    data_quality_score: float   # Was the output valid?
    resource_score: float       # Memory/CPU within limits?
    
    # Overall score (weighted average)
    overall_score: float
    
    # Anomalies detected
    anomalies: List[str]
    
    # Recommendations
    recommendations: List[str]
    
    # Raw metrics (worker-specific)
    metrics: Dict[str, Any]
```

### Scoring Weights by Worker Type

| Worker Type | Reliability | Performance | Data Quality | Resource |
|-------------|-------------|-------------|--------------|----------|
| Generation  | 40%         | 30%         | 20%          | 10%      |
| Collection  | 30%         | 20%         | 40%          | 10%      |
| Intelligence| 30%         | 20%         | 40%          | 10%      |
| Aggregation | 40%         | 30%         | 20%          | 10%      |
| Maintenance | 50%         | 20%         | 20%          | 10%      |

---

## 🚨 Anomaly Detection Rules

### Critical Anomalies (Immediate Alert)
1. **WORKER_CRASH** - Worker process died unexpectedly
2. **QUEUE_OVERFLOW** - RQ queue depth > 1000 jobs
3. **DATA_CORRUPTION** - Invalid data detected in output
4. **DEPENDENCY_FAILURE** - Required upstream worker failed
5. **RESOURCE_EXHAUSTION** - Memory > 90% or disk full

### High Anomalies (Alert within 5 min)
1. **HIGH_FAILURE_RATE** - >10% failures in last hour
2. **SLOW_EXECUTION** - Duration > 2x expected
3. **STALE_DATA** - Data older than threshold
4. **API_QUOTA_LOW** - YouTube/Twitch quota < 20%
5. **LOCK_CONTENTION** - Failed to acquire lock > 3 times

### Medium Anomalies (Alert within 15 min)
1. **ELEVATED_RETRIES** - >5% jobs retried
2. **PARTIAL_SUCCESS** - Some items failed in batch
3. **CACHE_MISS** - Expected cache data missing
4. **TIMEOUT_WARNING** - Duration > 80% of timeout

### Low Anomalies (Log only)
1. **SKIP_DUE_TO_LOCK** - Another instance running
2. **SKIP_DUE_TO_FRESHNESS** - Data already fresh
3. **MINOR_VALIDATION_ISSUE** - Non-critical validation warning

---

## 🔄 Recovery Strategies

### Per-Anomaly Recovery Actions

| Anomaly | Recovery Action |
|---------|-----------------|
| WORKER_CRASH | Restart worker, alert on-call |
| QUEUE_OVERFLOW | Scale workers, pause new jobs |
| HIGH_FAILURE_RATE | Enable circuit breaker, reduce rate |
| SLOW_EXECUTION | Increase timeout, check resources |
| STALE_DATA | Force refresh upstream worker |
| API_QUOTA_LOW | Reduce fetch frequency |
| LOCK_CONTENTION | Increase lock timeout |
| DEPENDENCY_FAILURE | Retry with backoff, skip if optional |

### Circuit Breaker States

```
CLOSED ──(failures > threshold)──► OPEN
   ▲                                  │
   │                                  │
   └──(successes > threshold)◄── HALF_OPEN
                                      │
                                      │
                              (timeout expires)
```

---

## 🏗️ Implementation Plan

### Phase 1: Core Orchestrator
1. Worker registry with configurations
2. Schedule management (cron + interval)
3. Execution with distributed locking
4. Basic health monitoring

### Phase 2: Score Reporting
1. Score report data structure
2. Worker score calculation
3. Report storage in Redis
4. Report aggregation (hourly/daily)

### Phase 3: Anomaly Detection
1. Anomaly detection rules engine
2. Alert generation
3. Alert routing (log, webhook, email)

### Phase 4: Self-Healing
1. Recovery strategy registry
2. Automatic recovery execution
3. Circuit breaker integration
4. Escalation policies

### Phase 5: Dashboard & API
1. Status API endpoints
2. Manual trigger endpoints
3. Configuration endpoints
4. Real-time WebSocket updates

---

## 📁 File Structure

```
backend/workers/orchestrator/
├── __init__.py           # Exports
├── orchestrator.py       # Main HeadOrchestrator class
├── scheduler.py          # Job scheduling (existing)
├── reporter.py           # Score reporting (existing)
├── types.py              # Type definitions (existing)
├── anomaly.py            # Anomaly detection (new)
├── health.py             # Health monitoring (new)
├── recovery.py           # Recovery strategies (new)
├── workers/              # Worker configurations
│   ├── __init__.py
│   ├── registry.py       # Worker registry
│   └── configs.py        # Worker configs
└── ORCHESTRATOR_DESIGN.md # This document
```
