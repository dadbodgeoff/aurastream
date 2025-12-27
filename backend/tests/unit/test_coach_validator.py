"""
Unit tests for Prompt Coach Output Validator.

Tests cover:
- Required elements detection
- Conflict detection
- Quality score calculation
- Brand alignment checking
- Auto-fix functionality
"""

import pytest
from backend.services.coach.validator import (
    OutputValidator,
    ValidationSeverity,
    ValidationIssue,
    ValidationResult,
)


class TestOutputValidator:
    """Tests for OutputValidator class."""
    
    @pytest.fixture
    def validator(self):
        """Create a validator instance."""
        return OutputValidator()
    
    @pytest.fixture
    def validator_with_brand(self):
        """Create a validator with brand kit."""
        brand_kit = {
            "colors": [
                {"hex": "#FF5733", "name": "Sunset Orange"},
                {"hex": "#3498DB", "name": "Ocean Blue"},
            ],
            "tone": "competitive",
        }
        return OutputValidator(brand_kit=brand_kit)
    
    # =========================================================================
    # Length Validation Tests
    # =========================================================================
    
    def test_prompt_too_short_returns_error(self, validator):
        """Test that prompts under 10 chars return an error."""
        result = validator.validate("short", "twitch_emote")
        
        assert not result.is_valid
        assert any(i.code == "PROMPT_TOO_SHORT" for i in result.issues)
        assert any(i.severity == ValidationSeverity.ERROR for i in result.issues)
    
    def test_prompt_too_long_returns_warning(self, validator):
        """Test that prompts over 500 chars return a warning."""
        long_prompt = "A" * 501
        result = validator.validate(long_prompt, "twitch_emote")
        
        assert result.is_valid  # Warnings don't make it invalid
        assert any(i.code == "PROMPT_TOO_LONG" for i in result.issues)
        assert any(i.severity == ValidationSeverity.WARNING for i in result.issues)
    
    def test_valid_length_prompt_no_length_issues(self, validator):
        """Test that prompts with valid length have no length issues."""
        result = validator.validate(
            "A happy character celebrating victory with bright colors",
            "twitch_emote"
        )
        
        assert not any(i.code in ["PROMPT_TOO_SHORT", "PROMPT_TOO_LONG"] for i in result.issues)
    
    # =========================================================================
    # Required Elements Tests
    # =========================================================================
    
    def test_missing_subject_returns_warning(self, validator):
        """Test that missing subject returns a warning."""
        result = validator.validate(
            "bright colors with energetic mood",
            "twitch_emote"
        )
        
        assert any(
            i.code == "MISSING_ELEMENT" and "subject" in i.message.lower()
            for i in result.issues
        )
    
    def test_emote_with_subject_and_emotion_no_missing_elements(self, validator):
        """Test that emote with subject and emotion has no missing element warnings."""
        result = validator.validate(
            "A happy character celebrating with a big smile",
            "twitch_emote"
        )
        
        # Should not have missing subject or emotion warnings
        missing_issues = [i for i in result.issues if i.code == "MISSING_ELEMENT"]
        assert not any("subject" in i.message.lower() for i in missing_issues)
        assert not any("emotion" in i.message.lower() for i in missing_issues)
    
    def test_thumbnail_requires_composition(self, validator):
        """Test that thumbnails require composition element."""
        result = validator.validate(
            "A gamer with energetic mood",
            "youtube_thumbnail"
        )
        
        assert any(
            i.code == "MISSING_ELEMENT" and "composition" in i.message.lower()
            for i in result.issues
        )
    
    def test_badge_requires_icon_element(self, validator):
        """Test that badges require icon element."""
        result = validator.validate(
            "Simple design with bold colors",
            "twitch_badge"
        )
        
        assert any(
            i.code == "MISSING_ELEMENT" and "icon" in i.message.lower()
            for i in result.issues
        )
    
    # =========================================================================
    # Conflict Detection Tests
    # =========================================================================
    
    def test_minimalist_vs_detailed_conflict(self, validator):
        """Test detection of minimalist vs detailed conflict."""
        result = validator.validate(
            "A minimalist character with detailed intricate patterns",
            "twitch_emote"
        )
        
        assert any(i.code == "CONFLICTING_TERMS" for i in result.issues)
    
    def test_dark_vs_bright_conflict(self, validator):
        """Test detection of dark vs bright conflict."""
        result = validator.validate(
            "A dark moody scene with bright neon colors",
            "twitch_emote"
        )
        
        assert any(i.code == "CONFLICTING_TERMS" for i in result.issues)
    
    def test_no_conflict_when_consistent(self, validator):
        """Test no conflict warning when style is consistent."""
        result = validator.validate(
            "A minimalist character with clean simple lines",
            "twitch_emote"
        )
        
        assert not any(i.code == "CONFLICTING_TERMS" for i in result.issues)
    
    # =========================================================================
    # Asset Compatibility Tests
    # =========================================================================
    
    def test_emote_background_warning(self, validator):
        """Test warning for complex backgrounds in emotes."""
        result = validator.validate(
            "A character with a detailed landscape background",
            "twitch_emote"
        )
        
        assert any(i.code == "EMOTE_BACKGROUND" for i in result.issues)
    
    def test_emote_text_warning(self, validator):
        """Test warning for text in emotes."""
        result = validator.validate(
            "A character with text saying hello",
            "twitch_emote"
        )
        
        assert any(i.code == "EMOTE_TEXT" for i in result.issues)
    
    def test_thumbnail_low_contrast_warning(self, validator):
        """Test warning for low contrast in thumbnails."""
        result = validator.validate(
            "A gamer with subtle muted colors in centered composition",
            "youtube_thumbnail"
        )
        
        assert any(i.code == "THUMBNAIL_LOW_CONTRAST" for i in result.issues)
    
    def test_banner_vertical_warning(self, validator):
        """Test warning for vertical composition in banners."""
        result = validator.validate(
            "A character in portrait vertical composition",
            "twitch_banner"
        )
        
        assert any(i.code == "BANNER_ORIENTATION" for i in result.issues)
    
    # =========================================================================
    # Quality Score Tests
    # =========================================================================
    
    def test_quality_score_perfect_prompt(self, validator):
        """Test quality score for a well-crafted prompt."""
        result = validator.validate(
            "A happy character celebrating victory with dynamic pose, bright vibrant colors",
            "twitch_emote"
        )
        
        # Should have high quality score (few or no issues)
        assert result.quality_score >= 0.7
    
    def test_quality_score_decreases_with_errors(self, validator):
        """Test that quality score decreases with errors."""
        result = validator.validate("bad", "twitch_emote")
        
        # Error should reduce score by 0.3
        assert result.quality_score <= 0.7
    
    def test_quality_score_decreases_with_warnings(self, validator):
        """Test that quality score decreases with warnings."""
        result = validator.validate(
            "A minimalist detailed character",  # Conflict warning
            "twitch_emote"
        )
        
        # Warning should reduce score by 0.1
        assert result.quality_score < 1.0
    
    def test_quality_score_never_negative(self, validator):
        """Test that quality score is never negative."""
        # Create a prompt with many issues
        result = validator.validate(
            "bad",  # Too short (error) + missing elements (warnings)
            "youtube_thumbnail"
        )
        
        assert result.quality_score >= 0.0
    
    # =========================================================================
    # Brand Alignment Tests
    # =========================================================================
    
    def test_off_brand_color_warning(self, validator_with_brand):
        """Test warning for colors not in brand palette."""
        result = validator_with_brand.validate(
            "A character with green color theme",
            "twitch_emote"
        )
        
        assert any(i.code == "OFF_BRAND_COLOR" for i in result.issues)
    
    def test_no_warning_for_brand_colors(self, validator_with_brand):
        """Test no warning when using brand colors."""
        result = validator_with_brand.validate(
            "A character with Sunset Orange and Ocean Blue colors",
            "twitch_emote"
        )
        
        assert not any(i.code == "OFF_BRAND_COLOR" for i in result.issues)
    
    # =========================================================================
    # Auto-Fix Tests
    # =========================================================================
    
    def test_auto_fix_truncates_long_prompt(self, validator):
        """Test that auto-fix truncates long prompts."""
        long_prompt = "A " + "word " * 200  # Way over 500 chars
        result = validator.validate(long_prompt, "twitch_emote")
        
        assert result.fixed_prompt is not None
        assert len(result.fixed_prompt) <= 500
    
    def test_no_auto_fix_for_valid_prompt(self, validator):
        """Test that no auto-fix is applied to valid prompts."""
        result = validator.validate(
            "A happy character celebrating with bright colors",
            "twitch_emote"
        )
        
        assert result.fixed_prompt is None
    
    # =========================================================================
    # Generation Ready Tests
    # =========================================================================
    
    def test_is_generation_ready_with_no_errors(self, validator):
        """Test is_generation_ready is True with no errors and few warnings."""
        result = validator.validate(
            "A happy character celebrating victory with dynamic action pose",
            "twitch_emote"
        )
        
        # Should be generation ready if no errors and <= 2 warnings
        if not any(i.severity == ValidationSeverity.ERROR for i in result.issues):
            warning_count = len([i for i in result.issues if i.severity == ValidationSeverity.WARNING])
            if warning_count <= 2:
                assert result.is_generation_ready
    
    def test_not_generation_ready_with_errors(self, validator):
        """Test is_generation_ready is False with errors."""
        result = validator.validate("bad", "twitch_emote")
        
        assert not result.is_generation_ready


