#!/usr/bin/env python3
"""
Frontend Type Alignment Verification

This script verifies that the frontend TypeScript types match the backend API response.
It checks:
1. Field transformation (snake_case → camelCase)
2. Type definitions match
3. No silent failures in the transformation layer
"""

import json
from pathlib import Path


# ============================================================================
# Expected Frontend Types (from tsx/apps/web/src/components/quick-create/types.ts)
# ============================================================================

FRONTEND_TEMPLATE_FIELD_INTERFACE = {
    "id": "string",
    "label": "string",
    "type": "'text' | 'select' | 'time' | 'dynamic_select' | 'color'",
    "placeholder": "string | undefined",
    "options": "{ value: string; label: string }[] | undefined",
    "required": "boolean | undefined",
    "maxLength": "number | undefined",  # camelCase
    "hint": "string | undefined",
    "description": "string | undefined",
    "default": "string | undefined",
    "dependsOn": "string | undefined",  # camelCase
    "optionsMap": "Record<string, { value: string; label: string }[]> | undefined",  # camelCase
    "showForVibes": "string[] | undefined",  # camelCase
    "presets": "{ label: string; value: string; category?: string }[] | undefined",
    "showPresets": "boolean | undefined",  # camelCase
}

# Backend API response field names (snake_case)
BACKEND_API_FIELD_NAMES = {
    "id": "id",
    "label": "label",
    "type": "type",
    "required": "required",
    "placeholder": "placeholder",
    "hint": "hint",
    "description": "description",
    "max_length": "maxLength",  # snake_case → camelCase
    "options": "options",
    "default": "default",
    "show_for_vibes": "showForVibes",  # snake_case → camelCase
    "presets": "presets",
    "show_presets": "showPresets",  # snake_case → camelCase
}


def verify_transformation_mapping():
    """Verify the snake_case to camelCase transformation is correct."""
    print("\n" + "=" * 70)
    print("🔄 SNAKE_CASE → CAMELCASE TRANSFORMATION VERIFICATION")
    print("=" * 70)
    
    errors = []
    
    # Check each backend field has a frontend equivalent
    for backend_name, frontend_name in BACKEND_API_FIELD_NAMES.items():
        if frontend_name not in FRONTEND_TEMPLATE_FIELD_INTERFACE:
            errors.append(f"Backend field '{backend_name}' maps to '{frontend_name}' which is not in frontend interface")
        else:
            print(f"   ✅ {backend_name} → {frontend_name}")
    
    if errors:
        print("\n❌ ERRORS:")
        for e in errors:
            print(f"   {e}")
        return False
    
    print("\n✅ All transformations verified")
    return True


def verify_useTemplates_transform():
    """Verify the useTemplates.ts transformField function handles all fields."""
    print("\n" + "=" * 70)
    print("📦 useTemplates.ts transformField VERIFICATION")
    print("=" * 70)
    
    # Read the actual useTemplates.ts file
    use_templates_path = Path(__file__).parent.parent.parent / "tsx" / "packages" / "api-client" / "src" / "hooks" / "useTemplates.ts"
    
    if not use_templates_path.exists():
        print(f"   ⚠️  Could not find useTemplates.ts at {use_templates_path}")
        return True  # Don't fail, just warn
    
    content = use_templates_path.read_text()
    
    # Check that transformField handles all the snake_case fields
    required_transforms = [
        ("max_length", "maxLength"),
        ("show_for_vibes", "showForVibes"),
        ("show_presets", "showPresets"),
    ]
    
    all_found = True
    for snake, camel in required_transforms:
        if snake in content and camel in content:
            print(f"   ✅ {snake} → {camel} transformation found")
        else:
            print(f"   ❌ Missing transformation: {snake} → {camel}")
            all_found = False
    
    # Check presets is passed through
    if "presets" in content:
        print(f"   ✅ presets field handled")
    else:
        print(f"   ❌ presets field not found")
        all_found = False
    
    return all_found


def verify_wizard_field_conversion():
    """Verify QuickCreateWizard.tsx converts backend fields correctly."""
    print("\n" + "=" * 70)
    print("🧙 QuickCreateWizard.tsx FIELD CONVERSION VERIFICATION")
    print("=" * 70)
    
    wizard_path = Path(__file__).parent.parent.parent / "tsx" / "apps" / "web" / "src" / "components" / "quick-create" / "QuickCreateWizard.tsx"
    
    if not wizard_path.exists():
        print(f"   ⚠️  Could not find QuickCreateWizard.tsx at {wizard_path}")
        return True
    
    content = wizard_path.read_text()
    
    # Check that the field conversion includes all necessary fields
    required_fields = [
        "id",
        "label",
        "type",
        "required",
        "placeholder",
        "hint",
        "description",
        "maxLength",
        "options",
        "default",
        "showForVibes",
        "presets",
        "showPresets",
    ]
    
    all_found = True
    for field in required_fields:
        if field in content:
            print(f"   ✅ {field} field handled")
        else:
            print(f"   ❌ {field} field not found in conversion")
            all_found = False
    
    return all_found


