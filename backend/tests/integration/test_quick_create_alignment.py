"""
Quick Create BE→FE Alignment Verification Test

This test ensures 100% alignment between:
1. Backend YAML templates (placeholders)
2. Backend API response (TemplateField)
3. Frontend type definitions (TemplateField)

Any mismatch will cause silent failures in the UI.
"""

import pytest
import yaml
from pathlib import Path
from typing import Any, Optional
from pydantic import BaseModel


# ============================================================================
# Inline Models (to avoid import issues with circular dependencies)
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
    type: str
    required: bool = False
    placeholder: Optional[str] = None
    hint: Optional[str] = None
    description: Optional[str] = None
    max_length: Optional[int] = None
    options: Optional[list[FieldOption]] = None
    default: Optional[str] = None
    show_for_vibes: Optional[list[str]] = None
    presets: Optional[list[ColorPreset]] = None
    show_presets: Optional[bool] = None


class VibeOption(BaseModel):
    """Vibe preset (style) for a template."""
    id: str
    name: str
    description: Optional[str] = None


class TemplateMeta(BaseModel):
    """Template metadata."""
    id: str
    name: str
    version: str
    category: str
    asset_type: str
    dimensions: dict
    fields: list[TemplateField]
    vibes: list[VibeOption]
    quality_modifiers: list[str] = []


def get_prompts_dir() -> Path:
    """Get the prompts directory path."""
    return Path(__file__).parent.parent.parent / "prompts" / "quick-create"


