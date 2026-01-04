"""
Nano Banana Client with Enterprise-Grade Provenance Capture.

Wraps the Nano Banana (Gemini) client to capture full provenance
for every image generation call, enabling:
- Complete audit trail of all AI image generations
- Cost tracking and optimization insights
- Performance monitoring and anomaly detection
- Quality metrics and content policy tracking
- Debugging and reproducibility

Usage:
    from backend.services.nano_banana_provenance import get_provenance_nano_banana_client
    
    client = get_provenance_nano_banana_client()
    response = await client.generate_with_provenance(
        request=GenerationRequest(...),
        job_id="job-123",
        user_id="user-456",
        execution_id="exec-789",
    )
"""

import hashlib
import logging
import time
from dataclasses import dataclass
from typing import Optional

from backend.services.nano_banana_client import (
    NanoBananaClient,
    GenerationRequest,
    GenerationResponse,
    get_nano_banana_client,
)
from backend.services.provenance import (
    provenance_context,
    InsightType,
    get_provenance_service,
)
from backend.services.provenance.models import (
    GenerationMetrics,
)
from backend.services.exceptions import (
    RateLimitError,
    ContentPolicyError,
    GenerationTimeoutError,
    GenerationError,
)

logger = logging.getLogger(__name__)

# Gemini pricing estimates (as of Jan 2026)
# These are approximate and should be updated based on actual pricing
GEMINI_PRICING = {
    "gemini-3-pro-image-preview": {
        "input_per_1k_tokens": 0.00125,
        "output_per_1k_tokens": 0.005,
        "image_input_per_image": 0.00265,  # Per image in input
        "image_output_per_image": 0.04,    # Per image generated
    },
    "gemini-2.5-flash": {
        "input_per_1k_tokens": 0.000075,
        "output_per_1k_tokens": 0.0003,
        "image_input_per_image": 0.001,
        "image_output_per_image": 0.02,
    },
}

# Asset type to InsightType mapping
ASSET_TYPE_TO_INSIGHT = {
    "twitch_emote": InsightType.EMOTE_GENERATION,
    "twitch_emote_112": InsightType.EMOTE_GENERATION,
    "twitch_emote_56": InsightType.EMOTE_GENERATION,
    "twitch_emote_28": InsightType.EMOTE_GENERATION,
    "tiktok_emote": InsightType.EMOTE_GENERATION,
    "thumbnail": InsightType.THUMBNAIL_GENERATION,
    "youtube_thumbnail": InsightType.THUMBNAIL_GENERATION,
    "overlay": InsightType.OVERLAY_GENERATION,
    "twitch_overlay": InsightType.OVERLAY_GENERATION,
    "banner": InsightType.BANNER_GENERATION,
    "twitch_banner": InsightType.BANNER_GENERATION,
    "profile_picture": InsightType.PROFILE_GENERATION,
    "streamer_logo": InsightType.PROFILE_GENERATION,
}


def _estimate_tokens(text: str) -> int:
    """Estimate token count from text (rough approximation: 4 chars per token)."""
    return len(text) // 4


def _calculate_aspect_ratio(width: int, height: int) -> str:
    """Calculate human-readable aspect ratio."""
    from math import gcd
    divisor = gcd(width, height)
    return f"{width // divisor}:{height // divisor}"


def _hash_prompt(prompt: str) -> str:
    """Create SHA256 hash of prompt for deduplication tracking."""
    return hashlib.sha256(prompt.encode()).hexdigest()[:16]


def _estimate_cost(
    model: str,
    prompt_tokens: int,
    media_assets_count: int,
    has_input_image: bool,
) -> float:
    """Estimate generation cost in USD."""
    pricing = GEMINI_PRICING.get(model, GEMINI_PRICING["gemini-3-pro-image-preview"])
    
    # Input cost
    input_cost = (prompt_tokens / 1000) * pricing["input_per_1k_tokens"]
    
    # Image input cost
    image_input_count = media_assets_count + (1 if has_input_image else 0)
    image_input_cost = image_input_count * pricing["image_input_per_image"]
    
    # Output cost (1 image)
    output_cost = pricing["image_output_per_image"]
    
    return round(input_cost + image_input_cost + output_cost, 6)


