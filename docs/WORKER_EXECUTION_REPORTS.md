# Worker Execution Reports & Learning System

## Overview

The execution report system provides comprehensive metrics for:
1. **Data Verification** - Validate that workers produced expected outputs
2. **Pattern Aggregation** - Track trends over time for optimization
3. **Anomaly Detection** - Identify unusual behavior patterns
4. **Learning Insights** - Understand agent habits for improvements

## Workers Using Execution Reports

All scheduled workers in the orchestrator now submit detailed execution reports:

| Worker | Type | Interval | Key Metrics |
|--------|------|----------|-------------|
| `analytics_flush_worker` | Analytics | Hourly | events_flushed, asset_types_updated |
| `coach_cleanup_worker` | Analytics | Hourly | sessions_cleaned, sessions_skipped |
| `clip_radar_recap_worker` | Intel | Daily | total_clips, viral_clips, recaps_created |
| `intel_aggregation_hourly` | Intel | Hourly | categories_aggregated |
| `intel_aggregation_daily` | Intel | Daily | categories_rolled_up |
| `sse_guardian` | SSE | 10 seconds | orphaned_streams, active_streams, healthy_streams |

## SSE Guardian Metrics

The SSE Stream Guardian monitors real-time streaming connections:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `active_streams` | Currently active SSE connections | Info only |
| `healthy_streams` | Streams with recent heartbeat | Info only |
| `stale_streams` | Streams without heartbeat >30s | Warning if >10 |
| `orphaned_streams` | Streams detected as orphaned | Warning if >5 |
| `cleaned_streams` | Expired streams cleaned up | Info only |
| `orphan_rate` | Ratio of orphans to active | Warning if >0.1 |
| `orphaned_by_type` | Breakdown by stream type | Debug info |

### Stream Types Tracked
- `generation` - Asset generation progress streams
- `coach_start` - Coach session start streams
- `coach_continue` - Coach chat continuation streams
- `profile_start` - Profile creator start streams
- `profile_continue` - Profile creator continuation streams

## Data Verification Metrics

Each worker reports these verification metrics after execution:

### Record Counts
| Metric | Description | Use Case |
|--------|-------------|----------|
| `records_fetched` | Total records retrieved from source | Verify API is responding |
| `records_processed` | Records successfully processed | Measure throughput |
| `records_stored` | Records written to storage | Verify persistence |
| `records_failed` | Records that failed processing | Identify data issues |
| `records_skipped` | Records intentionally skipped | Track filtering |

### Data Freshness
| Metric | Description | Use Case |
|--------|-------------|----------|
| `newest_record_age_seconds` | Age of most recent record | Detect stale sources |
| `oldest_record_age_seconds` | Age of oldest record | Understand data range |
| `avg_record_age_seconds` | Average record age | Monitor freshness |

### Data Completeness
| Metric | Description | Use Case |
|--------|-------------|----------|
| `expected_fields_present` | All required fields exist | Schema validation |
| `missing_fields` | List of missing field names | Debug data issues |
| `null_field_counts` | Count of nulls per field | Data quality check |

### Validation Results
| Metric | Description | Use Case |
|--------|-------------|----------|
| `validation_checks_passed` | Successful validations | Quality assurance |
| `validation_checks_failed` | Failed validations | Identify problems |
| `validation_errors` | Specific error messages | Debug failures |

### API Health
| Metric | Description | Use Case |
|--------|-------------|----------|
| `api_calls_made` | Total API requests | Track usage |
| `api_calls_succeeded` | Successful requests | Measure reliability |
| `api_calls_failed` | Failed requests | Detect outages |
| `api_rate_limited` | Hit rate limit? | Quota management |
| `api_quota_remaining` | Remaining quota | Prevent exhaustion |

### Cache Status
| Metric | Description | Use Case |
|--------|-------------|----------|
| `cache_hits` | Data served from cache | Measure efficiency |
| `cache_misses` | Cache misses | Identify cold starts |
| `cache_writes` | New cache entries | Track updates |
| `cache_ttl_seconds` | Cache expiration | Freshness config |

## Resource Metrics

Track resource usage for optimization:

| Metric | Description | Threshold |
|--------|-------------|-----------|
| `memory_peak_mb` | Peak memory usage | Alert if >500MB |
| `cpu_percent_avg` | Average CPU usage | Alert if >80% |
| `network_bytes_received` | Data downloaded | Track bandwidth |
| `database_query_count` | DB queries made | Optimize if >100 |
| `redis_operations` | Redis commands | Track cache load |

## Learning Metrics

Metrics for pattern analysis and optimization:

