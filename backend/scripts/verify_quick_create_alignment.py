#!/usr/bin/env python3
"""
Quick Create BE→FE Alignment Verification Script

This script verifies 100% alignment between:
1. Backend YAML templates (placeholders)
2. Frontend type definitions

Run from backend directory: python3 scripts/verify_quick_create_alignment.py
"""

import yaml
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
import sys


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class FieldOption:
    label: str
    value: str


@dataclass
class ColorPreset:
    label: str
    value: str
    category: Optional[str] = None


@dataclass
class TemplateField:
    id: str
    label: str
    type: str
    required: bool = False
    placeholder: Optional[str] = None
    hint: Optional[str] = None
    description: Optional[str] = None
    max_length: Optional[int] = None
    options: Optional[list] = None
    default: Optional[str] = None
    show_for_vibes: Optional[list] = None
    presets: Optional[list] = None
    show_presets: Optional[bool] = None


@dataclass
class VibeOption:
    id: str
    name: str
    description: Optional[str] = None


@dataclass
class TemplateMeta:
    id: str
    name: str
    version: str
    category: str
    asset_type: str
    dimensions: dict
    fields: list
    vibes: list
    quality_modifiers: list = None


# ============================================================================
# Expected Data (from audit)
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

# Frontend supported field types
FRONTEND_FIELD_TYPES = {"text", "select", "color", "dynamic_select", "time"}


# ============================================================================
# Template Loading
# ============================================================================

def get_prompts_dir() -> Path:
    """Get the prompts directory path."""
    return Path(__file__).parent.parent / "prompts" / "quick-create"


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


def list_all_templates() -> list:
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
# Verification Functions
# ============================================================================

def verify_all_templates_exist() -> tuple[bool, list]:
    """Verify all 10 expected templates exist."""
    templates = list_all_templates()
    template_ids = {t.id for t in templates}
    expected_ids = set(EXPECTED_TEMPLATES.keys())
    
    missing = expected_ids - template_ids
    extra = template_ids - expected_ids
    
    errors = []
    if missing:
        errors.append(f"Missing templates: {missing}")
    if extra:
        errors.append(f"Extra templates (not in expected): {extra}")
    
    return len(errors) == 0, errors


def verify_fields_present(template_id: str, expected: dict) -> tuple[bool, list]:
    """Verify all expected fields are present."""
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    field_ids = {f.id for f in meta.fields}
    expected_fields = set(expected["fields"])
    
    missing = expected_fields - field_ids
    errors = []
    if missing:
        errors.append(f"Missing fields: {missing}")
    
    return len(errors) == 0, errors


def verify_field_types(template_id: str, expected: dict) -> tuple[bool, list]:
    """Verify field types match expected."""
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    field_map = {f.id: f for f in meta.fields}
    errors = []
    
    for field_id, expected_type in expected["field_types"].items():
        if field_id not in field_map:
            errors.append(f"Field '{field_id}' not found")
            continue
        actual_type = field_map[field_id].type
        if actual_type != expected_type:
            errors.append(f"Field '{field_id}': expected type '{expected_type}', got '{actual_type}'")
    
    return len(errors) == 0, errors


def verify_required_fields(template_id: str, expected: dict) -> tuple[bool, list]:
    """Verify required fields are marked correctly."""
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    field_map = {f.id: f for f in meta.fields}
    errors = []
    
    for field_id in expected["required_fields"]:
        if field_id not in field_map:
            errors.append(f"Required field '{field_id}' not found")
            continue
        if not field_map[field_id].required:
            errors.append(f"Field '{field_id}' should be required but isn't")
    
    return len(errors) == 0, errors


def verify_vibes(template_id: str, expected: dict) -> tuple[bool, list]:
    """Verify all expected vibes are present."""
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    vibe_ids = {v.id for v in meta.vibes}
    expected_vibes = set(expected["vibes"])
    
    missing = expected_vibes - vibe_ids
    errors = []
    if missing:
        errors.append(f"Missing vibes: {missing}")
    
    return len(errors) == 0, errors


def verify_select_options(template_id: str) -> tuple[bool, list]:
    """Verify select fields have options."""
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    errors = []
    for field in meta.fields:
        if field.type == "select":
            if not field.options:
                errors.append(f"Select field '{field.id}' has no options")
            elif len(field.options) == 0:
                errors.append(f"Select field '{field.id}' has empty options")
    
    return len(errors) == 0, errors


def verify_panel_options() -> tuple[bool, list]:
    """Verify panel has all 8 type options."""
    meta = load_template_meta("panel")
    if not meta:
        return False, ["Panel template failed to load"]
    
    type_field = next((f for f in meta.fields if f.id == "type"), None)
    if not type_field:
        return False, ["Panel template missing 'type' field"]
    
    option_values = {o.value for o in type_field.options}
    expected = {"about", "schedule", "rules", "donate", "discord", "socials", "faq", "commands"}
    
    missing = expected - option_values
    errors = []
    if missing:
        errors.append(f"Panel type missing options: {missing}")
    
    return len(errors) == 0, errors


