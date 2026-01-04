# Intelligence Provenance System

## Overview

The Provenance System captures the complete reasoning chain behind every computed insight, enabling:
- **Auditability**: Know exactly why any recommendation was made
- **Learning**: Identify which factors drive the best insights
- **Optimization**: Tune weights and algorithms based on real data
- **Debugging**: Trace issues back to their source

## Quick Start

### Using the Context Manager

```python
from backend.services.provenance import provenance_context, InsightType

async def generate_video_idea(game_key: str, execution_id: str):
    with provenance_context(
        worker_name="creator_intel_worker",
        execution_id=execution_id,
        insight_type=InsightType.VIDEO_IDEA,
        category_key=game_key,
    ) as prov:
        # 1. Add data sources
        prov.add_data_source(
            source_type="youtube_cache",
            source_key=f"youtube:games:{game_key}",
            records_used=35,
            freshness_seconds=3600,
            quality_score=0.9,
        )
        
        # 2. Document reasoning steps
        prov.start_step("filter", "Filter videos by view count", "threshold_filter")
        filtered = [v for v in videos if v.views > 10000]
        prov.end_step(input_count=35, output_count=len(filtered))
        
        # 3. Add decision factors
        prov.add_decision_factor(
            factor_name="view_velocity",
            raw_value=1500,
            normalized_value=0.8,
            weight=0.3,
            reasoning="High velocity indicates trending content",
        )
        
        # 4. Set the insight
        prov.set_insight(
            insight_id="idea_123",
            insight_summary="Create a Fortnite tips video",
            insight_value={"concept": "...", "hook": "..."},
        )
        
        # 5. Set confidence and quality
        prov.set_confidence(0.85)
        prov.set_quality(0.9)
```

## API Endpoints

### List Records (with filtering, sorting, pagination)
```
GET /api/v1/provenance/records
  ?worker_names=creator_intel_worker
  &insight_types=video_idea,title_suggestion
  &category_keys=fortnite,valorant
  &confidence_levels=high,very_high
  &min_confidence=0.7
  &sort_by=confidence_score
  &sort_desc=true
  &page=1
  &page_size=50
```

### Get Single Record
```
GET /api/v1/provenance/records/{provenance_id}
```

### Get Reasoning Chain (detailed view)
```
GET /api/v1/provenance/records/{provenance_id}/reasoning
```

### Get Aggregations
```
GET /api/v1/provenance/aggregate?hours=24
```

### Analyze Decision Factor
```
GET /api/v1/provenance/factors/{factor_name}?days=7
```

## Frontend Dashboard

Access at: `/admin/orchestrator/provenance`

Features:
- Real-time provenance record list
- Filtering by type, category, worker, confidence
- Sorting by any metric
- Pagination
- Detail modal with full reasoning chain visualization
- Decision factor breakdown with contribution bars
- Data source lineage view
- Aggregated statistics and top factors

## Insight Types

- `video_idea` - Generated video concepts
- `title_suggestion` - Title recommendations
- `keyword_ranking` - Keyword analysis results
- `viral_prediction` - Viral potential predictions
- `thumbnail_analysis` - Thumbnail insights
- `trend_detection` - Detected trends
- `content_format` - Format recommendations
- `regional_opportunity` - Regional insights
- `semantic_cluster` - Topic clusters
- `playbook_recommendation` - Playbook suggestions

### Nano Banana (Image Generation) Types

- `image_generation` - Standard image generation
- `image_refinement` - Multi-turn refinement of existing image
- `emote_generation` - Twitch/TikTok emote generation
- `thumbnail_generation` - YouTube thumbnail generation
- `overlay_generation` - Stream overlay generation
- `banner_generation` - Channel banner generation
- `profile_generation` - Profile picture/logo generation
- `batch_generation` - Batch generation jobs

## Nano Banana Provenance

The provenance system captures full audit trails for all Nano Banana (Gemini) API calls.

### Using the Provenance-Enabled Client

```python
from backend.services.nano_banana_provenance import (
    get_provenance_nano_banana_client,
    GenerationContext,
)
from backend.services.nano_banana_client import GenerationRequest

async def generate_with_tracking(job_id: str, user_id: str, prompt: str):
    client = get_provenance_nano_banana_client()
    
    request = GenerationRequest(
        prompt=prompt,
        width=1280,
        height=720,
    )
    
    context = GenerationContext(
        job_id=job_id,
        user_id=user_id,
        execution_id=f"gen_{job_id[:8]}",
        asset_type="thumbnail",
        brand_kit_id="optional-brand-kit-id",
        is_refinement=False,
    )
    
    response = await client.generate_with_provenance(
        request=request,
        context=context,
    )
    
    return response.image_data
```

### What Gets Captured

For every Nano Banana API call, the provenance system captures:

1. **Request Details**
   - Model name and version
   - Prompt length and estimated tokens
   - Dimensions and aspect ratio
   - Media assets attached
   - Conversation history (for refinements)

2. **Performance Metrics**
   - Inference time (API processing)
   - Total latency (end-to-end)
   - Retry count
   - Output size in bytes

3. **Cost Estimation**
   - Estimated input tokens
   - Estimated output tokens
   - Estimated cost in USD

4. **Quality Signals**
   - Content policy pass/fail
   - Generation seed (for reproducibility)
   - Success/failure status

5. **Error Tracking**
   - Error type (rate_limit, content_policy, timeout, api_error)
   - Error details

### Querying Generation Provenance

```python
from backend.services.provenance import get_provenance_service, ProvenanceQuery, InsightType

service = get_provenance_service()

# Get all image generations from last 24 hours
records, total = service.query(ProvenanceQuery(
    insight_types=[InsightType.IMAGE_GENERATION, InsightType.THUMBNAIL_GENERATION],
    page_size=100,
))

# Get failed generations
failed_records, _ = service.query(ProvenanceQuery(
    tags=["error_content_policy", "error_rate_limit", "error_timeout"],
))

# Get high-cost generations
for record in records:
    if "cost_$0.05" in record.tags or any("cost_$0.0" not in t for t in record.tags if t.startswith("cost_")):
        print(f"High cost generation: {record.provenance_id}")
```

### Dashboard Metrics

The provenance data enables rich dashboard metrics:

- **Cost per asset type**: Track which asset types cost most
- **Latency percentiles**: P50, P95, P99 generation times
- **Error rates**: Content policy violations, rate limits, timeouts
- **Model performance**: Compare different Gemini models
- **User patterns**: Generation frequency, asset type preferences

## Best Practices

1. **Always add data sources** - Document where data came from
2. **Use reasoning steps** - Break down the algorithm into steps
3. **Add all decision factors** - Every weight/score should be a factor
4. **Set meaningful summaries** - Make insights human-readable
5. **Validate outputs** - Use set_validation() to flag issues
6. **Tag appropriately** - Tags enable powerful filtering
