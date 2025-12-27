//
//  TokenTests.swift
//  StreamerStudioTests
//
//  Tests for design tokens to ensure consistency with TSX design system.
//

import XCTest
import SwiftUI
@testable import StreamerStudioCore

final class TokenTests: XCTestCase {
    
    // MARK: - Color Tests
    
    func testPrimaryColors() {
        XCTAssertEqual(Colors.Primary.main, "#6366F1")
        XCTAssertEqual(Colors.Primary.light, "#818CF8")
        XCTAssertEqual(Colors.Primary.dark, "#4F46E5")
        XCTAssertEqual(Colors.Primary.contrast, "#FFFFFF")
    }
    
    func testAccentColors() {
        XCTAssertEqual(Colors.Accent.main, "#F59E0B")
        XCTAssertEqual(Colors.Accent.light, "#FBBF24")
        XCTAssertEqual(Colors.Accent.dark, "#D97706")
        XCTAssertEqual(Colors.Accent.contrast, "#000000")
    }
    
    func testBackgroundColors() {
        XCTAssertEqual(Colors.Background.primary, "#0F0F0F")
        XCTAssertEqual(Colors.Background.secondary, "#1A1A1A")
        XCTAssertEqual(Colors.Background.tertiary, "#262626")
        XCTAssertEqual(Colors.Background.elevated, "#2D2D2D")
    }
    
    func testTextColors() {
        XCTAssertEqual(Colors.Text.primary, "#FFFFFF")
        XCTAssertEqual(Colors.Text.secondary, "#A3A3A3")
        XCTAssertEqual(Colors.Text.tertiary, "#737373")
        XCTAssertEqual(Colors.Text.disabled, "#525252")
    }
    
    func testSemanticColors() {
        XCTAssertEqual(Colors.Semantic.success, "#22C55E")
        XCTAssertEqual(Colors.Semantic.warning, "#F59E0B")
        XCTAssertEqual(Colors.Semantic.error, "#EF4444")
        XCTAssertEqual(Colors.Semantic.info, "#3B82F6")
    }
    
    func testBorderColors() {
        XCTAssertEqual(Colors.Border.default, "#404040")
        XCTAssertEqual(Colors.Border.focus, "#6366F1")
        XCTAssertEqual(Colors.Border.error, "#EF4444")
    }
    
    // MARK: - Typography Tests
    
    func testFontFamily() {
        XCTAssertEqual(Typography.FontFamily.primary, "Inter")
        XCTAssertEqual(Typography.FontFamily.mono, "JetBrains Mono")
    }
    
    func testFontSizes() {
        XCTAssertEqual(Typography.FontSize.xs, 12)
        XCTAssertEqual(Typography.FontSize.sm, 14)
        XCTAssertEqual(Typography.FontSize.base, 16)
        XCTAssertEqual(Typography.FontSize.lg, 18)
        XCTAssertEqual(Typography.FontSize.xl, 20)
        XCTAssertEqual(Typography.FontSize.xl2, 24)
        XCTAssertEqual(Typography.FontSize.xl3, 30)
        XCTAssertEqual(Typography.FontSize.xl4, 36)
    }
    
    func testFontWeights() {
        XCTAssertEqual(Typography.FontWeight.regular, 400)
        XCTAssertEqual(Typography.FontWeight.medium, 500)
        XCTAssertEqual(Typography.FontWeight.semibold, 600)
        XCTAssertEqual(Typography.FontWeight.bold, 700)
    }
    
    func testLineHeights() {
        XCTAssertEqual(Typography.LineHeight.tight, 1.25)
        XCTAssertEqual(Typography.LineHeight.normal, 1.5)
        XCTAssertEqual(Typography.LineHeight.relaxed, 1.75)
    }
    
    func testFontWeightConversion() {
        XCTAssertEqual(Typography.FontWeight.toSwiftUI(400), Font.Weight.regular)
        XCTAssertEqual(Typography.FontWeight.toSwiftUI(500), Font.Weight.medium)
        XCTAssertEqual(Typography.FontWeight.toSwiftUI(600), Font.Weight.semibold)
        XCTAssertEqual(Typography.FontWeight.toSwiftUI(700), Font.Weight.bold)
        XCTAssertEqual(Typography.FontWeight.toSwiftUI(999), Font.Weight.regular) // Unknown defaults to regular
    }
    
    // MARK: - Spacing Tests
    