def verify_logo_color_field() -> tuple[bool, list]:
    """Verify logo has color field with presets."""
    meta = load_template_meta("logo")
    if not meta:
        return False, ["Logo template failed to load"]
    
    bg_field = next((f for f in meta.fields if f.id == "background_color"), None)
    errors = []
    
    if not bg_field:
        errors.append("Logo template missing 'background_color' field")
        return False, errors
    
    if bg_field.type != "color":
        errors.append(f"Expected type 'color', got '{bg_field.type}'")
    
    if not bg_field.presets:
        errors.append("Color field should have presets")
    elif len(bg_field.presets) < 10:
        errors.append(f"Expected 10+ presets, got {len(bg_field.presets)}")
    
    if bg_field.show_presets is not True:
        errors.append("show_presets should be True")
    
    # Check preset categories
    if bg_field.presets:
        categories = {p.category for p in bg_field.presets if p.category}
        if "dark" not in categories:
            errors.append("Should have 'dark' category presets")
        if "vibrant" not in categories:
            errors.append("Should have 'vibrant' category presets")
        
        # Check hex format
        for preset in bg_field.presets:
            if not preset.value.startswith("#"):
                errors.append(f"Preset value should be hex: {preset.value}")
    
    return len(errors) == 0, errors


def verify_conditional_fields(template_id: str, expected: dict) -> tuple[bool, list]:
    """Verify conditional fields have show_for_vibes set."""
    if "conditional_fields" not in expected:
        return True, []
    
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    field_map = {f.id: f for f in meta.fields}
    errors = []
    
    for field_id, expected_vibes in expected["conditional_fields"].items():
        if field_id not in field_map:
            errors.append(f"Conditional field '{field_id}' not found")
            continue
        
        field = field_map[field_id]
        if not field.show_for_vibes:
            errors.append(f"Field '{field_id}' should have show_for_vibes")
        elif set(field.show_for_vibes) != set(expected_vibes):
            errors.append(f"Field '{field_id}' show_for_vibes mismatch: expected {expected_vibes}, got {field.show_for_vibes}")
    
    return len(errors) == 0, errors


def verify_frontend_type_compatibility(template_id: str) -> tuple[bool, list]:
    """Verify field types are frontend-compatible."""
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    errors = []
    for field in meta.fields:
        if field.type not in FRONTEND_FIELD_TYPES:
            errors.append(f"Field '{field.id}' has unsupported type '{field.type}'")
    
    return len(errors) == 0, errors


def verify_no_prompt_exposure(template_id: str) -> tuple[bool, list]:
    """Verify vibes don't expose prompts."""
    meta = load_template_meta(template_id)
    if not meta:
        return False, [f"Template '{template_id}' failed to load"]
    
    errors = []
    for vibe in meta.vibes:
        if hasattr(vibe, 'prompt'):
            errors.append(f"Vibe '{vibe.id}' should not expose prompt")
    
    return len(errors) == 0, errors


# ============================================================================
# Main Verification
# ============================================================================

def run_verification():
    """Run all verification checks and print report."""
    print("\n" + "=" * 70)
    print("🔍 QUICK CREATE BE→FE ALIGNMENT VERIFICATION")
    print("=" * 70)
    
    all_passed = True
    total_checks = 0
    passed_checks = 0
    
    # Check all templates exist
    print("\n📋 Checking all templates exist...")
    passed, errors = verify_all_templates_exist()
    total_checks += 1
    if passed:
        passed_checks += 1
        print("   ✅ All 10 templates found")
    else:
        all_passed = False
        for e in errors:
            print(f"   ❌ {e}")
    
    # Per-template checks
    for template_id, expected in EXPECTED_TEMPLATES.items():
        print(f"\n📦 Template: {template_id}")
        
        # Fields present
        passed, errors = verify_fields_present(template_id, expected)
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"   ✅ All {len(expected['fields'])} fields present")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
        
        # Field types
        passed, errors = verify_field_types(template_id, expected)
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"   ✅ Field types correct")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
        
        # Required fields
        passed, errors = verify_required_fields(template_id, expected)
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"   ✅ Required fields marked correctly")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
        
        # Vibes
        passed, errors = verify_vibes(template_id, expected)
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"   ✅ All {len(expected['vibes'])} vibes present")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
        
        # Select options
        passed, errors = verify_select_options(template_id)
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"   ✅ Select fields have options")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
        
        # Conditional fields
        passed, errors = verify_conditional_fields(template_id, expected)
        total_checks += 1
        if passed:
            passed_checks += 1
            if "conditional_fields" in expected:
                print(f"   ✅ Conditional fields have show_for_vibes")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
        
        # Frontend compatibility
        passed, errors = verify_frontend_type_compatibility(template_id)
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"   ✅ Frontend type compatible")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
        
        # No prompt exposure
        passed, errors = verify_no_prompt_exposure(template_id)
        total_checks += 1
        if passed:
            passed_checks += 1
            print(f"   ✅ No prompts exposed")
        else:
            all_passed = False
            for e in errors:
                print(f"   ❌ {e}")
    
    # Special checks
    print("\n🎨 Special Checks:")
    
    # Panel options
    passed, errors = verify_panel_options()
    total_checks += 1
    if passed:
        passed_checks += 1
        print("   ✅ Panel has all 8 type options")
    else:
        all_passed = False
        for e in errors:
            print(f"   ❌ {e}")
    
    # Logo color field
    passed, errors = verify_logo_color_field()
    total_checks += 1
    if passed:
        passed_checks += 1
        print("   ✅ Logo has color field with presets")
    else:
        all_passed = False
        for e in errors:
            print(f"   ❌ {e}")
    
    # Summary
    print("\n" + "=" * 70)
    print(f"📊 SUMMARY: {passed_checks}/{total_checks} checks passed")
    
    if all_passed:
        print("✅ ALL CHECKS PASSED - BE→FE alignment is 100%")
        print("=" * 70 + "\n")
        return 0
    else:
        print("❌ SOME CHECKS FAILED - Review errors above")
        print("=" * 70 + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(run_verification())