### Timing Patterns
- `time_of_day_utc` - Hour of execution (0-23)
- `day_of_week` - Day of execution (0=Monday)
- `execution_number_today` - Run count for the day
- `time_since_last_run_seconds` - Gap between runs

### Performance Patterns
- `duration_vs_avg` - Ratio vs historical average
- `duration_trend` - faster/slower/stable
- `data_volume_trend` - increasing/decreasing/stable

### Dependency Patterns
- `upstream_data_age_seconds` - Age of input data
- `downstream_consumers_waiting` - Blocked workers

## Scoring System

Each execution receives scores (0-100):

| Score | Weight | Calculation |
|-------|--------|-------------|
| `reliability_score` | 35% | Based on outcome (success/fail) |
| `performance_score` | 25% | Duration vs historical average |
| `data_quality_score` | 30% | Based on verification results |
| `resource_efficiency_score` | 10% | Memory/CPU usage |
| `overall_score` | 100% | Weighted combination |

### Quality Levels
- **Excellent** (90-100): All validations passed, data complete
- **Good** (70-89): Minor issues, data usable
- **Degraded** (50-69): Some data missing or stale
- **Poor** (30-49): Significant issues, data questionable
- **Failed** (0-29): Data validation failed

## API Endpoints

### Get Worker Executions
```
GET /api/v1/orchestrator/workers/{worker_name}/executions?limit=20
```
Returns detailed execution reports with all metrics.

### Get Worker Statistics
```
GET /api/v1/orchestrator/workers/{worker_name}/stats
```
Returns aggregated statistics:
- Total/successful/failed executions
- Average duration and records processed
- Score trends over time

### Get Worker Learning Insights
```
GET /api/v1/orchestrator/workers/{worker_name}/learning
```
Returns optimization insights:
- Optimal hour/day for execution
- Hourly performance breakdown
- Data volume trends
- Suggested optimizations

### Get System Learning Insights
```
GET /api/v1/orchestrator/learning/system
```
Returns system-wide insights:
- Total executions in 24h
- Average system score
- Busiest/quietest hours
- Workers needing attention
- Optimization opportunities

### Get Data Quality Summary
```
GET /api/v1/orchestrator/data-quality/summary
```
Returns quality overview:
- Overall quality level
- Per-worker quality scores
- Total records processed
- Validation failures
- Rate limit incidents

## Worker Implementation

### Basic Usage
```python
from backend.workers.execution_report import quick_report

# Simple report after execution
quick_report(
    worker_name="youtube_worker",
    success=True,
    duration_ms=5000,
    records_processed=150,
    records_fetched=150,
)
```

### Detailed Usage
```python
from backend.workers.execution_report import (
    create_report,
    submit_execution_report,
    ExecutionOutcome,
)

# Create report at start
report = create_report("youtube_worker")

# ... do work ...

# Fill in verification data
report.data_verification.records_fetched = 200
report.data_verification.records_processed = 195
report.data_verification.records_failed = 5
report.data_verification.api_calls_made = 4
report.data_verification.api_calls_succeeded = 4
report.data_verification.cache_writes = 4

# Fill in resource metrics
report.resource_metrics.memory_peak_mb = 128
report.resource_metrics.redis_operations = 12

# Add custom metrics
report.custom_metrics = {
    "categories_fetched": ["gaming", "music", "entertainment"],
    "quota_used_today": 192,
}

# Set outcome
report.outcome = ExecutionOutcome.SUCCESS
report.completed_at = datetime.now(timezone.utc)

# Submit
submit_execution_report(report)
```

## Aggregation & Learning

The system automatically:

1. **Aggregates Statistics**
   - Rolling averages for duration and scores
   - Success/failure rates
   - Records processed totals

2. **Tracks Patterns**
   - Performance by hour of day
   - Performance by day of week
   - Data volume trends

3. **Identifies Optimal Times**
   - Best hour for each worker
   - Best day for each worker

4. **Detects Anomalies**
   - Unusual duration spikes
   - Sudden quality drops
   - Resource usage anomalies

5. **Generates Recommendations**
   - Suggested schedule changes
   - Batch size optimizations
   - Resource allocation hints

## Dashboard Integration

The orchestrator dashboard displays:
- Real-time worker health with quality indicators
- Score trends over time
- Data quality heatmaps
- Learning insights and recommendations
- Anomaly alerts

## Best Practices

1. **Always report** - Even failed executions provide valuable data
2. **Be specific** - Fill in as many metrics as applicable
3. **Use custom metrics** - Add worker-specific data for deeper insights
4. **Check recommendations** - Review learning insights regularly
5. **Act on anomalies** - Investigate alerts promptly
