//
//  BrandKitEnhancedModels.swift
//  StreamerStudioCore
//
//  Enhanced data models for brand kit customization and generation.
//

import Foundation

// MARK: - Extended Color System

/// Extended color with metadata
public struct ExtendedColor: Codable, Equatable, Sendable {
    public let hex: String
    public let name: String
    public let usage: String?
    
    public init(hex: String, name: String, usage: String? = nil) {
        self.hex = hex
        self.name = name
        self.usage = usage
    }
}

/// Gradient stop
public struct GradientStop: Codable, Equatable, Sendable {
    public let color: String
    public let position: Int
    
    public init(color: String, position: Int) {
        self.color = color
        self.position = position
    }
}

/// Gradient type
public enum GradientType: String, Codable, Sendable {
    case linear
    case radial
}

/// Gradient definition
public struct BrandGradient: Codable, Equatable, Sendable {
    public let name: String
    public let type: GradientType
    public let angle: Int
    public let stops: [GradientStop]
    
    public init(name: String, type: GradientType = .linear, angle: Int = 135, stops: [GradientStop]) {
        self.name = name
        self.type = type
        self.angle = angle
        self.stops = stops
    }
}

/// Extended color palette
public struct ColorPalette: Codable, Equatable, Sendable {
    public let primary: [ExtendedColor]
    public let secondary: [ExtendedColor]
    public let accent: [ExtendedColor]
    public let neutral: [ExtendedColor]
    public let gradients: [BrandGradient]
    
    public init(
        primary: [ExtendedColor] = [],
        secondary: [ExtendedColor] = [],
        accent: [ExtendedColor] = [],
        neutral: [ExtendedColor] = [],
        gradients: [BrandGradient] = []
    ) {
        self.primary = primary
        self.secondary = secondary
        self.accent = accent
        self.neutral = neutral
        self.gradients = gradients
    }
}

// MARK: - Typography System

/// Font weight enum
public enum FontWeight: Int, Codable, Sendable {
    case thin = 100
    case extraLight = 200
    case light = 300
    case regular = 400
    case medium = 500
    case semiBold = 600
    case bold = 700
    case extraBold = 800
    case black = 900
}

/// Font style enum
public enum FontStyle: String, Codable, Sendable {
    case normal
    case italic
}

/// Font configuration
public struct FontConfig: Codable, Equatable, Sendable {
    public let family: String
    public let weight: Int
    public let style: FontStyle
    
    public init(family: String, weight: Int = 400, style: FontStyle = .normal) {
        self.family = family
        self.weight = weight
        self.style = style
    }
}

/// Typography hierarchy for brand kit
public struct BrandTypography: Codable, Equatable, Sendable {
    public let display: FontConfig?
    public let headline: FontConfig?
    public let subheadline: FontConfig?
    public let body: FontConfig?
    public let caption: FontConfig?
    public let accent: FontConfig?
    
    public init(
        display: FontConfig? = nil,
        headline: FontConfig? = nil,
        subheadline: FontConfig? = nil,
        body: FontConfig? = nil,
        caption: FontConfig? = nil,
        accent: FontConfig? = nil
    ) {
        self.display = display
        self.headline = headline
        self.subheadline = subheadline
        self.body = body
        self.caption = caption
        self.accent = accent
    }
}

// MARK: - Brand Voice

/// Extended tone options
public enum ExtendedTone: String, Codable, CaseIterable, Sendable {
    case competitive
    case casual
    case educational
    case comedic
    case professional
    case inspirational
    case edgy
    case wholesome
}

/// Brand voice configuration
public struct BrandVoice: Codable, Equatable, Sendable {
    public let tone: ExtendedTone
    public let personalityTraits: [String]
    public let tagline: String?
    public let catchphrases: [String]
    public let contentThemes: [String]
    
    public init(
        tone: ExtendedTone = .professional,
        personalityTraits: [String] = [],
        tagline: String? = nil,
        catchphrases: [String] = [],
        contentThemes: [String] = []
    ) {
        self.tone = tone
        self.personalityTraits = personalityTraits
        self.tagline = tagline
        self.catchphrases = catchphrases
        self.contentThemes = contentThemes
    }
    
    enum CodingKeys: String, CodingKey {
        case tone
        case personalityTraits = "personality_traits"
        case tagline
        case catchphrases
        case contentThemes = "content_themes"
    }
}

// MARK: - Brand Customization for Generation

/// Logo position options
public enum LogoPosition: String, Codable, CaseIterable, Sendable {
    case topLeft = "top-left"
    case topRight = "top-right"
    case bottomLeft = "bottom-left"
    case bottomRight = "bottom-right"
    case center
}

