"""
Creator Intel V2 - Collectors Module

Data collection infrastructure for YouTube and Twitch APIs.
Provides quota-aware, batched collection with circuit breaker patterns.
"""

from backend.services.intel.collectors.quota_manager import (
    QuotaManager,
    QuotaBucket,
    CollectionPriority,
)
from backend.services.intel.collectors.batch_collector import (
    BatchCollector,
    BatchCollectionResult,
)
from backend.services.intel.collectors.content_hasher import (
    ContentHasher,
    HashResult,
)

__all__ = [
    # Quota management
    "QuotaManager",
    "QuotaBucket",
    "CollectionPriority",
    # Batch collection
    "BatchCollector",
    "BatchCollectionResult",
    # Content hashing
    "ContentHasher",
    "HashResult",
]
