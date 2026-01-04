"""
Provenance Capture Utilities.

Context managers and decorators for capturing reasoning chains in workers.
"""

import time
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional
import uuid

from .models import (
    ProvenanceRecord,
    ReasoningStep,
    DataSource,
    DecisionFactor,
    InsightType,
    ConfidenceLevel,
)
from .service import get_provenance_service

logger = logging.getLogger(__name__)


class ProvenanceCapture:
    """Builder for capturing provenance during computation."""
    
    def __init__(
        self,
        worker_name: str,
        execution_id: str,
        insight_type: InsightType,
        category_key: str = "",
    ):
        self.record = ProvenanceRecord(
            worker_name=worker_name,
            execution_id=execution_id,
            insight_type=insight_type,
            category_key=category_key,
        )
        self._start_time = time.time()
        self._step_counter = 0
        self._current_step_start: Optional[float] = None

    
    def add_data_source(
        self,
        source_type: str,
        source_key: str,
        records_used: int,
        freshness_seconds: float,
        quality_score: float = 1.0,
        sample_ids: Optional[List[str]] = None,
    ) -> "ProvenanceCapture":
        """Add a data source to the provenance record."""
        self.record.data_sources.append(DataSource(
            source_type=source_type,
            source_key=source_key,
            records_used=records_used,
            freshness_seconds=freshness_seconds,
            quality_score=quality_score,
            sample_ids=sample_ids or [],
        ))
        self.record.total_records_analyzed += records_used
        return self
    
    def add_decision_factor(
        self,
        factor_name: str,
        raw_value: Any,
        normalized_value: float,
        weight: float,
        reasoning: str,
    ) -> "ProvenanceCapture":
        """Add a decision factor that influenced the insight."""
        contribution = normalized_value * weight
        self.record.decision_factors.append(DecisionFactor(
            factor_name=factor_name,
            raw_value=raw_value,
            normalized_value=normalized_value,
            weight=weight,
            contribution=contribution,
            reasoning=reasoning,
        ))
        return self
    
    def start_step(self, operation: str, description: str, algorithm: str = "default") -> "ProvenanceCapture":
        """Start a new reasoning step."""
        self._step_counter += 1
        self._current_step_start = time.time()
        self._current_step = ReasoningStep(
            step_number=self._step_counter,
            operation=operation,
            description=description,
            input_count=0,
            output_count=0,
            algorithm=algorithm,
        )
        return self
    
    def end_step(self, input_count: int, output_count: int, parameters: Optional[Dict[str, Any]] = None) -> "ProvenanceCapture":
        """End the current reasoning step."""
        if hasattr(self, '_current_step'):
            self._current_step.input_count = input_count
            self._current_step.output_count = output_count
            self._current_step.parameters = parameters or {}
            if self._current_step_start:
                self._current_step.duration_ms = (time.time() - self._current_step_start) * 1000
            self.record.reasoning_chain.append(self._current_step)
        return self

    
    def set_insight(
        self,
        insight_id: str,
        insight_summary: str,
        insight_value: Any = None,
    ) -> "ProvenanceCapture":
        """Set the computed insight details."""
        self.record.insight_id = insight_id
        self.record.insight_summary = insight_summary
        self.record.insight_value = insight_value
        return self
    
    def set_confidence(self, score: float, reasoning: Optional[str] = None) -> "ProvenanceCapture":
        """Set confidence score (0-1)."""
        self.record.confidence_score = score
        if score >= 0.9:
            self.record.confidence_level = ConfidenceLevel.VERY_HIGH
        elif score >= 0.75:
            self.record.confidence_level = ConfidenceLevel.HIGH
        elif score >= 0.5:
            self.record.confidence_level = ConfidenceLevel.MEDIUM
        elif score >= 0.25:
            self.record.confidence_level = ConfidenceLevel.LOW
        else:
            self.record.confidence_level = ConfidenceLevel.VERY_LOW
        return self
    
    def set_quality(self, score: float) -> "ProvenanceCapture":
        """Set quality score (0-1)."""
        self.record.quality_score = score
        return self
    
    def set_validation(self, passed: bool, errors: Optional[List[str]] = None) -> "ProvenanceCapture":
        """Set validation results."""
        self.record.validation_passed = passed
        self.record.validation_errors = errors or []
        return self
    
    def add_tag(self, tag: str) -> "ProvenanceCapture":
        """Add a tag for filtering."""
        if tag not in self.record.tags:
            self.record.tags.append(tag)
        return self
    
    def set_algorithm_version(self, version: str) -> "ProvenanceCapture":
        """Set the algorithm version used."""
        self.record.algorithm_version = version
        return self
    
    def finalize(self) -> ProvenanceRecord:
        """Finalize and store the provenance record."""
        # Calculate duration (only if not already set externally)
        if self.record.computation_duration_ms == 0:
            self.record.computation_duration_ms = (time.time() - self._start_time) * 1000
        
        # Calculate average data freshness
        if self.record.data_sources:
            self.record.data_freshness_avg_seconds = sum(
                ds.freshness_seconds for ds in self.record.data_sources
            ) / len(self.record.data_sources)
        
        # Determine primary factor
        if self.record.decision_factors:
            primary = max(self.record.decision_factors, key=lambda f: f.contribution)
            self.record.primary_factor = primary.factor_name
        
        # Store
        service = get_provenance_service()
        service.store(self.record)
        
        logger.debug(f"Finalized provenance: {self.record.provenance_id} for {self.record.insight_type.value}")
        return self.record


@contextmanager
def provenance_context(
    worker_name: str,
    execution_id: str,
    insight_type: InsightType,
    category_key: str = "",
) -> Generator[ProvenanceCapture, None, None]:
    """
    Context manager for capturing provenance.
    
    Usage:
        with provenance_context("creator_intel", exec_id, InsightType.VIDEO_IDEA, "fortnite") as prov:
            prov.add_data_source("youtube_cache", "youtube:games:fortnite", 35, 3600)
            prov.start_step("filter", "Filter videos by view count")
            # ... do work ...
            prov.end_step(35, 10)
            prov.add_decision_factor("view_velocity", 1500, 0.8, 0.3, "High view velocity indicates trending")
            prov.set_insight("idea_123", "Create a Fortnite tips video", {"concept": "..."})
            prov.set_confidence(0.85)
    """
    capture = ProvenanceCapture(worker_name, execution_id, insight_type, category_key)
    try:
        yield capture
    finally:
        capture.finalize()


def capture_reasoning(
    worker_name: str,
    insight_type: InsightType,
    category_key: str = "",
):
    """
    Decorator for capturing provenance from a function.
    
    The decorated function should return a dict with:
    - insight_id: str
    - insight_summary: str
    - insight_value: Any (optional)
    - confidence: float (optional)
    - data_sources: List[dict] (optional)
    - decision_factors: List[dict] (optional)
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            execution_id = kwargs.get("execution_id", str(uuid.uuid4())[:8])
            capture = ProvenanceCapture(worker_name, execution_id, insight_type, category_key)
            
            result = func(*args, **kwargs)
            
            if isinstance(result, dict):
                # Extract provenance data from result
                if "insight_id" in result:
                    capture.set_insight(
                        result.get("insight_id", ""),
                        result.get("insight_summary", ""),
                        result.get("insight_value"),
                    )
                
                if "confidence" in result:
                    capture.set_confidence(result["confidence"])
                
                for ds in result.get("data_sources", []):
                    capture.add_data_source(**ds)
                
                for df in result.get("decision_factors", []):
                    capture.add_decision_factor(**df)
            
            capture.finalize()
            return result
        
        return wrapper
    return decorator