@dataclass
class GenerationContext:
    """Context for a generation call, used for provenance capture."""
    job_id: str
    user_id: str
    execution_id: str
    asset_type: str = "image"
    brand_kit_id: Optional[str] = None
    brand_kit_name: str = ""
    is_refinement: bool = False


class ProvenanceNanoBananaClient:
    """
    Nano Banana client with full provenance capture.
    
    Every generation call is tracked with:
    - Complete request/response metadata
    - Performance metrics (latency, retries)
    - Cost estimation
    - Quality signals
    - Error tracking
    """
    
    ALGORITHM_VERSION = "1.0.0"
    
    def __init__(self, client: Optional[NanoBananaClient] = None):
        self._client = client or get_nano_banana_client()
        self._provenance_service = get_provenance_service()
    
    async def generate_with_provenance(
        self,
        request: GenerationRequest,
        context: GenerationContext,
    ) -> GenerationResponse:
        """
        Generate an image with full provenance capture.
        
        Args:
            request: The generation request
            context: Context for provenance (job_id, user_id, etc.)
            
        Returns:
            GenerationResponse with image data
            
        Raises:
            Same exceptions as NanoBananaClient.generate()
        """
        start_time = time.time()
        retry_count = 0
        error_type = None
        error_details = None
        response: Optional[GenerationResponse] = None
        
        # Determine insight type based on asset type
        insight_type = ASSET_TYPE_TO_INSIGHT.get(
            context.asset_type,
            InsightType.IMAGE_REFINEMENT if context.is_refinement else InsightType.IMAGE_GENERATION
        )
        
        try:
            # Execute generation
            response = await self._client.generate(request)
            
        except RateLimitError as e:
            error_type = "rate_limit"
            error_details = f"Retry after {e.retry_after}s"
            raise
            
        except ContentPolicyError as e:
            error_type = "content_policy"
            error_details = str(e.reason)[:500]
            raise
            
        except GenerationTimeoutError as e:
            error_type = "timeout"
            error_details = f"Timeout after {e.timeout_seconds}s"
            raise
            
        except GenerationError as e:
            error_type = "api_error"
            error_details = str(e.message)[:500]
            raise
            
        except Exception as e:
            error_type = "unexpected"
            error_details = str(e)[:500]
            raise
            
        finally:
            # Always capture provenance, even on failure
            total_latency_ms = int((time.time() - start_time) * 1000)
            
            await self._capture_provenance(
                request=request,
                response=response,
                context=context,
                insight_type=insight_type,
                total_latency_ms=total_latency_ms,
                retry_count=retry_count,
                error_type=error_type,
                error_details=error_details,
            )
        
        return response
    
    async def _capture_provenance(
        self,
        request: GenerationRequest,
        response: Optional[GenerationResponse],
        context: GenerationContext,
        insight_type: InsightType,
        total_latency_ms: int,
        retry_count: int,
        error_type: Optional[str],
        error_details: Optional[str],
    ) -> None:
        """Capture full provenance for a generation call."""
        
        # Build generation metrics
        prompt_tokens = _estimate_tokens(request.prompt)
        media_count = len(request.media_assets) if request.media_assets else 0
        has_input = request.input_image is not None
        conversation_turns = len(request.conversation_history) if request.conversation_history else 0
        
        metrics = GenerationMetrics(
            model_name=request.model or self._client.model,
            prompt_length=len(request.prompt),
            prompt_tokens_estimated=prompt_tokens,
            width=request.width,
            height=request.height,
            aspect_ratio=_calculate_aspect_ratio(request.width, request.height),
            is_refinement=context.is_refinement,
            is_multi_turn=conversation_turns > 0,
            conversation_turns=conversation_turns,
            has_input_image=has_input,
            media_assets_count=media_count,
            inference_time_ms=response.inference_time_ms if response else 0,
            total_latency_ms=total_latency_ms,
            retry_count=retry_count,
            output_size_bytes=len(response.image_data) if response else 0,
            output_format="png",
            estimated_input_tokens=prompt_tokens,
            estimated_output_tokens=100,  # Image generation has minimal text output
            estimated_cost_usd=_estimate_cost(
                model=request.model or self._client.model,
                prompt_tokens=prompt_tokens,
                media_assets_count=media_count,
                has_input_image=has_input,
            ),
            content_policy_passed=error_type != "content_policy",
            generation_seed=response.seed if response else 0,
        )
        
        # Use provenance context for structured capture
        with provenance_context(
            worker_name="generation_worker",
            execution_id=context.execution_id,
            insight_type=insight_type,
            category_key=context.asset_type,
        ) as prov:
            # Override computation duration
            prov.record.computation_duration_ms = total_latency_ms
            
            # === DATA SOURCES ===
            
            # Nano Banana API
            prov.add_data_source(
                source_type="nano_banana_api",
                source_key=f"gemini:{metrics.model_name}",
                records_used=1,
                freshness_seconds=0,
                quality_score=1.0 if response else 0.0,
                sample_ids=[response.generation_id] if response else [],
            )
            
            # Media assets if provided
            if request.media_assets:
                prov.add_data_source(
                    source_type="media_assets",
                    source_key="user_uploads",
                    records_used=media_count,
                    freshness_seconds=0,
                    quality_score=1.0,
                    sample_ids=[a.asset_id for a in request.media_assets if a.asset_id],
                )
            
            # Conversation history for refinements
            if request.conversation_history:
                prov.add_data_source(
                    source_type="conversation_history",
                    source_key="multi_turn_context",
                    records_used=conversation_turns,
                    freshness_seconds=300,  # Assume recent conversation
                    quality_score=1.0,
                )
            
            # === REASONING CHAIN ===
            
            prov.start_step(
                operation="prepare_request",
                description="Build generation request with prompt and assets",
                algorithm="prompt_construction",
            )
            prov.end_step(
                input_count=1 + media_count + (1 if has_input else 0),
                output_count=1,
                parameters={
                    "prompt_length": len(request.prompt),
                    "media_assets": media_count,
                    "has_input_image": has_input,
                    "is_refinement": context.is_refinement,
                },
            )
            
            prov.start_step(
                operation="api_call",
                description=f"Call Nano Banana API ({metrics.model_name})",
                algorithm="gemini_image_generation",
            )
            prov.end_step(
                input_count=1,
                output_count=1 if response else 0,
                parameters={
                    "model": metrics.model_name,
                    "width": request.width,
                    "height": request.height,
                    "inference_time_ms": metrics.inference_time_ms,
                    "retries": retry_count,
                },
            )
            
            if response:
                prov.start_step(
                    operation="process_response",
                    description="Extract and validate generated image",
                    algorithm="response_parsing",
                )
                prov.end_step(
                    input_count=1,
                    output_count=1,
                    parameters={
                        "output_size_bytes": metrics.output_size_bytes,
                        "seed": response.seed,
                    },
                )
            
            # === DECISION FACTORS ===
            
            # Model selection factor
            prov.add_decision_factor(
                factor_name="model_selection",
                raw_value=metrics.model_name,
                normalized_value=1.0,
                weight=0.15,
                reasoning=f"Using {metrics.model_name} for {'refinement' if context.is_refinement else 'generation'}",
            )
            
            # Prompt complexity factor
            prompt_complexity = min(1.0, prompt_tokens / 2000)
            prov.add_decision_factor(
                factor_name="prompt_complexity",
                raw_value=prompt_tokens,
                normalized_value=prompt_complexity,
                weight=0.20,
                reasoning=f"{prompt_tokens} estimated tokens - {'complex' if prompt_tokens > 1000 else 'moderate' if prompt_tokens > 500 else 'simple'} prompt",
            )
            
            # Media context factor
            media_factor = min(1.0, media_count / 5) if media_count > 0 else 0.0
            prov.add_decision_factor(
                factor_name="media_context",
                raw_value=media_count,
                normalized_value=media_factor,
                weight=0.15,
                reasoning=f"{media_count} media assets attached" if media_count > 0 else "No media assets",
            )
            
            # Performance factor
            perf_score = 1.0 - min(1.0, total_latency_ms / 30000)  # 30s = 0 score
            prov.add_decision_factor(
                factor_name="generation_performance",
                raw_value=total_latency_ms,
                normalized_value=perf_score,
                weight=0.25,
                reasoning=f"{total_latency_ms}ms total latency - {'excellent' if total_latency_ms < 5000 else 'good' if total_latency_ms < 15000 else 'slow'}",
            )
            
            # Success factor
            success_score = 1.0 if response and not error_type else 0.0
            prov.add_decision_factor(
                factor_name="generation_success",
                raw_value=error_type is None,
                normalized_value=success_score,
                weight=0.25,
                reasoning="Generation successful" if success_score == 1.0 else f"Failed: {error_type}",
            )
            
            # === SET INSIGHT ===
            
            insight_summary = (
                f"Generated {context.asset_type} ({request.width}x{request.height}) "
                f"in {total_latency_ms}ms"
            ) if response else f"Generation failed: {error_type}"
            
            prov.set_insight(
                insight_id=response.generation_id if response else f"failed_{context.job_id}",
                insight_summary=insight_summary,
                insight_value={
                    "job_id": context.job_id,
                    "asset_type": context.asset_type,
                    "dimensions": f"{request.width}x{request.height}",
                    "model": metrics.model_name,
                    "inference_time_ms": metrics.inference_time_ms,
                    "total_latency_ms": total_latency_ms,
                    "output_size_bytes": metrics.output_size_bytes,
                    "estimated_cost_usd": metrics.estimated_cost_usd,
                    "seed": metrics.generation_seed,
                    "success": response is not None,
                    "error_type": error_type,
                },
            )
            
            # === CONFIDENCE & QUALITY ===
            
            confidence = (
                0.15 +  # model selection
                prompt_complexity * 0.20 +
                media_factor * 0.15 +
                perf_score * 0.25 +
                success_score * 0.25
            )
            prov.set_confidence(confidence)
            prov.set_quality(success_score)
            
            # === VALIDATION ===
            
            validation_errors = []
            if error_type:
                validation_errors.append(f"Generation error: {error_type}")
            if total_latency_ms > 30000:
                validation_errors.append(f"High latency: {total_latency_ms}ms")
            if retry_count > 0:
                validation_errors.append(f"Required {retry_count} retries")
            if metrics.estimated_cost_usd > 0.10:
                validation_errors.append(f"High cost: ${metrics.estimated_cost_usd:.4f}")
            
            prov.set_validation(
                passed=len(validation_errors) == 0 and response is not None,
                errors=validation_errors,
            )
            
            # === TAGS ===
            
            prov.add_tag(context.asset_type)
            prov.add_tag(metrics.model_name)
            prov.add_tag(f"{request.width}x{request.height}")
            
            if context.is_refinement:
                prov.add_tag("refinement")
            if media_count > 0:
                prov.add_tag("with_media_assets")
            if has_input:
                prov.add_tag("image_to_image")
            if error_type:
                prov.add_tag(f"error_{error_type}")
            if context.brand_kit_id:
                prov.add_tag("branded")
            
            prov.set_algorithm_version(self.ALGORITHM_VERSION)
            
            # Store additional generation-specific data
            # This extends the base provenance record
            prov.record.tags.append(f"cost_${metrics.estimated_cost_usd:.4f}")
            prov.record.tags.append(f"latency_{total_latency_ms}ms")
        
        logger.debug(
            f"Captured generation provenance: job_id={context.job_id}, "
            f"success={response is not None}, latency={total_latency_ms}ms, "
            f"cost=${metrics.estimated_cost_usd:.4f}"
        )
    
    async def close(self):
        """Close the underlying client."""
        await self._client.close()


# Singleton
_provenance_client: Optional[ProvenanceNanoBananaClient] = None


def get_provenance_nano_banana_client() -> ProvenanceNanoBananaClient:
    """Get the provenance-enabled Nano Banana client singleton."""
    global _provenance_client
    if _provenance_client is None:
        _provenance_client = ProvenanceNanoBananaClient()
    return _provenance_client


__all__ = [
    "GenerationContext",
    "ProvenanceNanoBananaClient",
    "get_provenance_nano_banana_client",
]
