"""
Quick Create Service for Aurastream.

This service handles loading and building prompts for Quick Create templates.
Prompts are stored in YAML files and are PROPRIETARY - never exposed to frontend.

The frontend sends a special format: __quick_create__:template_id:vibe_id | field:value | ...
This service parses that and loads the actual prompt from YAML.
"""

import os
import re
from pathlib import Path
from typing import Optional

import yaml


class QuickCreateService:
    """
    Service for building Quick Create prompts from YAML templates.
    
    Templates are stored in backend/prompts/quick-create/{template_id}.yaml
    Each template has multiple "vibes" (style presets) with their own prompts.
    """
    
    # Pattern to detect Quick Create prompt format
    QUICK_CREATE_PATTERN = re.compile(r'^__quick_create__:([a-z-]+):([a-z0-9-]+)')
    
    # Sanitization patterns (same as PromptEngine)
    INJECTION_PATTERNS = [
        r'ignore\s+(previous|above|all)',
        r'disregard\s+(previous|above|all)',
        r'forget\s+(previous|above|all)',
        r'system\s*:',
        r'assistant\s*:',
        r'user\s*:',
    ]
    
    def __init__(self, prompts_dir: Optional[str] = None):
        """
        Initialize the Quick Create service.
        
        Args:
            prompts_dir: Directory containing quick-create templates.
                        Defaults to 'prompts/quick-create/'
        """
        self._prompts_dir = prompts_dir or os.environ.get(
            "QUICK_CREATE_PROMPTS_DIR",
            "prompts/quick-create/"
        )
        self._template_cache: dict[str, dict] = {}
    
    @property
    def prompts_dir(self) -> Path:
        """Get the prompts directory as a Path object."""
        base_path = Path(__file__).parent.parent
        return base_path / self._prompts_dir
    
    def is_quick_create_prompt(self, custom_prompt: str) -> bool:
        """
        Check if a custom_prompt is a Quick Create format.
        
        Args:
            custom_prompt: The custom prompt string from frontend
            
        Returns:
            True if this is a Quick Create prompt format
        """
        if not custom_prompt:
            return False
        return bool(self.QUICK_CREATE_PATTERN.match(custom_prompt))
    
    def parse_quick_create_prompt(self, custom_prompt: str) -> tuple[str, str, dict[str, str]]:
        """
        Parse a Quick Create prompt format into components.
        
        Format: __quick_create__:template_id:vibe_id | field1:value1 | field2:value2
        
        Args:
            custom_prompt: The Quick Create format string
            
        Returns:
            Tuple of (template_id, vibe_id, field_values dict)
            
        Raises:
            ValueError: If format is invalid
        """
        match = self.QUICK_CREATE_PATTERN.match(custom_prompt)
        if not match:
            raise ValueError("Invalid Quick Create prompt format")
        
        template_id = match.group(1)
        vibe_id = match.group(2)
        
        # Parse field values from remaining parts
        field_values: dict[str, str] = {}
        parts = custom_prompt.split(' | ')
        
        for part in parts[1:]:  # Skip the __quick_create__ part
            if ':' in part:
                key, value = part.split(':', 1)
                field_values[key.strip()] = value.strip()
        
        return template_id, vibe_id, field_values
    
    def load_template(self, template_id: str) -> dict:
        """
        Load a Quick Create template from YAML.
        
        Args:
            template_id: Template identifier (e.g., 'going-live')
            
        Returns:
            Template dict with vibes and placeholders
            
        Raises:
            FileNotFoundError: If template doesn't exist
            ValueError: If YAML is invalid
        """
        # Check cache
        if template_id in self._template_cache:
            return self._template_cache[template_id]
        
        # Validate template_id (prevent path traversal)
        if not re.match(r'^[a-z0-9-]+$', template_id):
            raise ValueError(f"Invalid template ID: {template_id}")
        
        template_path = self.prompts_dir / f"{template_id}.yaml"
        
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_id}")
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template = yaml.safe_load(f)
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in template {template_id}: {e}")
        
        # Cache it
        self._template_cache[template_id] = template
        
        return template
    
    def sanitize_value(self, value: str, max_length: int = 100) -> str:
        """
        Sanitize a user-provided field value.
        
        Args:
            value: Raw user input
            max_length: Maximum allowed length
            
        Returns:
            Sanitized value safe for prompt injection
        """
        if not value:
            return ""
        
        # Truncate
        result = value[:max_length]
        
        # Remove dangerous characters
        result = re.sub(r'[<>{}\[\]\\|`~]', '', result)
        
        # Remove injection patterns
        for pattern in self.INJECTION_PATTERNS:
            result = re.sub(pattern, '', result, flags=re.IGNORECASE)
        
        # Normalize whitespace
        result = ' '.join(result.split())
        
        return result.strip()
    
    def build_prompt(
        self,
        template_id: str,
        vibe_id: str,
        field_values: dict[str, str],
        brand_context: Optional[str] = None
    ) -> str:
        """
        Build the final prompt from template, vibe, and field values.
        
        Args:
            template_id: Template identifier
            vibe_id: Vibe preset identifier
            field_values: User-provided field values
            brand_context: Optional brand context block from BrandContextResolver
            
        Returns:
            Complete prompt string ready for AI generation
            
        Raises:
            FileNotFoundError: If template doesn't exist
            ValueError: If vibe doesn't exist in template
        """
        template = self.load_template(template_id)
        
        # Get the vibe's prompt
        vibes = template.get('vibes', {})
        if vibe_id not in vibes:
            raise ValueError(f"Vibe '{vibe_id}' not found in template '{template_id}'")
        
        vibe = vibes[vibe_id]
        prompt = vibe.get('prompt', '')
        
        # Get placeholder definitions for max_length
        placeholders = {p['name']: p for p in template.get('placeholders', [])}
        
        # Replace placeholders with sanitized values
        for field_id, value in field_values.items():
            placeholder_def = placeholders.get(field_id, {})
            max_length = placeholder_def.get('max_length', 100)
            default = placeholder_def.get('default', '')
            
            sanitized = self.sanitize_value(value, max_length) or default
            prompt = prompt.replace(f'{{{field_id}}}', sanitized)
        
        # Fill in any remaining placeholders with defaults
        for placeholder in placeholders.values():
            name = placeholder['name']
            default = placeholder.get('default', '')
            prompt = prompt.replace(f'{{{name}}}', default)
        
        # Clean up any unfilled placeholders
        prompt = re.sub(r'\{[^}]+\}', '', prompt)
        
        # Build final prompt with optional brand context
        parts = []
        
        # Add asset type instruction
        asset_type = template.get('asset_type', 'image')
        dimensions = template.get('dimensions', {})
        width = dimensions.get('width', 1080)
        height = dimensions.get('height', 1080)
        parts.append(f"Create a {asset_type} image ({width}x{height}).")
        
        # Add brand context if provided
        if brand_context:
            parts.append(brand_context)
        
        # Add the main prompt
        parts.append(prompt.strip())
        
        # Add quality modifiers
        quality_mods = template.get('quality_modifiers', [])
        if quality_mods:
            parts.append(f"Quality: {', '.join(quality_mods[:5])}")
        
        return '\n\n'.join(parts)
    
    def build_from_custom_prompt(
        self,
        custom_prompt: str,
        brand_context: Optional[str] = None
    ) -> str:
        """
        Build prompt from the frontend's custom_prompt format.
        
        This is the main entry point - parses the Quick Create format
        and builds the final prompt.
        
        Args:
            custom_prompt: Frontend format: __quick_create__:template:vibe | fields...
            brand_context: Optional brand context block
            
        Returns:
            Complete prompt string
        """
        template_id, vibe_id, field_values = self.parse_quick_create_prompt(custom_prompt)
        return self.build_prompt(template_id, vibe_id, field_values, brand_context)
    
    def clear_cache(self) -> None:
        """Clear the template cache."""
        self._template_cache.clear()


# Singleton instance
_quick_create_service: Optional[QuickCreateService] = None


def get_quick_create_service() -> QuickCreateService:
    """Get or create the Quick Create service singleton."""
    global _quick_create_service
    if _quick_create_service is None:
        _quick_create_service = QuickCreateService()
    return _quick_create_service
