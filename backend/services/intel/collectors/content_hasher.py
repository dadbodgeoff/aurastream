"""
Creator Intel V2 - Content Hasher

Provides content hashing for change detection across the intel system.
Enables efficient incremental processing by skipping unchanged data.
"""

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
import logging

logger = logging.getLogger(__name__)


@dataclass
class HashResult:
    """
    Result of a content hash operation.
    
    Attributes:
        hash_value: The computed hash (16-char hex string)
        item_count: Number of items hashed
        computed_at: When the hash was computed
        changed: Whether content changed from previous hash
        previous_hash: The previous hash value (if available)
    """
    hash_value: str
    item_count: int
    computed_at: datetime
    changed: bool = True
    previous_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "hash": self.hash_value,
            "item_count": self.item_count,
            "computed_at": self.computed_at.isoformat(),
            "changed": self.changed,
            "previous_hash": self.previous_hash,
        }


class ContentHasher:
    """
    Computes content hashes for change detection.
    
    The hasher creates deterministic hashes from content that can be
    compared across runs to detect meaningful changes. This enables
    the system to skip re-processing unchanged data.
    
    Hash Strategy:
    - Videos: Hash video_id + view_count (views change = meaningful change)
    - Streams: Hash stream_id + viewer_count
    - Analysis: Hash key metrics that affect recommendations
    
    Usage:
        hasher = ContentHasher()
        
        # Hash video content
        result = hasher.hash_videos(videos)
        
        # Check if changed
        if result.changed:
            await process_videos(videos)
        else:
            logger.info("Content unchanged, skipping processing")
    """
    
    # Hash length (characters)
    HASH_LENGTH = 16
    
    def __init__(self) -> None:
        """Initialize the content hasher."""
        pass
    
    def hash_videos(
        self,
        videos: List[Dict[str, Any]],
        previous_hash: Optional[str] = None,
    ) -> HashResult:
        """
        Hash a list of YouTube videos.
        
        Uses video_id and view_count as the hash basis, since view count
        changes indicate meaningful content updates.
        
        Args:
            videos: List of video dictionaries
            previous_hash: Previous hash to compare against
            
        Returns:
            HashResult with hash value and change detection
        """
        if not videos:
            return HashResult(
                hash_value="0" * self.HASH_LENGTH,
                item_count=0,
                computed_at=datetime.now(timezone.utc),
                changed=previous_hash != "0" * self.HASH_LENGTH,
                previous_hash=previous_hash,
            )
        
        # Sort by video_id for consistent ordering
        sorted_videos = sorted(videos, key=lambda x: x.get("video_id", ""))
        
        # Create content string from IDs and view counts
        content_parts = []
        for v in sorted_videos:
            video_id = v.get("video_id", "")
            view_count = v.get("view_count", 0)
            content_parts.append(f"{video_id}:{view_count}")
        
        content = "|".join(content_parts)
        hash_value = self._compute_hash(content)
        
        return HashResult(
            hash_value=hash_value,
            item_count=len(videos),
            computed_at=datetime.now(timezone.utc),
            changed=hash_value != previous_hash,
            previous_hash=previous_hash,
        )
    
    def hash_streams(
        self,
        streams: List[Dict[str, Any]],
        previous_hash: Optional[str] = None,
    ) -> HashResult:
        """
        Hash a list of Twitch streams.
        
        Uses stream_id and viewer_count as the hash basis.
        
        Args:
            streams: List of stream dictionaries
            previous_hash: Previous hash to compare against
            
        Returns:
            HashResult with hash value and change detection
        """
        if not streams:
            return HashResult(
                hash_value="0" * self.HASH_LENGTH,
                item_count=0,
                computed_at=datetime.now(timezone.utc),
                changed=previous_hash != "0" * self.HASH_LENGTH,
                previous_hash=previous_hash,
            )
        
        # Sort by stream ID for consistent ordering
        sorted_streams = sorted(streams, key=lambda x: x.get("id", x.get("stream_id", "")))
        
        # Create content string
        content_parts = []
        for s in sorted_streams:
            stream_id = s.get("id", s.get("stream_id", ""))
            viewer_count = s.get("viewer_count", 0)
            content_parts.append(f"{stream_id}:{viewer_count}")
        
        content = "|".join(content_parts)
        hash_value = self._compute_hash(content)
        
        return HashResult(
            hash_value=hash_value,
            item_count=len(streams),
            computed_at=datetime.now(timezone.utc),
            changed=hash_value != previous_hash,
            previous_hash=previous_hash,
        )
    
    def hash_analysis(
        self,
        analysis: Dict[str, Any],
        key_fields: Optional[List[str]] = None,
        previous_hash: Optional[str] = None,
    ) -> HashResult:
        """
        Hash an analysis result.
        
        Uses specified key fields or the entire analysis as hash basis.
        
        Args:
            analysis: Analysis dictionary
            key_fields: Specific fields to include in hash (default: all)
            previous_hash: Previous hash to compare against
            
        Returns:
            HashResult with hash value and change detection
        """
        if not analysis:
            return HashResult(
                hash_value="0" * self.HASH_LENGTH,
                item_count=0,
                computed_at=datetime.now(timezone.utc),
                changed=previous_hash != "0" * self.HASH_LENGTH,
                previous_hash=previous_hash,
            )
        
        # Extract key fields or use all
        if key_fields:
            hash_data = {k: analysis.get(k) for k in key_fields if k in analysis}
        else:
            # Exclude metadata fields that change every run
            exclude_fields = {"analyzed_at", "computed_at", "cache_key", "content_hash"}
            hash_data = {k: v for k, v in analysis.items() if k not in exclude_fields}
        
        # Serialize to JSON for consistent hashing
        content = json.dumps(hash_data, sort_keys=True, default=str)
        hash_value = self._compute_hash(content)
        
        return HashResult(
            hash_value=hash_value,
            item_count=len(hash_data),
            computed_at=datetime.now(timezone.utc),
            changed=hash_value != previous_hash,
            previous_hash=previous_hash,
        )
    
    def hash_generic(
        self,
        data: Union[List, Dict, str],
        previous_hash: Optional[str] = None,
    ) -> HashResult:
        """
        Hash arbitrary data.
        
        Args:
            data: Data to hash (list, dict, or string)
            previous_hash: Previous hash to compare against
            
        Returns:
            HashResult with hash value and change detection
        """
        if isinstance(data, str):
            content = data
            item_count = 1
        elif isinstance(data, list):
            content = json.dumps(data, sort_keys=True, default=str)
            item_count = len(data)
        elif isinstance(data, dict):
            content = json.dumps(data, sort_keys=True, default=str)
            item_count = len(data)
        else:
            content = str(data)
            item_count = 1
        
        hash_value = self._compute_hash(content)
        
        return HashResult(
            hash_value=hash_value,
            item_count=item_count,
            computed_at=datetime.now(timezone.utc),
            changed=hash_value != previous_hash,
            previous_hash=previous_hash,
        )
    
    def _compute_hash(self, content: str) -> str:
        """
        Compute SHA-256 hash of content.
        
        Args:
            content: String content to hash
            
        Returns:
            Truncated hex hash string
        """
        return hashlib.sha256(content.encode()).hexdigest()[:self.HASH_LENGTH]
    
    @staticmethod
    def combine_hashes(*hashes: str) -> str:
        """
        Combine multiple hashes into a single hash.
        
        Useful for creating a composite hash from multiple data sources.
        
        Args:
            *hashes: Variable number of hash strings
            
        Returns:
            Combined hash string
        """
        combined = "|".join(h for h in hashes if h)
        return hashlib.sha256(combined.encode()).hexdigest()[:16]


# Singleton instance
_content_hasher: Optional[ContentHasher] = None


def get_content_hasher() -> ContentHasher:
    """
    Get the singleton content hasher instance.
    
    Returns:
        ContentHasher instance
    """
    global _content_hasher
    if _content_hasher is None:
        _content_hasher = ContentHasher()
    return _content_hasher