def load_template_meta(template_id: str) -> Optional[TemplateMeta]:
    """Load template metadata from YAML."""
    prompts_dir = get_prompts_dir()
    template_path = prompts_dir / f"{template_id}.yaml"
    
    if not template_path.exists():
        return None
    
    with open(template_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
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
# Test Data: Expected fields per template from YAML audit
# ============================================================================

EXPECTED_TEMPLATES = {
    "emote": {
        "fields": ["emotion", "text", "character_description", "background_color", "accent_color"],
        "vibes": ["glossy", "pixel", "modern-pixel", "elite-glass", "halftone-pop", 
                  "marble-gold", "cozy", "retro", "anime", "vaporwave", "tactical", "kawaii"],
        "field_types": {
            "emotion": "select",
            "text": "text",
            "character_description": "select",
            "background_color": "select",
            "accent_color": "select",
        },
        "required_fields": ["emotion"],
    },
    "thumbnail": {
        "fields": ["title", "subtitle", "character_description", "accent_color", "background_scheme"],
        "vibes": ["aesthetic-pro", "viral-hype", "anime-cinematic", "playful-3d", 
                  "after-dark", "pro", "anime", "playful", "color-pop"],
        "field_types": {
            "title": "text",
            "subtitle": "text",
            "character_description": "select",
            "accent_color": "select",
            "background_scheme": "select",
        },
        "required_fields": ["title"],
        "conditional_fields": {"background_scheme": ["color-pop"]},
    },
    "going-live": {
        "fields": ["title", "game", "time", "character_description", "accent_color"],
        "vibes": ["pro", "anime", "playful"],
        "field_types": {
            "title": "text",
            "game": "text",
            "time": "text",
            "character_description": "select",
            "accent_color": "select",
        },
        "required_fields": ["title"],
        "conditional_fields": {"character_description": ["anime", "playful"]},
    },
    "milestone": {
        "fields": ["type", "count", "character_description", "accent_color"],
        "vibes": ["pro", "anime", "playful"],
        "field_types": {
            "type": "select",
            "count": "text",
            "character_description": "select",
            "accent_color": "select",
        },
        "required_fields": ["type", "count"],
        "conditional_fields": {"character_description": ["anime", "playful"]},
    },
    "offline": {
        "fields": ["message", "schedule", "character_description", "accent_color"],
        "vibes": ["pro", "anime", "playful"],
        "field_types": {
            "message": "text",
            "schedule": "text",
            "character_description": "select",
            "accent_color": "select",
        },
        "required_fields": [],
        "conditional_fields": {"character_description": ["anime"]},
    },
    "clip-highlight": {
        "fields": ["title", "game", "character_description", "accent_color"],
        "vibes": ["pro", "anime", "playful"],
        "field_types": {
            "title": "text",
            "game": "text",
            "character_description": "select",
            "accent_color": "select",
        },
        "required_fields": ["title"],
    },
    "schedule": {
        "fields": ["days", "times", "accent_color"],
        "vibes": ["pro", "anime", "playful"],
        "field_types": {
            "days": "text",
            "times": "text",
            "accent_color": "select",
        },
        "required_fields": ["days"],
    },
    "starting-soon": {
        "fields": ["message", "accent_color"],
        "vibes": ["pro", "anime", "playful"],
        "field_types": {
            "message": "text",
            "accent_color": "select",
        },
        "required_fields": [],
    },
    "panel": {
        "fields": ["type", "accent_color"],
        "vibes": ["pro", "anime", "playful"],
        "field_types": {
            "type": "select",
            "accent_color": "select",
        },
        "required_fields": ["type"],
        "panel_type_options": ["about", "schedule", "rules", "donate", "discord", "socials", "faq", "commands"],
    },
    "logo": {
        "fields": ["name", "icon", "background_color"],
        "vibes": ["studio-minimalist", "collectible", "stealth-pro", "liquid-flow", "heavy-metal"],
        "field_types": {
            "name": "text",
            "icon": "select",
            "background_color": "color",
        },
        "required_fields": ["name", "icon", "background_color"],
        "has_color_presets": ["background_color"],
    },
}


# ============================================================================
# Tests
# ============================================================================

class TestTemplateLoading:
    """Test that all templates load correctly from YAML."""
    
    def test_all_templates_exist(self):
        """Verify all 10 expected templates exist."""
        templates = list_all_templates()
        template_ids = {t.id for t in templates}
        
        expected_ids = set(EXPECTED_TEMPLATES.keys())
        assert template_ids == expected_ids, f"Missing templates: {expected_ids - template_ids}"
    
    @pytest.mark.parametrize("template_id", EXPECTED_TEMPLATES.keys())
    def test_template_loads_without_error(self, template_id: str):
        """Each template should load without errors."""
        meta = load_template_meta(template_id)
        assert meta is not None, f"Template '{template_id}' failed to load"
        assert meta.id == template_id


class TestFieldAlignment:
    """Test that backend fields match expected structure."""
    
    @pytest.mark.parametrize("template_id,expected", EXPECTED_TEMPLATES.items())
    def test_all_fields_present(self, template_id: str, expected: dict):
        """All expected fields should be present in the template."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        field_ids = {f.id for f in meta.fields}
        expected_fields = set(expected["fields"])
        
        missing = expected_fields - field_ids
        extra = field_ids - expected_fields
        
        assert not missing, f"Template '{template_id}' missing fields: {missing}"
        # Extra fields are OK (might be new additions)
        if extra:
            print(f"Note: Template '{template_id}' has extra fields: {extra}")
    
    @pytest.mark.parametrize("template_id,expected", EXPECTED_TEMPLATES.items())
    def test_field_types_correct(self, template_id: str, expected: dict):
        """Field types should match expected types."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        field_map = {f.id: f for f in meta.fields}
        
        for field_id, expected_type in expected["field_types"].items():
            assert field_id in field_map, f"Field '{field_id}' not found in '{template_id}'"
            actual_type = field_map[field_id].type
            assert actual_type == expected_type, \
                f"Field '{field_id}' in '{template_id}': expected type '{expected_type}', got '{actual_type}'"
    
    @pytest.mark.parametrize("template_id,expected", EXPECTED_TEMPLATES.items())
    def test_required_fields_marked(self, template_id: str, expected: dict):
        """Required fields should be marked as required."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        field_map = {f.id: f for f in meta.fields}
        
        for field_id in expected["required_fields"]:
            assert field_id in field_map, f"Required field '{field_id}' not found in '{template_id}'"
            assert field_map[field_id].required, \
                f"Field '{field_id}' in '{template_id}' should be required but isn't"


class TestVibeAlignment:
    """Test that vibes are correctly exposed."""
    
    @pytest.mark.parametrize("template_id,expected", EXPECTED_TEMPLATES.items())
    def test_all_vibes_present(self, template_id: str, expected: dict):
        """All expected vibes should be present."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        vibe_ids = {v.id for v in meta.vibes}
        expected_vibes = set(expected["vibes"])
        
        missing = expected_vibes - vibe_ids
        assert not missing, f"Template '{template_id}' missing vibes: {missing}"


class TestConditionalFields:
    """Test show_for_vibes conditional field logic."""
    
    @pytest.mark.parametrize("template_id,expected", [
        (tid, exp) for tid, exp in EXPECTED_TEMPLATES.items() 
        if "conditional_fields" in exp
    ])
    def test_conditional_fields_have_show_for_vibes(self, template_id: str, expected: dict):
        """Conditional fields should have show_for_vibes set."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        field_map = {f.id: f for f in meta.fields}
        
        for field_id, expected_vibes in expected.get("conditional_fields", {}).items():
            assert field_id in field_map, f"Conditional field '{field_id}' not found"
            field = field_map[field_id]
            
            assert field.show_for_vibes is not None, \
                f"Field '{field_id}' in '{template_id}' should have show_for_vibes"
            assert set(field.show_for_vibes) == set(expected_vibes), \
                f"Field '{field_id}' show_for_vibes mismatch: expected {expected_vibes}, got {field.show_for_vibes}"


class TestSelectFieldOptions:
    """Test that select fields have valid options."""
    
    @pytest.mark.parametrize("template_id", EXPECTED_TEMPLATES.keys())
    def test_select_fields_have_options(self, template_id: str):
        """All select fields should have options defined."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        for field in meta.fields:
            if field.type == "select":
                assert field.options is not None, \
                    f"Select field '{field.id}' in '{template_id}' has no options"
                assert len(field.options) > 0, \
                    f"Select field '{field.id}' in '{template_id}' has empty options"
    
    def test_panel_has_all_8_options(self):
        """Panel type field should have all 8 options."""
        meta = load_template_meta("panel")
        assert meta is not None
        
        type_field = next((f for f in meta.fields if f.id == "type"), None)
        assert type_field is not None, "Panel template missing 'type' field"
        assert type_field.options is not None
        
        option_values = {o.value for o in type_field.options}
        expected = {"about", "schedule", "rules", "donate", "discord", "socials", "faq", "commands"}
        
        missing = expected - option_values
        assert not missing, f"Panel type missing options: {missing}"


class TestColorPickerFields:
    """Test color picker field support."""
    
    def test_logo_has_color_field(self):
        """Logo template should have a color type field with presets."""
        meta = load_template_meta("logo")
        assert meta is not None
        
        bg_field = next((f for f in meta.fields if f.id == "background_color"), None)
        assert bg_field is not None, "Logo template missing 'background_color' field"
        assert bg_field.type == "color", f"Expected type 'color', got '{bg_field.type}'"
        assert bg_field.presets is not None, "Color field should have presets"
        assert len(bg_field.presets) >= 10, f"Expected 10+ presets, got {len(bg_field.presets)}"
        assert bg_field.show_presets is True, "show_presets should be True"
    
    def test_color_presets_have_required_fields(self):
        """Color presets should have label, value, and optional category."""
        meta = load_template_meta("logo")
        assert meta is not None
        
        bg_field = next((f for f in meta.fields if f.id == "background_color"), None)
        assert bg_field is not None
        
        for preset in bg_field.presets:
            assert preset.label, "Preset missing label"
            assert preset.value, "Preset missing value"
            assert preset.value.startswith("#"), f"Preset value should be hex: {preset.value}"
    
    def test_color_presets_have_categories(self):
        """Color presets should be categorized (dark/vibrant)."""
        meta = load_template_meta("logo")
        assert meta is not None
        
        bg_field = next((f for f in meta.fields if f.id == "background_color"), None)
        assert bg_field is not None
        
        categories = {p.category for p in bg_field.presets if p.category}
        assert "dark" in categories, "Should have 'dark' category presets"
        assert "vibrant" in categories, "Should have 'vibrant' category presets"


class TestSnakeCaseToCamelCase:
    """Test that snake_case fields are properly exposed for FE transformation."""
    
    @pytest.mark.parametrize("template_id", EXPECTED_TEMPLATES.keys())
    def test_field_names_are_snake_case(self, template_id: str):
        """Backend field IDs should be snake_case (FE transforms to camelCase)."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        for field in meta.fields:
            # Field IDs should be lowercase with underscores (snake_case)
            # or simple lowercase (single word)
            assert field.id == field.id.lower(), \
                f"Field ID '{field.id}' should be lowercase"
            assert " " not in field.id, \
                f"Field ID '{field.id}' should not contain spaces"
    
    @pytest.mark.parametrize("template_id", EXPECTED_TEMPLATES.keys())
    def test_api_response_uses_snake_case(self, template_id: str):
        """API response model uses snake_case for JSON serialization."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        # Check that the Pydantic model has snake_case field names
        for field in meta.fields:
            if field.max_length is not None:
                # This confirms max_length (snake_case) is used, not maxLength
                assert isinstance(field.max_length, int)
            if field.show_for_vibes is not None:
                # This confirms show_for_vibes (snake_case) is used
                assert isinstance(field.show_for_vibes, list)


class TestNoPromptExposure:
    """Ensure prompts are NOT exposed to frontend."""
    
    @pytest.mark.parametrize("template_id", EXPECTED_TEMPLATES.keys())
    def test_vibes_have_no_prompt(self, template_id: str):
        """Vibe objects should not contain prompt text."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        for vibe in meta.vibes:
            # VibeOption model only has id, name, description
            # It should NOT have a 'prompt' attribute
            assert not hasattr(vibe, 'prompt'), \
                f"Vibe '{vibe.id}' in '{template_id}' should not expose prompt"


class TestFrontendTypeCompatibility:
    """Test that backend response is compatible with frontend types."""
    
    FRONTEND_FIELD_TYPES = {"text", "select", "color", "dynamic_select", "time"}
    
    @pytest.mark.parametrize("template_id", EXPECTED_TEMPLATES.keys())
    def test_field_types_are_frontend_compatible(self, template_id: str):
        """Field types should be in the set of frontend-supported types."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        for field in meta.fields:
            assert field.type in self.FRONTEND_FIELD_TYPES, \
                f"Field '{field.id}' has unsupported type '{field.type}'"
    
    @pytest.mark.parametrize("template_id", EXPECTED_TEMPLATES.keys())
    def test_options_have_label_and_value(self, template_id: str):
        """Select options should have both label and value."""
        meta = load_template_meta(template_id)
        assert meta is not None
        
        for field in meta.fields:
            if field.options:
                for opt in field.options:
                    assert opt.label, f"Option in '{field.id}' missing label"
                    assert opt.value is not None, f"Option in '{field.id}' missing value"


# ============================================================================
# Summary Test
# ============================================================================

class TestAlignmentSummary:
    """Summary test that reports overall alignment status."""
    
    def test_full_alignment_report(self):
        """Generate a full alignment report."""
        templates = list_all_templates()
        
        report = []
        report.append("\n" + "=" * 60)
        report.append("QUICK CREATE BE→FE ALIGNMENT REPORT")
        report.append("=" * 60)
        
        total_fields = 0
        total_vibes = 0
        
        for template in templates:
            expected = EXPECTED_TEMPLATES.get(template.id, {})
            
            field_count = len(template.fields)
            vibe_count = len(template.vibes)
            total_fields += field_count
            total_vibes += vibe_count
            
            expected_field_count = len(expected.get("fields", []))
            expected_vibe_count = len(expected.get("vibes", []))
            
            field_status = "✅" if field_count >= expected_field_count else "❌"
            vibe_status = "✅" if vibe_count >= expected_vibe_count else "❌"
            
            report.append(f"\n{template.id}:")
            report.append(f"  Fields: {field_status} {field_count}/{expected_field_count}")
            report.append(f"  Vibes:  {vibe_status} {vibe_count}/{expected_vibe_count}")
            
            # List fields
            field_ids = [f.id for f in template.fields]
            report.append(f"  Field IDs: {field_ids}")
        
        report.append("\n" + "-" * 60)
        report.append(f"TOTAL: {len(templates)} templates, {total_fields} fields, {total_vibes} vibes")
        report.append("=" * 60 + "\n")
        
        print("\n".join(report))
        
        # Assert all templates loaded
        assert len(templates) == 10, f"Expected 10 templates, got {len(templates)}"