/// Logo size options
public enum LogoSize: String, Codable, CaseIterable, Sendable {
    case small
    case medium
    case large
}

/// Brand intensity options
public enum BrandIntensity: String, Codable, CaseIterable, Sendable {
    case subtle
    case balanced
    case strong
}

/// Typography level options
public enum TypographyLevel: String, Codable, CaseIterable, Sendable {
    case display
    case headline
    case subheadline
    case body
    case caption
    case accent
}

/// Logo type options
public enum LogoType: String, Codable, CaseIterable, Sendable {
    case primary
    case secondary
    case icon
    case watermark
}

/// Color selection for generation
public struct ColorSelection: Codable, Equatable, Sendable {
    public let primaryIndex: Int
    public let secondaryIndex: Int?
    public let accentIndex: Int?
    public let useGradient: Int?
    
    public init(
        primaryIndex: Int = 0,
        secondaryIndex: Int? = nil,
        accentIndex: Int? = nil,
        useGradient: Int? = nil
    ) {
        self.primaryIndex = primaryIndex
        self.secondaryIndex = secondaryIndex
        self.accentIndex = accentIndex
        self.useGradient = useGradient
    }
    
    enum CodingKeys: String, CodingKey {
        case primaryIndex = "primary_index"
        case secondaryIndex = "secondary_index"
        case accentIndex = "accent_index"
        case useGradient = "use_gradient"
    }
}

/// Typography selection for generation
public struct TypographySelection: Codable, Equatable, Sendable {
    public let level: TypographyLevel
    
    public init(level: TypographyLevel = .headline) {
        self.level = level
    }
}

/// Voice selection for generation
public struct VoiceSelection: Codable, Equatable, Sendable {
    public let useTagline: Bool
    public let useCatchphrase: Int?
    
    public init(useTagline: Bool = false, useCatchphrase: Int? = nil) {
        self.useTagline = useTagline
        self.useCatchphrase = useCatchphrase
    }
    
    enum CodingKeys: String, CodingKey {
        case useTagline = "use_tagline"
        case useCatchphrase = "use_catchphrase"
    }
}

/// Complete brand customization for generation
public struct BrandCustomization: Codable, Equatable, Sendable {
    public let colors: ColorSelection?
    public let typography: TypographySelection?
    public let voice: VoiceSelection?
    public let includeLogo: Bool
    public let logoType: LogoType
    public let logoPosition: LogoPosition
    public let logoSize: LogoSize
    public let brandIntensity: BrandIntensity
    
    public init(
        colors: ColorSelection? = nil,
        typography: TypographySelection? = nil,
        voice: VoiceSelection? = nil,
        includeLogo: Bool = false,
        logoType: LogoType = .primary,
        logoPosition: LogoPosition = .bottomRight,
        logoSize: LogoSize = .medium,
        brandIntensity: BrandIntensity = .balanced
    ) {
        self.colors = colors
        self.typography = typography
        self.voice = voice
        self.includeLogo = includeLogo
        self.logoType = logoType
        self.logoPosition = logoPosition
        self.logoSize = logoSize
        self.brandIntensity = brandIntensity
    }
    
    enum CodingKeys: String, CodingKey {
        case colors
        case typography
        case voice
        case includeLogo = "include_logo"
        case logoType = "logo_type"
        case logoPosition = "logo_position"
        case logoSize = "logo_size"
        case brandIntensity = "brand_intensity"
    }
}

// MARK: - API Response Types

/// Response for color palette
public struct ColorPaletteResponse: Codable, Sendable {
    public let brandKitId: String
    public let colors: ColorPalette
    
    public init(brandKitId: String, colors: ColorPalette) {
        self.brandKitId = brandKitId
        self.colors = colors
    }
    
    enum CodingKeys: String, CodingKey {
        case brandKitId = "brand_kit_id"
        case colors
    }
}

/// Response for typography
public struct TypographyResponse: Codable, Sendable {
    public let brandKitId: String
    public let typography: BrandTypography
    
    public init(brandKitId: String, typography: BrandTypography) {
        self.brandKitId = brandKitId
        self.typography = typography
    }
    
    enum CodingKeys: String, CodingKey {
        case brandKitId = "brand_kit_id"
        case typography
    }
}

/// Response for voice
public struct VoiceResponse: Codable, Sendable {
    public let brandKitId: String
    public let voice: BrandVoice
    
    public init(brandKitId: String, voice: BrandVoice) {
        self.brandKitId = brandKitId
        self.voice = voice
    }
    
    enum CodingKeys: String, CodingKey {
        case brandKitId = "brand_kit_id"
        case voice
    }
}
