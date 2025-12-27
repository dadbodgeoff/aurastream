# Redis Analytics to Time-Series Database Migration Path

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND TRACKER                            │
│  tsx/packages/shared/src/analytics/tracker.ts                   │
│  - Batches events (max 50)                                      │
│  - Sends to POST /api/v1/analytics                              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REDIS (Real-time)                           │
│  - Stores events in sorted set by timestamp                     │
│  - Maintains counters for events/categories                     │
│  - Tracks active sessions                                       │
│  - 100k event cap (auto-trimmed)                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    (Hourly flush via worker)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL (Long-term)                        │
│  analytics_events: Aggregated hourly event counts               │
│  analytics_asset_popularity: Daily asset type metrics           │
│  - Enables SQL reporting on "Most Popular Asset Types"          │
│  - get_popular_asset_types() RPC function                       │
└─────────────────────────────────────────────────────────────────┘
```

### Current Implementation Details
- **Backend Service:** `backend/services/analytics_service.py`
- **Flush Worker:** `backend/workers/analytics_flush_worker.py`
- **Database Migration:** `backend/database/migrations/009_analytics_events.sql`
- **Frontend Tracker:** `tsx/packages/shared/src/analytics/tracker.ts`

### Current Limitations
- Redis sorted sets not optimized for time-series queries
- Manual aggregation in flush worker
- Limited query capabilities (no native time bucketing)
- 100k event cap requires manual trimming
- No built-in downsampling
- Hourly flush creates data lag for real-time dashboards
- Complex time-range queries require multiple Redis calls

## Alternative Solutions

### Option 1: AWS Timestream

**Architecture:**
```
Frontend → API → AWS Timestream (memory tier)
                      ↓ (automatic)
              AWS Timestream (magnetic tier)
```

**Pros:**
- Serverless, auto-scaling
- Built-in time-series functions
- Automatic data tiering (memory → magnetic)
- SQL-like query language
- Native AWS integration (CloudWatch, Grafana)
- No infrastructure management

**Cons:**
- AWS lock-in
- Cost can grow with data volume
- Learning curve for InfluxQL-like syntax
- Cold start latency for infrequent queries

**Cost Estimate:**
- ~$0.50/GB ingested
- ~$0.01/GB scanned
- ~$0.03/million writes
- Estimated monthly: $50-200 for moderate usage

**Best For:** AWS-native deployments, variable workloads

### Option 2: TimescaleDB (PostgreSQL Extension)

**Architecture:**
```
Frontend → API → TimescaleDB (hypertable)
                      ↓ (continuous aggregates)
              Materialized views for dashboards
```

**Pros:**
- Full SQL compatibility (familiar to team)
- Can run on existing PostgreSQL/Supabase
- Automatic partitioning (hypertables)
- Compression (90%+ reduction)
- Continuous aggregates (real-time materialized views)
- Open source with commercial support

**Cons:**
- Requires PostgreSQL hosting changes or Supabase extension
- More operational overhead than serverless
- May need dedicated instance for high volume

**Cost Estimate:**
- Self-hosted: Infrastructure costs only
- Timescale Cloud: ~$100/mo starter, ~$500/mo production
- Supabase with extension: Included in plan

**Best For:** Teams familiar with PostgreSQL, moderate scale

### Option 3: InfluxDB

**Architecture:**
```
Frontend → API → InfluxDB (real-time)
                      ↓ (retention policies)
              Downsampled long-term storage
```

**Pros:**
- Purpose-built for time-series
- Excellent write performance (100k+ writes/sec)
- Flux query language is powerful
- Good visualization tools (built-in dashboards)
- Strong community and ecosystem

**Cons:**
- Another database to manage
- Different query paradigm (Flux vs SQL)
- OSS vs Cloud feature differences
- Learning curve for Flux

**Cost Estimate:**
- InfluxDB Cloud: ~$0.002/MB written, ~$0.002/query
- Self-hosted: Infrastructure costs only
- Estimated monthly: $100-300 for moderate usage

**Best For:** High-volume metrics, real-time monitoring

### Option 4: Redis TimeSeries Module

**Architecture:**
```
Frontend → API → Redis TimeSeries (real-time)
                      ↓ (compaction rules)
              Downsampled data in Redis
                      ↓ (optional)
              PostgreSQL for long-term
