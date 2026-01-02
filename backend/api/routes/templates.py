"""
Templates API - Serves Quick Create template metadata dynamically.

This endpoint exposes template fields and vibes to the frontend WITHOUT
exposing the actual prompts (which are proprietary).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from pathlib import Path

import yaml


router = APIRouter(tags=["templates"])


# ============================================================================
# Response Models
# ============================================================================

class FieldOption(BaseModel):
    """Option for select fields."""
    label: str
    value: str


class ColorPreset(BaseModel):
    """Color preset for color picker fields."""
    label: str
    value: str
    category: Optional[str] = None


class TemplateField(BaseModel):
    """Field definition for a template."""
    id: str
    label: str
    type: str  # text, select, color
    required: bool = False
    placeholder: Optional[str] = None
    hint: Optional[str] = None
    description: Optional[str] = None
    max_length: Optional[int] = None
    options: Optional[list[FieldOption]] = None
    default: Optional[str] = None
    show_for_vibes: Optional[list[str]] = None
    # For color type fields
    presets: Optional[list[ColorPreset]] = None
    show_presets: Optional[bool] = None


class VibeOption(BaseModel):
    """Vibe preset (style) for a template - NO prompt exposed."""
    id: str
    name: str
    description: Optional[str] = None


class TemplateMeta(BaseModel):
    """Template metadata - fields and vibes, NO prompts."""
    id: str
    name: str
    version: str
    category: str
    asset_type: str
    dimensions: dict
    fields: list[TemplateField]
    vibes: list[VibeOption]
    quality_modifiers: list[str] = []


class TemplateListResponse(BaseModel):
    """List of available templates."""
    templates: list[TemplateMeta]


# ============================================================================
# Template Loading
# ============================================================================

def get_prompts_dir() -> Path:
    """Get the prompts directory path."""
    base_path = Path(__file__).parent.parent.parent
    return base_path / "prompts" / "quick-create"


def load_template_meta(template_id: str) -> Optional[TemplateMeta]:
    """
    Load template metadata from YAML, stripping out prompts.
    
    Args:
        template_id: Template identifier (e.g., 'emote', 'thumbnail')
        
    Returns:
        TemplateMeta with fields and vibes, or None if not found
    """
    prompts_dir = get_prompts_dir()
    template_path = prompts_dir / f"{template_id}.yaml"
    
    if not template_path.exists():
        return None
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
    except Exception:
        return None
    
    # Extract fields from placeholders
    fields = []
    for placeholder in data.get('placeholders', []):
        field = TemplateField(
            id=placeholder.get('name', ''),
            label=placeholder.get('label', placeholder.get('name', '')),
            type=placeholder.get('type', 'text'),
            required=placeholder.get('required', False),
            placeholder=placeholder.get('placeholder'),
            hint=placeholder.get('hint'),
            description=placeholder.get('description'),
            max_length=placeholder.get('max_length'),
            default=str(placeholder.get('default', '')) if placeholder.get('default') is not None else None,
            show_for_vibes=placeholder.get('show_for_vibes'),
        )
        
        # Convert options
        if 'options' in placeholder:
            options = []
            for opt in placeholder['options']:
                if isinstance(opt, dict):
                    options.append(FieldOption(
                        label=opt.get('label', opt.get('value', '')),
                        value=opt.get('value', '')
                    ))
                else:
                    # Simple string option
                    options.append(FieldOption(label=str(opt), value=str(opt)))
            field.options = options
        
        # Handle color presets
        if 'presets' in placeholder:
            presets = []
            for preset in placeholder['presets']:
                presets.append(ColorPreset(
                    label=preset.get('label', ''),
                    value=preset.get('value', ''),
                    category=preset.get('category'),
                ))
            field.presets = presets
            field.show_presets = placeholder.get('show_presets', True)
        
        fields.append(field)
    
    # Extract vibes (without prompts!)
    vibes = []
    for vibe_id, vibe_data in data.get('vibes', {}).items():
        vibes.append(VibeOption(
            id=vibe_id,
            name=vibe_data.get('name', vibe_id),
            description=vibe_data.get('description'),
        ))
    
    return TemplateMeta(
        id=template_id,
        name=data.get('name', template_id),
        version=data.get('version', '1.0.0'),
        category=data.get('category', 'general'),
        asset_type=data.get('asset_type', template_id),
        dimensions=data.get('dimensions', {}),
        fields=fields,
        vibes=vibes,
        quality_modifiers=data.get('quality_modifiers', []),
    )


def list_all_templates() -> list[TemplateMeta]:
    """Load metadata for all available templates."""
    prompts_dir = get_prompts_dir()
    templates = []
    
    if not prompts_dir.exists():
        return templates
    
    for yaml_file in prompts_dir.glob("*.yaml"):
        template_id = yaml_file.stem
        meta = load_template_meta(template_id)
        if meta:
            templates.append(meta)
    
    return templates


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("", response_model=TemplateListResponse)
async def get_templates():
    """
    Get all available Quick Create templates with their fields and vibes.
    
    Returns template metadata including:
    - Fields with types, options, and validation rules
    - Vibes (style presets) with names and descriptions
    - Dimensions and asset type info
    
    NOTE: Prompts are NOT exposed - they are proprietary.
    """
    templates = list_all_templates()
    return TemplateListResponse(templates=templates)


@router.get("/{template_id}", response_model=TemplateMeta)
async def get_template(template_id: str):
    """
    Get a specific template's metadata.
    
    Args:
        template_id: Template identifier (e.g., 'emote', 'thumbnail')
        
    Returns:
        Template metadata with fields and vibes
        
    Raises:
        404: Template not found
    """
    meta = load_template_meta(template_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return meta
