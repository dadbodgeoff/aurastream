"""
Pack Generation Service for Twitch Asset Pipeline.

This module implements one-click suite generation for creating
complete asset packs with consistent branding.

Pack types:
- seasonal: 1 Story, 1 Thumbnail, 3 Emotes
- emote: 5 Emotes with variations
- stream: 3 Panels, 1 Offline screen
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import asyncio
import uuid
import logging
from datetime import datetime, timezone

from backend.services.twitch.context_engine import GenerationContext, ContextEngine, get_context_engine
from backend.services.twitch.prompt_constructor import PromptConstructor
from backend.services.twitch.asset_pipeline import AssetPipeline
from backend.services.twitch.qc_gate import QCGate
from backend.services.twitch.dimensions import DIMENSION_SPECS, ASSET_TYPE_DIRECTIVES, get_dimension_spec

logger = logging.getLogger(__name__)


@dataclass
class PackAsset:
    """Single asset in a pack."""
    id: str
    asset_type: str
    image_data: bytes
    filename: str
    width: int
    height: int
    file_size: int
    format: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class AssetPack:
    """Complete asset pack."""
    id: str
    pack_type: str
    brand_kit_id: str
    user_id: str
    status: str  # queued, processing, completed, failed
    progress: int  # 0-100
    assets: List[PackAsset] = field(default_factory=list)
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class PackGenerationService:
    """
    One-Click Suite Generation.
    
    Generates complete asset packs with consistent branding:
    - Seasonal Pack: 1 Story, 1 Thumbnail, 3 Emotes
    - Emote Pack: 5 Emotes with variations
    - Stream Pack: 3 Panels, 1 Offline screen
    """
    
    # Pack definitions: list of (asset_type, count) tuples
    PACK_DEFINITIONS: Dict[str, List[Dict[str, Any]]] = {
        "seasonal": [
            {"type": "tiktok_story", "count": 1},
            {"type": "youtube_thumbnail", "count": 1},
            {"type": "twitch_emote", "count": 3},
        ],
        "emote": [
            {"type": "twitch_emote", "count": 5},
        ],
        "stream": [
            {"type": "twitch_panel", "count": 3},
            {"type": "twitch_offline", "count": 1},
        ],
    }
    
    def __init__(
        self,
        context_engine: Optional[ContextEngine] = None,
        prompt_constructor: Optional[PromptConstructor] = None,
        asset_pipeline: Optional[AssetPipeline] = None,
        qc_gate: Optional[QCGate] = None,
    ):
        """
        Initialize the pack generation service.
        
        Args:
            context_engine: Context engine instance (lazy-loaded if not provided)
            prompt_constructor: Prompt constructor instance (created if not provided)
            asset_pipeline: Asset pipeline instance (created if not provided)
            qc_gate: QC gate instance (created if not provided)
        """
        self._context_engine = context_engine
        self._prompt_constructor = prompt_constructor or PromptConstructor()
        self._asset_pipeline = asset_pipeline or AssetPipeline()
        self._qc_gate = qc_gate or QCGate()
    
    @property
    def context_engine(self) -> ContextEngine:
        """Lazy-load context engine."""
        if self._context_engine is None:
            self._context_engine = get_context_engine()
        return self._context_engine
    
    def get_pack_definition(self, pack_type: str) -> List[Dict[str, Any]]:
        """
        Get the asset definition for a pack type.
        
        Args:
            pack_type: Type of pack (seasonal, emote, stream)
            
        Returns:
            List of asset definitions
            
        Raises:
            ValueError: If pack type is unknown
        """
        if pack_type not in self.PACK_DEFINITIONS:
            raise ValueError(f"Unknown pack type: {pack_type}")
        return self.PACK_DEFINITIONS[pack_type]
    
    def get_total_asset_count(self, pack_type: str) -> int:
        """
        Get the total number of assets in a pack type.
        
        Args:
            pack_type: Type of pack
            
        Returns:
            Total asset count
        """
        definition = self.get_pack_definition(pack_type)
        return sum(item["count"] for item in definition)
    
    async def create_pack(
        self,
        user_id: str,
        brand_kit_id: str,
        pack_type: str,
        custom_prompt: Optional[str] = None,
        game_id: Optional[str] = None,
    ) -> AssetPack:
        """
        Create a new asset pack (queued state).
        
        Args:
            user_id: User's ID
            brand_kit_id: Brand kit to use
            pack_type: Type of pack to generate
            custom_prompt: Optional custom prompt
            game_id: Optional game ID for context
            
        Returns:
            AssetPack in queued state
        """
        # Validate pack type
        if pack_type not in self.PACK_DEFINITIONS:
            raise ValueError(f"Unknown pack type: {pack_type}")
        
        # Validate brand kit ownership by building context
        await self.context_engine.build_context(
            user_id=user_id,
            brand_kit_id=brand_kit_id,
            asset_type="pack",
            game_id=game_id,
        )
        
        return AssetPack(
            id=str(uuid.uuid4()),
            pack_type=pack_type,
            brand_kit_id=brand_kit_id,
            user_id=user_id,
            status="queued",
            progress=0,
        )
    
    async def generate_pack(
        self,
        user_id: str,
        brand_kit_id: str,
        pack_type: str,
        custom_prompt: Optional[str] = None,
        game_id: Optional[str] = None,
        image_generator=None,  # Nano Banana client
    ) -> AssetPack:
        """
        Generate a complete asset pack.
        
        All assets use the same brand kit context and style anchor
        for visual consistency.
        
        Args:
            user_id: User's ID
            brand_kit_id: Brand kit to use
            pack_type: Type of pack to generate
            custom_prompt: Optional custom prompt
            game_id: Optional game ID for context
            image_generator: Image generation client (Nano Banana)
            
        Returns:
            Completed AssetPack with all assets
        """
        pack = await self.create_pack(
            user_id=user_id,
            brand_kit_id=brand_kit_id,
            pack_type=pack_type,
            custom_prompt=custom_prompt,
            game_id=game_id,
        )
        
        pack.status = "processing"
        
        try:
            # Get pack definition
            definition = self.get_pack_definition(pack_type)
            total_assets = self.get_total_asset_count(pack_type)
            
            # Build base context (same for all assets in pack)
            base_context = await self.context_engine.build_context(
                user_id=user_id,
                brand_kit_id=brand_kit_id,
                asset_type="pack",
                game_id=game_id,
            )
            
            # Generate all assets
            completed_count = 0
            for item in definition:
                asset_type = item["type"]
                count = item["count"]
                
                for i in range(count):
                    try:
                        asset = await self._generate_single_asset(
                            base_context=base_context,
                            asset_type=asset_type,
                            custom_prompt=custom_prompt,
                            index=i,
                            image_generator=image_generator,
                        )
                        pack.assets.append(asset)
                    except Exception as e:
                        logger.error(f"Failed to generate {asset_type} #{i}: {e}")
                        # Continue with other assets
                    
                    completed_count += 1
                    pack.progress = int((completed_count / total_assets) * 100)
            
            pack.status = "completed"
            pack.progress = 100
            pack.completed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            pack.status = "failed"
            pack.error_message = str(e)
            logger.error(f"Pack generation failed: {e}")
        
        return pack
    
    async def generate_pack_parallel(
        self,
        user_id: str,
        brand_kit_id: str,
        pack_type: str,
        custom_prompt: Optional[str] = None,
        game_id: Optional[str] = None,
        image_generator=None,
    ) -> AssetPack:
        """
        Generate a complete asset pack with parallel processing.
        
        All assets are generated concurrently for faster completion.
        
        Args:
            user_id: User's ID
            brand_kit_id: Brand kit to use
            pack_type: Type of pack to generate
            custom_prompt: Optional custom prompt
            game_id: Optional game ID for context
            image_generator: Image generation client
            
        Returns:
            Completed AssetPack with all assets
        """
        pack = await self.create_pack(
            user_id=user_id,
            brand_kit_id=brand_kit_id,
            pack_type=pack_type,
            custom_prompt=custom_prompt,
            game_id=game_id,
        )
        
        pack.status = "processing"
        
        try:
            # Get pack definition
            definition = self.get_pack_definition(pack_type)
            
            # Build base context
            base_context = await self.context_engine.build_context(
                user_id=user_id,
                brand_kit_id=brand_kit_id,
                asset_type="pack",
                game_id=game_id,
            )
            
            # Create tasks for all assets
            tasks = []
            for item in definition:
                asset_type = item["type"]
                count = item["count"]
                
                for i in range(count):
                    task = self._generate_single_asset(
                        base_context=base_context,
                        asset_type=asset_type,
                        custom_prompt=custom_prompt,
                        index=i,
                        image_generator=image_generator,
                    )
                    tasks.append(task)
            
            # Execute all tasks in parallel
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Collect successful assets
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Asset generation failed: {result}")
                    continue
                pack.assets.append(result)
            
            pack.status = "completed"
            pack.progress = 100
            pack.completed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            pack.status = "failed"
            pack.error_message = str(e)
            logger.error(f"Pack generation failed: {e}")
        
        return pack
    
    async def _generate_single_asset(
        self,
        base_context: GenerationContext,
        asset_type: str,
        custom_prompt: Optional[str],
        index: int,
        image_generator=None,
    ) -> PackAsset:
        """
        Generate a single asset within a pack.
        
        Args:
            base_context: Base generation context from pack
            asset_type: Type of asset to generate
            custom_prompt: Optional custom prompt
            index: Asset index within type
            image_generator: Image generation client
            
        Returns:
            Generated PackAsset
        """
        # Create asset-specific context
        asset_directive = ASSET_TYPE_DIRECTIVES.get(asset_type, "")
        context = GenerationContext(
            primary_colors=base_context.primary_colors,
            secondary_colors=base_context.secondary_colors,
            accent_colors=base_context.accent_colors,
            gradients=base_context.gradients,
            display_font=base_context.display_font,
            headline_font=base_context.headline_font,
            body_font=base_context.body_font,
            tone=base_context.tone,
            personality_traits=base_context.personality_traits,
            tagline=base_context.tagline,
            primary_logo_url=base_context.primary_logo_url,
            watermark_url=base_context.watermark_url,
            watermark_opacity=base_context.watermark_opacity,
            style_reference=base_context.style_reference,
            game_meta=base_context.game_meta,
            season_context=base_context.season_context,
            asset_type=asset_type,
            asset_directive=asset_directive,
        )
        
        # Build prompt
        prompt = self._prompt_constructor.build_mega_prompt(context, custom_prompt)
        
        # Get dimensions
        spec = get_dimension_spec(asset_type)
        
        # Generate image (if generator provided)
        if image_generator:
            # In production, call the image generator
            image_data = await image_generator.generate(
                prompt=prompt,
                width=spec.generation_size[0],
                height=spec.generation_size[1],
            )
        else:
            # For testing, create placeholder image
            from PIL import Image
            from io import BytesIO
            
            img = Image.new("RGB", spec.generation_size, color=(128, 128, 128))
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)
            image_data = buffer.read()
        
        # Process through pipeline
        processed_data = await self._asset_pipeline.process(
            image_data=image_data,
            asset_type=asset_type,
            context=context,
        )
        
        # Validate through QC gate
        passed, error, final_data = await self._qc_gate.validate(
            image_data=processed_data,
            asset_type=asset_type,
            expected_dimensions=spec.export_size,
        )
        
        if not passed:
            raise ValueError(f"QC validation failed: {error}")
        
        # Determine format
        export_format = self._asset_pipeline.get_export_format(asset_type)
        extension = export_format.lower()
        
        return PackAsset(
            id=str(uuid.uuid4()),
            asset_type=asset_type,
            image_data=final_data,
            filename=f"{asset_type}_{index}.{extension}",
            width=spec.export_size[0],
            height=spec.export_size[1],
            file_size=len(final_data),
            format=export_format,
        )


# Singleton instance
_pack_service: Optional[PackGenerationService] = None


def get_pack_service() -> PackGenerationService:
    """Get or create the pack generation service singleton."""
    global _pack_service
    if _pack_service is None:
        _pack_service = PackGenerationService()
    return _pack_service
