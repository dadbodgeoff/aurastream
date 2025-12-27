//
//  Typography.swift
//  StreamerStudio
//
//  Design tokens for typography - matches TSX design system exactly.
//

import SwiftUI

/// Typography design tokens for Streamer Studio.
///
/// These values are synchronized with the TSX design system to ensure
/// visual consistency across all platforms.
///
/// Usage:
/// ```swift
/// .font(.custom(Typography.FontFamily.primary, size: Typography.FontSize.base))
/// ```
public enum Typography {
    
    // MARK: - Font Family
    
    /// Font family definitions.
    public enum FontFamily {
        /// Primary font for body text and UI elements
        public static let primary = "Inter"
        /// Monospace font for code and technical content
        public static let mono = "JetBrains Mono"
    }
    
    // MARK: - Font Size
    
    /// Font size scale in points.
    public enum FontSize {
        /// Extra small - 12pt
        public static let xs: CGFloat = 12
        /// Small - 14pt
        public static let sm: CGFloat = 14
        /// Base - 16pt
        public static let base: CGFloat = 16
        /// Large - 18pt
        public static let lg: CGFloat = 18
        /// Extra large - 20pt
        public static let xl: CGFloat = 20
        /// 2x Extra large - 24pt
        public static let xl2: CGFloat = 24
        /// 3x Extra large - 30pt
        public static let xl3: CGFloat = 30
        /// 4x Extra large - 36pt
        public static let xl4: CGFloat = 36
    }
    
    // MARK: - Font Weight
    
    /// Font weight values (numeric).
    public enum FontWeight {
        /// Regular weight - 400
        public static let regular: Int = 400
        /// Medium weight - 500
        public static let medium: Int = 500
        /// Semibold weight - 600
        public static let semibold: Int = 600
        /// Bold weight - 700
        public static let bold: Int = 700
        
        /// Convert numeric weight to SwiftUI Font.Weight
        public static func toSwiftUI(_ weight: Int) -> Font.Weight {
            switch weight {
            case 400: return .regular
            case 500: return .medium
            case 600: return .semibold
            case 700: return .bold
            default: return .regular
            }
        }
    }
    
    // MARK: - Line Height
    
    /// Line height multipliers.
    public enum LineHeight {
        /// Tight line height - 1.25
        public static let tight: CGFloat = 1.25
        /// Normal line height - 1.5
        public static let normal: CGFloat = 1.5
        /// Relaxed line height - 1.75
        public static let relaxed: CGFloat = 1.75
    }
}

// MARK: - Font Extension

extension Font {
    /// Create a custom font with Streamer Studio typography tokens.
    ///
    /// - Parameters:
    ///   - size: Font size from Typography.FontSize
    ///   - weight: Font weight from Typography.FontWeight
    ///   - family: Font family from Typography.FontFamily (defaults to primary)
    /// - Returns: A configured Font instance
    public static func streamerStudio(
        size: CGFloat,
        weight: Int = Typography.FontWeight.regular,
        family: String = Typography.FontFamily.primary
    ) -> Font {
        return .custom(family, size: size)
            .weight(Typography.FontWeight.toSwiftUI(weight))
    }
}
