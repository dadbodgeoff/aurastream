//
//  BrandKitModels.swift
//  StreamerStudioCore
//
//  Data models for brand kit management.
//

import Foundation

// MARK: - Brand Kit Models

/// Font configuration for a brand kit
public struct BrandKitFonts: Codable, Equatable, Sendable {
    public let headline: String
    public let body: String
    
    public init(headline: String, body: String) {
        self.headline = headline
        self.body = body
    }
}

/// Valid brand kit tones
public enum BrandKitTone: String, Codable, CaseIterable, Sendable {
    case competitive
    case casual
    case educational
    case comedic
    case professional
}

/// Brand kit model
public struct BrandKit: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let name: String
    public let isActive: Bool
    public let primaryColors: [String]
    public let accentColors: [String]
    public let fonts: BrandKitFonts
    public let logoUrl: String?
    public let tone: BrandKitTone
    public let styleReference: String
    public let extractedFrom: String?
    public let createdAt: Date
    public let updatedAt: Date
    
    public init(
        id: String,
        userId: String,
        name: String,
        isActive: Bool = false,
        primaryColors: [String],
        accentColors: [String] = [],
        fonts: BrandKitFonts,
        logoUrl: String? = nil,
        tone: BrandKitTone = .professional,
        styleReference: String = "",
        extractedFrom: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.isActive = isActive
        self.primaryColors = primaryColors
        self.accentColors = accentColors
        self.fonts = fonts
        self.logoUrl = logoUrl
        self.tone = tone
        self.styleReference = styleReference
        self.extractedFrom = extractedFrom
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case isActive = "is_active"
        case primaryColors = "primary_colors"
        case accentColors = "accent_colors"
        case fonts
        case logoUrl = "logo_url"
        case tone
        case styleReference = "style_reference"
        case extractedFrom = "extracted_from"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Request body for creating a brand kit
public struct BrandKitCreate: Codable, Sendable {
    public let name: String
    public let primaryColors: [String]
    public var accentColors: [String]
    public let fonts: BrandKitFonts
    public var tone: BrandKitTone
    public var styleReference: String
    public var logoUrl: String?
    
    public init(
        name: String,
        primaryColors: [String],
        accentColors: [String] = [],
        fonts: BrandKitFonts,
        tone: BrandKitTone = .professional,
        styleReference: String = "",
        logoUrl: String? = nil
    ) {
        self.name = name
        self.primaryColors = primaryColors
        self.accentColors = accentColors
        self.fonts = fonts
        self.tone = tone
        self.styleReference = styleReference
        self.logoUrl = logoUrl
    }
    
    enum CodingKeys: String, CodingKey {
        case name
        case primaryColors = "primary_colors"
        case accentColors = "accent_colors"
        case fonts
        case tone
        case styleReference = "style_reference"
        case logoUrl = "logo_url"
    }
}

/// Request body for updating a brand kit
public struct BrandKitUpdate: Codable, Sendable {
    public var name: String?
    public var primaryColors: [String]?
    public var accentColors: [String]?
    public var fonts: BrandKitFonts?
    public var tone: BrandKitTone?
    public var styleReference: String?
    public var logoUrl: String?
    
    public init(
        name: String? = nil,
        primaryColors: [String]? = nil,
        accentColors: [String]? = nil,
        fonts: BrandKitFonts? = nil,
        tone: BrandKitTone? = nil,
        styleReference: String? = nil,
        logoUrl: String? = nil
    ) {
        self.name = name
        self.primaryColors = primaryColors
        self.accentColors = accentColors
        self.fonts = fonts
        self.tone = tone
        self.styleReference = styleReference
        self.logoUrl = logoUrl
    }
    
    enum CodingKeys: String, CodingKey {
        case name
        case primaryColors = "primary_colors"
        case accentColors = "accent_colors"
        case fonts
        case tone
        case styleReference = "style_reference"
        case logoUrl = "logo_url"
    }
}

/// Response for listing brand kits
public struct BrandKitListResponse: Codable, Sendable {
    public let brandKits: [BrandKit]
    public let total: Int
    public let activeId: String?
    
    public init(brandKits: [BrandKit], total: Int, activeId: String? = nil) {
        self.brandKits = brandKits
        self.total = total
        self.activeId = activeId
    }
    
    enum CodingKeys: String, CodingKey {
        case brandKits = "brand_kits"
        case total
        case activeId = "active_id"
    }
}

/// Supported fonts list
public let supportedFonts = [
    "Inter", "Roboto", "Montserrat", "Open Sans", "Poppins",
    "Lato", "Oswald", "Raleway", "Nunito", "Playfair Display",
    "Merriweather", "Source Sans Pro", "Ubuntu", "Rubik", "Work Sans",
    "Fira Sans", "Barlow", "Quicksand", "Karla", "Mulish"
]

// MARK: - Brand Kit Error

/// Error types for brand kit operations
public enum BrandKitError: LocalizedError, Equatable {
    case loadFailed(String)
    case createFailed(String)
    case updateFailed(String)
    case deleteFailed(String)
    case activateFailed(String)
    case notFound
    case unauthorized
    case networkError(String)
    case decodingError(String)
    
    public var errorDescription: String? {
        switch self {
        case .loadFailed(let message):
            return "Failed to load brand kits: \(message)"
        case .createFailed(let message):
            return "Failed to create brand kit: \(message)"
        case .updateFailed(let message):
            return "Failed to update brand kit: \(message)"
        case .deleteFailed(let message):
            return "Failed to delete brand kit: \(message)"
        case .activateFailed(let message):
            return "Failed to activate brand kit: \(message)"
        case .notFound:
            return "Brand kit not found"
        case .unauthorized:
            return "You are not authorized to access this brand kit"
        case .networkError(let message):
            return "Network error: \(message)"
        case .decodingError(let message):
            return "Failed to process response: \(message)"
        }
    }
    
    public static func == (lhs: BrandKitError, rhs: BrandKitError) -> Bool {
        switch (lhs, rhs) {
        case (.loadFailed(let l), .loadFailed(let r)): return l == r
        case (.createFailed(let l), .createFailed(let r)): return l == r
        case (.updateFailed(let l), .updateFailed(let r)): return l == r
        case (.deleteFailed(let l), .deleteFailed(let r)): return l == r
        case (.activateFailed(let l), .activateFailed(let r)): return l == r
        case (.notFound, .notFound): return true
        case (.unauthorized, .unauthorized): return true
        case (.networkError(let l), .networkError(let r)): return l == r
        case (.decodingError(let l), .decodingError(let r)): return l == r
        default: return false
        }
    }
}
