"""
Twitch Asset Services Package

This package contains services for Twitch asset generation including:
- Dimension specifications for various asset types
- Context engine for gathering generation context
- Game metadata service
- Asset generation pipelines
- Pack generation workflows
"""

from .dimensions import (
    DimensionSpec,
    DIMENSION_SPECS,
    ASSET_TYPE_DIRECTIVES,
    get_dimension_spec,
    get_asset_directive,
    get_all_twitch_asset_types,
)
from .context_engine import GenerationContext, ContextEngine, get_context_engine
from .game_meta import GameMetaService, get_game_meta_service
from .prompt_constructor import PromptConstructor
from .asset_pipeline import AssetPipeline
from .qc_gate import QCGate
from .pack_service import PackAsset, AssetPack, PackGenerationService, get_pack_service

__all__ = [
    # Dimensions
    "DimensionSpec",
    "DIMENSION_SPECS",
    "ASSET_TYPE_DIRECTIVES",
    "get_dimension_spec",
    "get_asset_directive",
    "get_all_twitch_asset_types",
    # Context Engine
    "GenerationContext",
    "ContextEngine",
    "get_context_engine",
    # Game Meta
    "GameMetaService",
    "get_game_meta_service",
    # Prompt Constructor
    "PromptConstructor",
    # Asset Pipeline
    "AssetPipeline",
    # QC Gate
    "QCGate",
    # Pack Service
    "PackAsset",
    "AssetPack",
    "PackGenerationService",
    "get_pack_service",
]