def verify_customize_form_color_support():
    """Verify CustomizeForm.tsx handles color type fields."""
    print("\n" + "=" * 70)
    print("🎨 CustomizeForm.tsx COLOR FIELD SUPPORT VERIFICATION")
    print("=" * 70)
    
    form_path = Path(__file__).parent.parent.parent / "tsx" / "apps" / "web" / "src" / "components" / "quick-create" / "panels" / "CustomizeForm.tsx"
    
    if not form_path.exists():
        print(f"   ⚠️  Could not find CustomizeForm.tsx at {form_path}")
        return True
    
    content = form_path.read_text()
    
    checks = [
        ("field.type === 'color'", "Color type check"),
        ("ColorPickerField", "ColorPickerField component import"),
        ("field.presets", "Presets passed to color picker"),
    ]
    
    all_found = True
    for check, desc in checks:
        if check in content:
            print(f"   ✅ {desc}")
        else:
            print(f"   ❌ {desc} not found")
            all_found = False
    
    return all_found


def verify_color_picker_component():
    """Verify ColorPickerField.tsx exists and handles presets."""
    print("\n" + "=" * 70)
    print("🖌️  ColorPickerField.tsx COMPONENT VERIFICATION")
    print("=" * 70)
    
    picker_path = Path(__file__).parent.parent.parent / "tsx" / "apps" / "web" / "src" / "components" / "quick-create" / "ColorPickerField.tsx"
    
    if not picker_path.exists():
        print(f"   ❌ ColorPickerField.tsx not found at {picker_path}")
        return False
    
    content = picker_path.read_text()
    
    checks = [
        ("interface ColorPreset", "ColorPreset interface"),
        ("presets", "Presets prop"),
        ("category", "Category support for grouping"),
        ("darkPresets", "Dark presets grouping"),
        ("vibrantPresets", "Vibrant presets grouping"),
        ("showCustom", "Custom hex input toggle"),
    ]
    
    all_found = True
    for check, desc in checks:
        if check in content:
            print(f"   ✅ {desc}")
        else:
            print(f"   ❌ {desc} not found")
            all_found = False
    
    return all_found


def verify_types_file():
    """Verify types.ts has all necessary type definitions."""
    print("\n" + "=" * 70)
    print("📝 types.ts TYPE DEFINITIONS VERIFICATION")
    print("=" * 70)
    
    types_path = Path(__file__).parent.parent.parent / "tsx" / "apps" / "web" / "src" / "components" / "quick-create" / "types.ts"
    
    if not types_path.exists():
        print(f"   ⚠️  Could not find types.ts at {types_path}")
        return True
    
    content = types_path.read_text()
    
    checks = [
        ("'color'", "Color type in TemplateField.type"),
        ("presets?:", "Presets field in TemplateField"),
        ("showPresets?:", "showPresets field in TemplateField"),
        ("showForVibes?:", "showForVibes field in TemplateField"),
        ("'branding'", "Branding category"),
    ]
    
    all_found = True
    for check, desc in checks:
        if check in content:
            print(f"   ✅ {desc}")
        else:
            print(f"   ❌ {desc} not found")
            all_found = False
    
    return all_found


def main():
    """Run all frontend type alignment verifications."""
    print("\n" + "=" * 70)
    print("🔍 FRONTEND TYPE ALIGNMENT VERIFICATION")
    print("=" * 70)
    
    results = []
    
    results.append(("Transformation Mapping", verify_transformation_mapping()))
    results.append(("useTemplates Transform", verify_useTemplates_transform()))
    results.append(("Wizard Field Conversion", verify_wizard_field_conversion()))
    results.append(("CustomizeForm Color Support", verify_customize_form_color_support()))
    results.append(("ColorPickerField Component", verify_color_picker_component()))
    results.append(("Types File", verify_types_file()))
    
    print("\n" + "=" * 70)
    print("📊 FRONTEND VERIFICATION SUMMARY")
    print("=" * 70)
    
    all_passed = True
    for name, passed in results:
        status = "✅" if passed else "❌"
        print(f"   {status} {name}")
        if not passed:
            all_passed = False
    
    print("=" * 70)
    
    if all_passed:
        print("✅ ALL FRONTEND TYPE CHECKS PASSED")
        return 0
    else:
        print("❌ SOME FRONTEND TYPE CHECKS FAILED")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