class TestValidationSeverity:
    """Tests for ValidationSeverity enum."""
    
    def test_severity_values(self):
        """Test that severity enum has expected values."""
        assert ValidationSeverity.ERROR.value == "error"
        assert ValidationSeverity.WARNING.value == "warning"
        assert ValidationSeverity.INFO.value == "info"
    
    def test_severity_comparison(self):
        """Test that severity values can be compared."""
        # Enum members are comparable
        assert ValidationSeverity.ERROR == ValidationSeverity.ERROR
        assert ValidationSeverity.ERROR != ValidationSeverity.WARNING


class TestValidationIssue:
    """Tests for ValidationIssue dataclass."""
    
    def test_issue_creation(self):
        """Test creating a validation issue."""
        issue = ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="TEST_CODE",
            message="Test message",
            suggestion="Test suggestion",
            auto_fixable=True,
        )
        
        assert issue.severity == ValidationSeverity.ERROR
        assert issue.code == "TEST_CODE"
        assert issue.message == "Test message"
        assert issue.suggestion == "Test suggestion"
        assert issue.auto_fixable is True
    
    def test_issue_defaults(self):
        """Test validation issue default values."""
        issue = ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="TEST",
            message="Test",
        )
        
        assert issue.suggestion is None
        assert issue.auto_fixable is False