```

**Pros:**
- Minimal architecture change
- Native Redis integration
- Good for real-time + short-term
- Automatic downsampling (compaction rules)
- Sub-millisecond queries

**Cons:**
- Requires Redis Stack or module installation
- Not as feature-rich as dedicated TSDB
- Still need long-term storage solution
- Memory-bound (expensive for large datasets)

**Cost Estimate:**
- Redis Cloud with TimeSeries: ~$50-200/mo
- Self-hosted: Infrastructure + memory costs

**Best For:** Real-time dashboards, short retention periods

## Recommendation Matrix

| Criteria | Timestream | TimescaleDB | InfluxDB | Redis TS |
|----------|------------|-------------|----------|----------|
| Setup Complexity | Low | Medium | Medium | Low |
| SQL Compatibility | Partial | Full | None | None |
| Real-time Performance | Good | Good | Excellent | Excellent |
| Long-term Storage | Excellent | Excellent | Good | Poor |
| Cost at Scale | High | Medium | Medium | High |
| Team Learning Curve | Medium | Low | High | Low |
| Vendor Lock-in | High | Low | Low | Low |

## Recommendation

**Short-term (Current):** Keep current architecture
- Works for current scale (<100k events/day)
- Simple and understood by team
- No additional infrastructure

**Medium-term (10x growth):** TimescaleDB
- Minimal architecture change (still PostgreSQL)
- Can migrate incrementally
- Good balance of features and simplicity
- Works with Supabase

**Long-term (100x growth):** AWS Timestream or InfluxDB
- True time-series optimization
- Serverless scaling (Timestream)
- Advanced analytics capabilities
- Real-time dashboards

## Migration Path to TimescaleDB

### Phase 1: Preparation (Week 1-2)

1. **Enable TimescaleDB extension on Supabase/PostgreSQL:**
```sql
-- Enable TimescaleDB (if on Supabase, check availability)
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

2. **Create hypertable for analytics events:**
```sql
-- Create the time-series table
CREATE TABLE analytics_events_ts (
    time TIMESTAMPTZ NOT NULL,
    event_name TEXT NOT NULL,
    category TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    properties JSONB,
    device_info JSONB,
    page_url TEXT,
    referrer TEXT
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('analytics_events_ts', 'time');

-- Create indexes for common queries
CREATE INDEX idx_analytics_ts_category ON analytics_events_ts (category, time DESC);
CREATE INDEX idx_analytics_ts_event ON analytics_events_ts (event_name, time DESC);
CREATE INDEX idx_analytics_ts_user ON analytics_events_ts (user_id, time DESC) WHERE user_id IS NOT NULL;
```

3. **Set up compression policy:**
```sql
-- Enable compression
ALTER TABLE analytics_events_ts SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'category, event_name'
);

-- Compress data older than 7 days
SELECT add_compression_policy('analytics_events_ts', INTERVAL '7 days');
```

4. **Create continuous aggregates:**
```sql
-- Hourly aggregates (replaces flush worker)
CREATE MATERIALIZED VIEW analytics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    event_name,
    category,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events_ts
GROUP BY bucket, event_name, category
WITH NO DATA;

-- Refresh policy (every 30 minutes, covers last 2 hours)
SELECT add_continuous_aggregate_policy('analytics_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '30 minutes',
    schedule_interval => INTERVAL '30 minutes');

-- Daily aggregates for dashboards
CREATE MATERIALIZED VIEW analytics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    event_name,
    category,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users
FROM analytics_events_ts
GROUP BY bucket, event_name, category
WITH NO DATA;

SELECT add_continuous_aggregate_policy('analytics_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

### Phase 2: Parallel Writes (Week 3-4)

1. **Update analytics service to write to both:**
```python
# backend/services/analytics_service.py

async def ingest_events(self, events: List[AnalyticsEvent]):
    # Existing Redis write
    await self._write_to_redis(events)
    
    # New TimescaleDB write (parallel)
    await self._write_to_timescale(events)

