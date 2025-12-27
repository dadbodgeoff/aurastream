//
//  BrandKitEnhancedTests.swift
//  StreamerStudioTests
//
//  Unit tests for enhanced brand kit models.
//

import XCTest
@testable import StreamerStudioCore

final class BrandKitEnhancedTests: XCTestCase {
    
    // MARK: - Properties
    
    private var decoder: JSONDecoder!
    private var encoder: JSONEncoder!
    
    // MARK: - Setup
    
    override func setUp() {
        super.setUp()
        decoder = JSONDecoder()
        encoder = JSONEncoder()
    }
    
    override func tearDown() {
        decoder = nil
        encoder = nil
        super.tearDown()
    }
    
    // MARK: - ExtendedColor Tests
    
    func testExtendedColorDecoding() throws {
        let json = """
        {
            "hex": "#FF5733",
            "name": "Coral",
            "usage": "Primary brand color"
        }
        """.data(using: .utf8)!
        
        let color = try decoder.decode(ExtendedColor.self, from: json)
        
        XCTAssertEqual(color.hex, "#FF5733")
        XCTAssertEqual(color.name, "Coral")
        XCTAssertEqual(color.usage, "Primary brand color")
    }
    
    func testExtendedColorWithoutUsage() throws {
        let json = """
        {
            "hex": "#3498DB",
            "name": "Sky Blue"
        }
        """.data(using: .utf8)!
        
        let color = try decoder.decode(ExtendedColor.self, from: json)
        
        XCTAssertEqual(color.hex, "#3498DB")
        XCTAssertEqual(color.name, "Sky Blue")
        XCTAssertNil(color.usage)
    }
    
    func testExtendedColorEquality() {
        let color1 = ExtendedColor(hex: "#FF5733", name: "Coral", usage: "Primary")
        let color2 = ExtendedColor(hex: "#FF5733", name: "Coral", usage: "Primary")
        let color3 = ExtendedColor(hex: "#3498DB", name: "Blue", usage: "Secondary")
        
        XCTAssertEqual(color1, color2)
        XCTAssertNotEqual(color1, color3)
    }
    
    // MARK: - Gradient Tests
    
    func testGradientDecoding() throws {
        let json = """
        {
            "name": "Sunset",
            "type": "linear",
            "angle": 135,
            "stops": [
                {"color": "#FF5733", "position": 0},
                {"color": "#F1C40F", "position": 100}
            ]
        }
        """.data(using: .utf8)!
        
        let gradient = try decoder.decode(BrandGradient.self, from: json)
        
        XCTAssertEqual(gradient.name, "Sunset")
        XCTAssertEqual(gradient.type, .linear)
        XCTAssertEqual(gradient.angle, 135)
        XCTAssertEqual(gradient.stops.count, 2)
        XCTAssertEqual(gradient.stops[0].color, "#FF5733")
        XCTAssertEqual(gradient.stops[0].position, 0)
    }
    
    func testGradientTypeAllCases() {
        XCTAssertEqual(GradientType.linear.rawValue, "linear")
        XCTAssertEqual(GradientType.radial.rawValue, "radial")
    }
    
    // MARK: - ColorPalette Tests
    
    func testColorPaletteDecoding() throws {
        let json = """
        {
            "primary": [{"hex": "#FF5733", "name": "Coral"}],
            "secondary": [{"hex": "#3498DB", "name": "Blue"}],
            "accent": [{"hex": "#F1C40F", "name": "Yellow"}],
            "neutral": [{"hex": "#333333", "name": "Dark Gray"}],
            "gradients": []
        }
        """.data(using: .utf8)!
        
        let palette = try decoder.decode(ColorPalette.self, from: json)
        
        XCTAssertEqual(palette.primary.count, 1)
        XCTAssertEqual(palette.secondary.count, 1)
        XCTAssertEqual(palette.accent.count, 1)
        XCTAssertEqual(palette.neutral.count, 1)
        XCTAssertTrue(palette.gradients.isEmpty)
    }
    
    func testColorPaletteDefaults() {
        let palette = ColorPalette()
        
        XCTAssertTrue(palette.primary.isEmpty)
        XCTAssertTrue(palette.secondary.isEmpty)
        XCTAssertTrue(palette.accent.isEmpty)
        XCTAssertTrue(palette.neutral.isEmpty)
        XCTAssertTrue(palette.gradients.isEmpty)
    }
    
    // MARK: - Typography Tests
    
