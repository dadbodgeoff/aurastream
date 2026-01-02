"""
Creator Media Library Placement Formatter.

Converts visual placement geometry into natural language prompt instructions
for the image generation model (Nano Banana).
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PlacementData:
    """Placement data for a single asset."""
    asset_id: str
    display_name: str
    asset_type: str
    url: str
    x: float  # 0-100 percentage
    y: float  # 0-100 percentage
    width: float  # percentage or pixels
    height: float  # percentage or pixels
    size_unit: str  # 'percent' or 'px'
    z_index: int
    rotation: float  # degrees
    opacity: float  # 0-100


# Region name mapping based on position
REGION_NAMES = {
    ('top', 'left'): 'top-left corner',
    ('top', 'center'): 'top center',
    ('top', 'right'): 'top-right corner',
    ('center', 'left'): 'left side',
    ('center', 'center'): 'center',
    ('center', 'right'): 'right side',
    ('bottom', 'left'): 'bottom-left corner',
    ('bottom', 'center'): 'bottom center',
    ('bottom', 'right'): 'bottom-right corner',
}


def get_region_name(x: float, y: float) -> str:
    """
    Convert percentage coordinates to human-readable region name.
    
    Args:
        x: X position as percentage (0-100)
        y: Y position as percentage (0-100)
        
    Returns:
        Human-readable region name
    """
    # Determine column
    if x < 33:
        col = 'left'
    elif x > 66:
        col = 'right'
    else:
        col = 'center'
    
    # Determine row
    if y < 33:
        row = 'top'
    elif y > 66:
        row = 'bottom'
    else:
        row = 'center'
    
    return REGION_NAMES.get((row, col), 'center')


def get_size_description(width: float, height: float, unit: str) -> str:
    """
    Generate human-readable size description.
    
    Args:
        width: Width value
        height: Height value
        unit: 'percent' or 'px'
        
    Returns:
        Size description string
    """
    if unit == 'px':
        return f"{int(width)}×{int(height)} pixels"
    
    # Percentage-based descriptions
    if width < 10:
        return "very small"
    elif width < 20:
        return "small"
    elif width < 35:
        return "medium-sized"
    elif width < 50:
        return "large"
    else:
        return "very large"


def format_single_placement(placement: PlacementData, image_index: int) -> str:
    """
    Format a single asset placement into prompt text.
    
    References the image by index (e.g., "Image 1") since the actual image
    data is attached separately to the Gemini request.
    
    Args:
        placement: PlacementData object
        image_index: 1-based index of this image in the attached images
        
    Returns:
        Formatted prompt instruction
    """
    region = get_region_name(placement.x, placement.y)
    size_desc = get_size_description(placement.width, placement.height, placement.size_unit)
    asset_type_display = placement.asset_type.replace('_', ' ')
    
    # Build the instruction - reference by image index, not URL
    parts = [f"Image {image_index} is the user's {asset_type_display} '{placement.display_name}'."]
    parts.append(f"Place it in the {region}")
    parts.append(f"(x: {placement.x:.0f}%, y: {placement.y:.0f}%)")
    
    # Size
    if placement.size_unit == 'px':
        parts.append(f"at {int(placement.width)}×{int(placement.height)} pixels")
    else:
        parts.append(f"at {size_desc} scale ({placement.width:.0f}% of canvas width)")
    
    # Rotation (only if non-zero)
    if placement.rotation != 0:
        parts.append(f"rotated {placement.rotation:.0f}°")
    
    # Opacity (only if not fully opaque)
    if placement.opacity < 100:
        parts.append(f"at {placement.opacity:.0f}% opacity")
    
    return " ".join(parts)


def format_layer_order(placements: List[PlacementData]) -> str:
    """
    Generate layer ordering instructions.
    
    Args:
        placements: List of placements sorted by z_index
        
    Returns:
        Layer order instruction string
    """
    if len(placements) <= 1:
        return ""
    
    sorted_placements = sorted(placements, key=lambda p: p.z_index)
    order_parts = [f"'{p.display_name}'" for p in sorted_placements]
    
    return f"Layer order (back to front): {' → '.join(order_parts)}."


class PlacementFormatter:
    """
    Formats asset placements into prompt instructions.
    
    Converts visual placement data (coordinates, sizes, layers) into
    natural language that the image generation model can understand.
    
    The actual image data is attached separately to the Gemini request.
    This formatter creates text that references images by index.
    """
    
    def format_placements(
        self,
        placements: List[Dict[str, Any]],
        canvas_width: int,
        canvas_height: int,
    ) -> str:
        """
        Format multiple placements into a complete prompt section.
        
        References attached images by index (Image 1, Image 2, etc.).
        The actual image bytes must be attached separately to the generation request.
        
        Args:
            placements: List of placement dictionaries from frontend
            canvas_width: Target canvas width in pixels
            canvas_height: Target canvas height in pixels
            
        Returns:
            Formatted prompt section string
        """
        if not placements:
            return ""
        
        # Convert to PlacementData objects
        # Support both camelCase (from frontend) and snake_case (from Pydantic model_dump)
        placement_objects = []
        for p in placements:
            placement_objects.append(PlacementData(
                asset_id=p.get('assetId') or p.get('asset_id', ''),
                display_name=p.get('displayName') or p.get('display_name', 'asset'),
                asset_type=p.get('assetType') or p.get('asset_type', 'image'),
                url=p.get('url', ''),
                x=float(p.get('x', 50)),
                y=float(p.get('y', 50)),
                width=float(p.get('width', 20)),
                height=float(p.get('height', 20)),
                size_unit=p.get('sizeUnit') or p.get('size_unit', 'percent'),
                z_index=int(p.get('zIndex') or p.get('z_index', 1)),
                rotation=float(p.get('rotation', 0)),
                opacity=float(p.get('opacity', 100)),
            ))
        
        # Sort by z-index for consistent ordering
        sorted_placements = sorted(placement_objects, key=lambda p: p.z_index)
        
        # Build prompt section
        lines = [
            "## User Asset Placement",
            f"Canvas dimensions: {canvas_width}×{canvas_height} pixels",
            "",
            "The following user-provided images are attached to this request.",
            "Place each one EXACTLY as specified - use the actual attached image, do not recreate or redraw it:",
            "",
        ]
        
        # Add individual placement instructions with image index
        for idx, placement in enumerate(sorted_placements, start=1):
            lines.append(f"- {format_single_placement(placement, idx)}")
        
        # Add layer order if multiple assets
        layer_order = format_layer_order(sorted_placements)
        if layer_order:
            lines.append("")
            lines.append(layer_order)
        
        lines.append("")
        lines.append("IMPORTANT: Use the EXACT attached images. Do not generate, recreate, or modify them.")
        lines.append("Simply place them at the specified positions and sizes on the generated image.")
        
        return "\n".join(lines)
    
    def format_simple(
        self,
        placements: List[Dict[str, Any]],
    ) -> str:
        """
        Format placements into a simpler, more concise prompt.
        
        Args:
            placements: List of placement dictionaries
            
        Returns:
            Concise prompt string
        """
        if not placements:
            return ""
        
        parts = []
        for p in placements:
            region = get_region_name(
                float(p.get('x', 50)),
                float(p.get('y', 50))
            )
            name = p.get('displayName', 'asset')
            asset_type = p.get('assetType', 'image').replace('_', ' ')
            
            parts.append(f"Include {asset_type} '{name}' in the {region}")
        
        return ". ".join(parts) + "."


# ============================================================================
# Singleton
# ============================================================================

_placement_formatter: Optional[PlacementFormatter] = None


def get_placement_formatter() -> PlacementFormatter:
    """Get or create placement formatter singleton."""
    global _placement_formatter
    if _placement_formatter is None:
        _placement_formatter = PlacementFormatter()
    return _placement_formatter