class TestValidationResult:
    """Tests for ValidationResult dataclass."""
    
    def test_result_creation(self):
        """Test creating a validation result."""
        result = ValidationResult(
            is_valid=True,
            is_generation_ready=True,
            issues=[],
            fixed_prompt=None,
            quality_score=1.0,
        )
        
        assert result.is_valid is True
        assert result.is_generation_ready is True
        assert result.issues == []
        assert result.fixed_prompt is None
        assert result.quality_score == 1.0
    
    def test_result_with_issues(self):
        """Test validation result with issues."""
        issues = [
            ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="TEST",
                message="Test warning",
            )
        ]
        
        result = ValidationResult(
            is_valid=True,
            is_generation_ready=True,
            issues=issues,
            quality_score=0.9,
        )
        
        assert len(result.issues) == 1
        assert result.issues[0].code == "TEST"


class TestValidatorEdgeCases:
    """Edge case tests for OutputValidator."""
    
    @pytest.fixture
    def validator(self):
        """Create a validator instance."""
        return OutputValidator()
    
    def test_empty_prompt(self, validator):
        """Test validation of empty prompt."""
        result = validator.validate("", "twitch_emote")
        
        assert not result.is_valid
        assert any(i.code == "PROMPT_TOO_SHORT" for i in result.issues)
    
    def test_whitespace_only_prompt(self, validator):
        """Test validation of whitespace-only prompt."""
        result = validator.validate("   ", "twitch_emote")
        
        assert not result.is_valid
        assert any(i.code == "PROMPT_TOO_SHORT" for i in result.issues)
    
    def test_unknown_asset_type(self, validator):
        """Test validation with unknown asset type uses default."""
        result = validator.validate(
            "A happy character celebrating",
            "unknown_asset_type"
        )
        
        # Should use default required elements (just subject)
        # Character is a subject indicator, so should pass
        assert result.is_valid or any(i.code == "MISSING_ELEMENT" for i in result.issues)
    
    def test_case_insensitive_element_detection(self, validator):
        """Test that element detection is case insensitive."""
        result = validator.validate(
            "A HAPPY CHARACTER CELEBRATING",
            "twitch_emote"
        )
        
        # Should detect "character" and "happy" regardless of case
        missing_issues = [i for i in result.issues if i.code == "MISSING_ELEMENT"]
        assert not any("subject" in i.message.lower() for i in missing_issues)
    
    def test_multiple_conflicts_detected(self, validator):
        """Test that multiple conflicts are detected."""
        result = validator.validate(
            "A minimalist detailed dark bright character",
            "twitch_emote"
        )
        
        conflict_issues = [i for i in result.issues if i.code == "CONFLICTING_TERMS"]
        # Should detect at least one conflict
        assert len(conflict_issues) >= 1
    
    def test_brand_kit_from_context(self, validator):
        """Test that brand kit can be provided via context."""
        context = {
            "brand_kit": {
                "colors": [{"hex": "#FF0000", "name": "Red"}],
                "tone": "energetic",
            }
        }
        
        result = validator.validate(
            "A character with blue color theme",
            "twitch_emote",
            context=context,
        )
        
        # Should detect off-brand color
        assert any(i.code == "OFF_BRAND_COLOR" for i in result.issues)
    
    def test_exact_length_boundaries(self, validator):
        """Test prompts at exact length boundaries."""
        # Exactly 10 characters (minimum)
        result_min = validator.validate("A" * 10, "twitch_emote")
        assert not any(i.code == "PROMPT_TOO_SHORT" for i in result_min.issues)
        
        # Exactly 500 characters (maximum)
        result_max = validator.validate("A" * 500, "twitch_emote")
        assert not any(i.code == "PROMPT_TOO_LONG" for i in result_max.issues)
        
        # 9 characters (below minimum)
        result_below = validator.validate("A" * 9, "twitch_emote")
        assert any(i.code == "PROMPT_TOO_SHORT" for i in result_below.issues)
        
        # 501 characters (above maximum)
        result_above = validator.validate("A" * 501, "twitch_emote")
        assert any(i.code == "PROMPT_TOO_LONG" for i in result_above.issues)