    func testFontConfigDecoding() throws {
        let json = """
        {
            "family": "Montserrat",
            "weight": 700,
            "style": "normal"
        }
        """.data(using: .utf8)!
        
        let config = try decoder.decode(FontConfig.self, from: json)
        
        XCTAssertEqual(config.family, "Montserrat")
        XCTAssertEqual(config.weight, 700)
        XCTAssertEqual(config.style, .normal)
    }
    
    func testFontStyleAllCases() {
        XCTAssertEqual(FontStyle.normal.rawValue, "normal")
        XCTAssertEqual(FontStyle.italic.rawValue, "italic")
    }
    
    func testFontWeightValues() {
        XCTAssertEqual(FontWeight.thin.rawValue, 100)
        XCTAssertEqual(FontWeight.regular.rawValue, 400)
        XCTAssertEqual(FontWeight.bold.rawValue, 700)
        XCTAssertEqual(FontWeight.black.rawValue, 900)
    }
    
    func testBrandTypographyDecoding() throws {
        let json = """
        {
            "display": {"family": "Montserrat", "weight": 700, "style": "normal"},
            "headline": {"family": "Montserrat", "weight": 600, "style": "normal"},
            "body": {"family": "Inter", "weight": 400, "style": "normal"}
        }
        """.data(using: .utf8)!
        
        let typography = try decoder.decode(BrandTypography.self, from: json)
        
        XCTAssertNotNil(typography.display)
        XCTAssertNotNil(typography.headline)
        XCTAssertNotNil(typography.body)
        XCTAssertNil(typography.subheadline)
        XCTAssertNil(typography.caption)
        XCTAssertNil(typography.accent)
    }
    
    // MARK: - Brand Voice Tests
    
    func testBrandVoiceDecoding() throws {
        let json = """
        {
            "tone": "competitive",
            "personality_traits": ["Bold", "Energetic"],
            "tagline": "Level Up Your Stream",
            "catchphrases": ["Let's Go!", "GG EZ"],
            "content_themes": ["Gaming", "Competition"]
        }
        """.data(using: .utf8)!
        
        let voice = try decoder.decode(BrandVoice.self, from: json)
        
        XCTAssertEqual(voice.tone, .competitive)
        XCTAssertEqual(voice.personalityTraits, ["Bold", "Energetic"])
        XCTAssertEqual(voice.tagline, "Level Up Your Stream")
        XCTAssertEqual(voice.catchphrases, ["Let's Go!", "GG EZ"])
        XCTAssertEqual(voice.contentThemes, ["Gaming", "Competition"])
    }
    
    func testExtendedToneAllCases() {
        let allTones = ExtendedTone.allCases
        
        XCTAssertEqual(allTones.count, 8)
        XCTAssertTrue(allTones.contains(.competitive))
        XCTAssertTrue(allTones.contains(.casual))
        XCTAssertTrue(allTones.contains(.educational))
        XCTAssertTrue(allTones.contains(.comedic))
        XCTAssertTrue(allTones.contains(.professional))
        XCTAssertTrue(allTones.contains(.inspirational))
        XCTAssertTrue(allTones.contains(.edgy))
        XCTAssertTrue(allTones.contains(.wholesome))
    }
    
    // MARK: - Brand Customization Tests
    
    func testBrandCustomizationDefaults() {
        let customization = BrandCustomization()
        
        XCTAssertNil(customization.colors)
        XCTAssertNil(customization.typography)
        XCTAssertNil(customization.voice)
        XCTAssertFalse(customization.includeLogo)
        XCTAssertEqual(customization.logoType, .primary)
        XCTAssertEqual(customization.logoPosition, .bottomRight)
        XCTAssertEqual(customization.logoSize, .medium)
        XCTAssertEqual(customization.brandIntensity, .balanced)
    }
    