async def _write_to_timescale(self, events: List[AnalyticsEvent]):
    values = [
        (e.timestamp, e.event_name, e.category, e.user_id, 
         e.session_id, json.dumps(e.properties), json.dumps(e.device_info))
        for e in events
    ]
    await self.db.executemany(
        """INSERT INTO analytics_events_ts 
           (time, event_name, category, user_id, session_id, properties, device_info)
           VALUES ($1, $2, $3, $4, $5, $6, $7)""",
        values
    )
```

### Phase 3: Validation (Week 5-6)

1. **Compare query results between systems:**
```sql
-- Compare hourly counts
SELECT 
    r.hour, r.event_count as redis_count, t.event_count as timescale_count,
    ABS(r.event_count - t.event_count) as diff
FROM redis_hourly_export r
JOIN analytics_hourly t ON r.hour = t.bucket AND r.event_name = t.event_name
WHERE diff > 0;
```

2. **Benchmark query performance:**
```sql
-- Time-range query benchmark
EXPLAIN ANALYZE
SELECT event_name, COUNT(*) 
FROM analytics_events_ts 
WHERE time > NOW() - INTERVAL '7 days'
GROUP BY event_name;
```

3. **Validate data integrity:**
- Total event counts match
- Category distributions match
- User counts match

### Phase 4: Cutover (Week 7-8)

1. **Switch reads to TimescaleDB:**
```python
# Update analytics endpoints to query TimescaleDB
async def get_summary(self, start: datetime, end: datetime):
    return await self.db.fetch("""
        SELECT bucket, event_name, event_count, unique_users
        FROM analytics_hourly
        WHERE bucket BETWEEN $1 AND $2
        ORDER BY bucket DESC
    """, start, end)
```

2. **Deprecate Redis analytics storage:**
- Remove Redis writes (keep for rate limiting/sessions)
- Remove flush worker

3. **Remove flush worker:**
- Delete `backend/workers/analytics_flush_worker.py`
- Update scheduler/cron configuration

### Phase 5: Optimization (Week 9+)

1. **Add retention policy:**
```sql
-- Keep raw data for 90 days
SELECT add_retention_policy('analytics_events_ts', INTERVAL '90 days');

-- Keep hourly aggregates for 1 year
SELECT add_retention_policy('analytics_hourly', INTERVAL '1 year');

-- Keep daily aggregates forever (or 5 years)
SELECT add_retention_policy('analytics_daily', INTERVAL '5 years');
```

2. **Create additional aggregates as needed:**
```sql
-- Popular assets aggregate
CREATE MATERIALIZED VIEW analytics_asset_popularity_ts
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    properties->>'asset_type' as asset_type,
    COUNT(*) as generation_count,
    COUNT(DISTINCT user_id) as unique_creators
FROM analytics_events_ts
WHERE event_name = 'asset_generated'
GROUP BY bucket, asset_type
WITH NO DATA;
```

## Decision Criteria

Migrate when ANY of these are true:
- [ ] Analytics queries taking >1s consistently
- [ ] Redis memory usage >1GB for analytics alone
- [ ] Need for complex time-series queries (percentiles, moving averages)
- [ ] Requirement for real-time dashboards (<1 min latency)
- [ ] Data retention >90 days needed with full granularity
- [ ] Event volume >500k/day
- [ ] Need for ad-hoc time-series analysis

## Monitoring During Migration

Track these metrics:
- Write latency (Redis vs TimescaleDB)
- Query latency for common operations
- Data consistency between systems
- Storage usage growth
- Compression ratios achieved

## Resources
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [TimescaleDB on Supabase](https://supabase.com/docs/guides/database/extensions/timescaledb)
- [AWS Timestream](https://aws.amazon.com/timestream/)
- [AWS Timestream Pricing](https://aws.amazon.com/timestream/pricing/)
- [InfluxDB Documentation](https://docs.influxdata.com/)
- [Redis TimeSeries](https://redis.io/docs/stack/timeseries/)
- [Time-Series Database Comparison](https://db-engines.com/en/ranking/time+series+dbms)