    func testSpacingScale() {
        XCTAssertEqual(Spacing.scale0, 0)
        XCTAssertEqual(Spacing.scale1, 4)
        XCTAssertEqual(Spacing.scale2, 8)
        XCTAssertEqual(Spacing.scale3, 12)
        XCTAssertEqual(Spacing.scale4, 16)
        XCTAssertEqual(Spacing.scale5, 20)
        XCTAssertEqual(Spacing.scale6, 24)
        XCTAssertEqual(Spacing.scale8, 32)
        XCTAssertEqual(Spacing.scale10, 40)
        XCTAssertEqual(Spacing.scale12, 48)
        XCTAssertEqual(Spacing.scale16, 64)
        XCTAssertEqual(Spacing.scale20, 80)
        XCTAssertEqual(Spacing.scale24, 96)
    }
    
    func testBorderRadius() {
        XCTAssertEqual(Spacing.Radius.none, 0)
        XCTAssertEqual(Spacing.Radius.sm, 4)
        XCTAssertEqual(Spacing.Radius.md, 8)
        XCTAssertEqual(Spacing.Radius.lg, 12)
        XCTAssertEqual(Spacing.Radius.xl, 16)
        XCTAssertEqual(Spacing.Radius.xl2, 24)
        XCTAssertEqual(Spacing.Radius.full, 9999)
    }
    
    func testZIndex() {
        XCTAssertEqual(Spacing.ZIndex.dropdown, 1000)
        XCTAssertEqual(Spacing.ZIndex.sticky, 1100)
        XCTAssertEqual(Spacing.ZIndex.modal, 1200)
        XCTAssertEqual(Spacing.ZIndex.popover, 1300)
        XCTAssertEqual(Spacing.ZIndex.tooltip, 1400)
    }
    
    // MARK: - Shadow Tests
    
    func testShadowConfigurations() {
        // Test that shadows have correct types
        XCTAssertEqual(Shadows.sm.radius, 2)
        XCTAssertEqual(Shadows.sm.x, 0)
        XCTAssertEqual(Shadows.sm.y, 1)
        
        XCTAssertEqual(Shadows.md.radius, 4)
        XCTAssertEqual(Shadows.md.x, 0)
        XCTAssertEqual(Shadows.md.y, 4)
        
        XCTAssertEqual(Shadows.lg.radius, 8)
        XCTAssertEqual(Shadows.lg.x, 0)
        XCTAssertEqual(Shadows.lg.y, 10)
        
        XCTAssertEqual(Shadows.xl.radius, 16)
        XCTAssertEqual(Shadows.xl.x, 0)
        XCTAssertEqual(Shadows.xl.y, 20)
        
        XCTAssertEqual(Shadows.inner.radius, 2)
        XCTAssertEqual(Shadows.inner.x, 0)
        XCTAssertEqual(Shadows.inner.y, 2)
        
        XCTAssertEqual(Shadows.none.radius, 0)
        XCTAssertEqual(Shadows.none.x, 0)
        XCTAssertEqual(Shadows.none.y, 0)
    }
    
    // MARK: - Color Extension Tests
    
    func testColorHexInitialization() {
        // Test that Color can be initialized from hex strings
        let primaryColor = Color(hex: Colors.Primary.main)
        let accentColor = Color(hex: Colors.Accent.main)
        let backgroundColor = Color(hex: Colors.Background.primary)
        
        // These should not crash - basic existence test
        XCTAssertNotNil(primaryColor)
        XCTAssertNotNil(accentColor)
        XCTAssertNotNil(backgroundColor)
    }
    
    func testColorHexWithoutHash() {
        // Test hex parsing without # prefix
        let color = Color(hex: "6366F1")
        XCTAssertNotNil(color)
    }
    
    func testColorHexShortFormat() {
        // Test 3-character hex format
        let color = Color(hex: "FFF")
        XCTAssertNotNil(color)
    }
    
    // MARK: - Type Safety Tests
    
    func testSpacingValuesAreCGFloat() {
        let spacing: CGFloat = Spacing.scale4
        XCTAssertEqual(spacing, 16)
    }
    
    func testFontSizeValuesAreCGFloat() {
        let fontSize: CGFloat = Typography.FontSize.base
        XCTAssertEqual(fontSize, 16)
    }
    
    func testRadiusValuesAreCGFloat() {
        let radius: CGFloat = Spacing.Radius.md
        XCTAssertEqual(radius, 8)
    }
    
    func testZIndexValuesAreDouble() {
        let zIndex: Double = Spacing.ZIndex.modal
        XCTAssertEqual(zIndex, 1200)
    }
}