    func testBrandCustomizationEncoding() throws {
        let customization = BrandCustomization(
            colors: ColorSelection(primaryIndex: 0, secondaryIndex: 1),
            typography: TypographySelection(level: .headline),
            voice: VoiceSelection(useTagline: true, useCatchphrase: 0),
            includeLogo: true,
            logoType: .icon,
            logoPosition: .topRight,
            logoSize: .small,
            brandIntensity: .strong
        )
        
        let data = try encoder.encode(customization)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["include_logo"] as? Bool, true)
        XCTAssertEqual(json["logo_type"] as? String, "icon")
        XCTAssertEqual(json["logo_position"] as? String, "top-right")
        XCTAssertEqual(json["logo_size"] as? String, "small")
        XCTAssertEqual(json["brand_intensity"] as? String, "strong")
    }
    
    func testBrandCustomizationDecoding() throws {
        let json = """
        {
            "colors": {"primary_index": 0, "secondary_index": 1},
            "typography": {"level": "headline"},
            "voice": {"use_tagline": true, "use_catchphrase": 0},
            "include_logo": true,
            "logo_type": "primary",
            "logo_position": "bottom-right",
            "logo_size": "medium",
            "brand_intensity": "balanced"
        }
        """.data(using: .utf8)!
        
        let customization = try decoder.decode(BrandCustomization.self, from: json)
        
        XCTAssertNotNil(customization.colors)
        XCTAssertEqual(customization.colors?.primaryIndex, 0)
        XCTAssertEqual(customization.colors?.secondaryIndex, 1)
        XCTAssertNotNil(customization.typography)
        XCTAssertEqual(customization.typography?.level, .headline)
        XCTAssertNotNil(customization.voice)
        XCTAssertTrue(customization.voice?.useTagline ?? false)
        XCTAssertEqual(customization.voice?.useCatchphrase, 0)
        XCTAssertTrue(customization.includeLogo)
        XCTAssertEqual(customization.logoType, .primary)
        XCTAssertEqual(customization.logoPosition, .bottomRight)
        XCTAssertEqual(customization.logoSize, .medium)
        XCTAssertEqual(customization.brandIntensity, .balanced)
    }
    
    // MARK: - Selection Types Tests
    
    func testColorSelectionDefaults() {
        let selection = ColorSelection()
        
        XCTAssertEqual(selection.primaryIndex, 0)
        XCTAssertNil(selection.secondaryIndex)
        XCTAssertNil(selection.accentIndex)
        XCTAssertNil(selection.useGradient)
    }
    
    func testTypographySelectionDefaults() {
        let selection = TypographySelection()
        
        XCTAssertEqual(selection.level, .headline)
    }
    
    func testVoiceSelectionDefaults() {
        let selection = VoiceSelection()
        
        XCTAssertFalse(selection.useTagline)
        XCTAssertNil(selection.useCatchphrase)
    }
    
    // MARK: - Enum All Cases Tests
    
    func testLogoPositionAllCases() {
        let allPositions = LogoPosition.allCases
        
        XCTAssertEqual(allPositions.count, 5)
        XCTAssertEqual(LogoPosition.topLeft.rawValue, "top-left")
        XCTAssertEqual(LogoPosition.topRight.rawValue, "top-right")
        XCTAssertEqual(LogoPosition.bottomLeft.rawValue, "bottom-left")
        XCTAssertEqual(LogoPosition.bottomRight.rawValue, "bottom-right")
        XCTAssertEqual(LogoPosition.center.rawValue, "center")
    }
    
    func testLogoSizeAllCases() {
        let allSizes = LogoSize.allCases
        
        XCTAssertEqual(allSizes.count, 3)
        XCTAssertEqual(LogoSize.small.rawValue, "small")
        XCTAssertEqual(LogoSize.medium.rawValue, "medium")
        XCTAssertEqual(LogoSize.large.rawValue, "large")
    }
    
    func testLogoTypeAllCases() {
        let allTypes = LogoType.allCases
        
        XCTAssertEqual(allTypes.count, 4)
        XCTAssertEqual(LogoType.primary.rawValue, "primary")
        XCTAssertEqual(LogoType.secondary.rawValue, "secondary")
        XCTAssertEqual(LogoType.icon.rawValue, "icon")
        XCTAssertEqual(LogoType.watermark.rawValue, "watermark")
    }
    
    func testBrandIntensityAllCases() {
        let allIntensities = BrandIntensity.allCases
        
        XCTAssertEqual(allIntensities.count, 3)
        XCTAssertEqual(BrandIntensity.subtle.rawValue, "subtle")
        XCTAssertEqual(BrandIntensity.balanced.rawValue, "balanced")
        XCTAssertEqual(BrandIntensity.strong.rawValue, "strong")
    }
    
    func testTypographyLevelAllCases() {
        let allLevels = TypographyLevel.allCases
        
        XCTAssertEqual(allLevels.count, 6)
        XCTAssertEqual(TypographyLevel.display.rawValue, "display")
        XCTAssertEqual(TypographyLevel.headline.rawValue, "headline")
        XCTAssertEqual(TypographyLevel.subheadline.rawValue, "subheadline")
        XCTAssertEqual(TypographyLevel.body.rawValue, "body")
        XCTAssertEqual(TypographyLevel.caption.rawValue, "caption")
        XCTAssertEqual(TypographyLevel.accent.rawValue, "accent")
    }
    
    // MARK: - API Response Tests
    
    func testColorPaletteResponseDecoding() throws {
        let json = """
        {
            "brand_kit_id": "kit-123",
            "colors": {
                "primary": [{"hex": "#FF5733", "name": "Coral"}],
                "secondary": [],
                "accent": [],
                "neutral": [],
                "gradients": []
            }
        }
        """.data(using: .utf8)!
        
        let response = try decoder.decode(ColorPaletteResponse.self, from: json)
        
        XCTAssertEqual(response.brandKitId, "kit-123")
        XCTAssertEqual(response.colors.primary.count, 1)
    }
    
    func testTypographyResponseDecoding() throws {
        let json = """
        {
            "brand_kit_id": "kit-123",
            "typography": {
                "headline": {"family": "Montserrat", "weight": 600, "style": "normal"}
            }
        }
        """.data(using: .utf8)!
        
        let response = try decoder.decode(TypographyResponse.self, from: json)
        
        XCTAssertEqual(response.brandKitId, "kit-123")
        XCTAssertNotNil(response.typography.headline)
        XCTAssertEqual(response.typography.headline?.family, "Montserrat")
    }
    
    func testVoiceResponseDecoding() throws {
        let json = """
        {
            "brand_kit_id": "kit-123",
            "voice": {
                "tone": "professional",
                "personality_traits": ["Confident"],
                "tagline": "Your Success Partner",
                "catchphrases": [],
                "content_themes": ["Business"]
            }
        }
        """.data(using: .utf8)!
        
        let response = try decoder.decode(VoiceResponse.self, from: json)
        
        XCTAssertEqual(response.brandKitId, "kit-123")
        XCTAssertEqual(response.voice.tone, .professional)
        XCTAssertEqual(response.voice.tagline, "Your Success Partner")
    }
    
    // MARK: - Sendable Conformance Tests
    
    func testSendableConformance() async {
        // These should compile without warnings due to Sendable conformance
        let color = ExtendedColor(hex: "#FF5733", name: "Coral")
        let gradient = BrandGradient(name: "Test", stops: [])
        let palette = ColorPalette()
        let typography = BrandTypography()
        let voice = BrandVoice()
        let customization = BrandCustomization()
        
        await Task.detached {
            _ = color.hex
            _ = gradient.name
            _ = palette.primary
            _ = typography.headline
            _ = voice.tone
            _ = customization.brandIntensity
        }.value
    }
    
    // MARK: - Equatable Tests
    
    func testBrandCustomizationEquality() {
        let customization1 = BrandCustomization(
            includeLogo: true,
            logoPosition: .topRight,
            brandIntensity: .strong
        )
        let customization2 = BrandCustomization(
            includeLogo: true,
            logoPosition: .topRight,
            brandIntensity: .strong
        )
        let customization3 = BrandCustomization(
            includeLogo: false,
            logoPosition: .bottomLeft,
            brandIntensity: .subtle
        )
        
        XCTAssertEqual(customization1, customization2)
        XCTAssertNotEqual(customization1, customization3)
    }
    
    func testColorSelectionEquality() {
        let selection1 = ColorSelection(primaryIndex: 0, secondaryIndex: 1)
        let selection2 = ColorSelection(primaryIndex: 0, secondaryIndex: 1)
        let selection3 = ColorSelection(primaryIndex: 2, secondaryIndex: nil)
        
        XCTAssertEqual(selection1, selection2)
        XCTAssertNotEqual(selection1, selection3)
    }
    
    func testTypographySelectionEquality() {
        let selection1 = TypographySelection(level: .headline)
        let selection2 = TypographySelection(level: .headline)
        let selection3 = TypographySelection(level: .display)
        
        XCTAssertEqual(selection1, selection2)
        XCTAssertNotEqual(selection1, selection3)
    }
    
    func testVoiceSelectionEquality() {
        let selection1 = VoiceSelection(useTagline: true, useCatchphrase: 0)
        let selection2 = VoiceSelection(useTagline: true, useCatchphrase: 0)
        let selection3 = VoiceSelection(useTagline: false, useCatchphrase: nil)
        
        XCTAssertEqual(selection1, selection2)
        XCTAssertNotEqual(selection1, selection3)
    }
}
