//
//  Colors.swift
//  StreamerStudio
//
//  Design tokens for colors - matches TSX design system exactly.
//

import SwiftUI

/// Color design tokens for Streamer Studio.
///
/// These values are synchronized with the TSX design system to ensure
/// visual consistency across all platforms.
///
/// Usage:
/// ```swift
/// Color(hex: Colors.Primary.main)
/// Color(hex: Colors.Background.primary)
/// ```
public enum Colors {
    
    // MARK: - Primary Colors
    
    /// Primary brand colors used for main interactive elements.
    public enum Primary {
        /// Main primary color - Indigo
        public static let main = "#6366F1"
        /// Lighter variant for hover states
        public static let light = "#818CF8"
        /// Darker variant for pressed states
        public static let dark = "#4F46E5"
        /// Contrast color for text on primary backgrounds
        public static let contrast = "#FFFFFF"
    }
    
    // MARK: - Accent Colors
    
    /// Accent colors for highlights and call-to-action elements.
    public enum Accent {
        /// Main accent color - Amber
        public static let main = "#F59E0B"
        /// Lighter variant for hover states
        public static let light = "#FBBF24"
        /// Darker variant for pressed states
        public static let dark = "#D97706"
        /// Contrast color for text on accent backgrounds
        public static let contrast = "#000000"
    }
    
    // MARK: - Background Colors
    
    /// Background colors for different surface levels.
    public enum Background {
        /// Primary background - darkest
        public static let primary = "#0F0F0F"
        /// Secondary background - slightly lighter
        public static let secondary = "#1A1A1A"
        /// Tertiary background - for cards and sections
        public static let tertiary = "#262626"
        /// Elevated background - for modals and popovers
        public static let elevated = "#2D2D2D"
    }
    
    // MARK: - Text Colors
    
    /// Text colors for different emphasis levels.
    public enum Text {
        /// Primary text - highest contrast
        public static let primary = "#FFFFFF"
        /// Secondary text - medium emphasis
        public static let secondary = "#A3A3A3"
        /// Tertiary text - low emphasis
        public static let tertiary = "#737373"
        /// Disabled text - lowest emphasis
        public static let disabled = "#525252"
    }
    
    // MARK: - Semantic Colors
    
    /// Semantic colors for status and feedback.
    public enum Semantic {
        /// Success state - Green
        public static let success = "#22C55E"
        /// Warning state - Amber
        public static let warning = "#F59E0B"
        /// Error state - Red
        public static let error = "#EF4444"
        /// Info state - Blue
        public static let info = "#3B82F6"
    }
    
    // MARK: - Border Colors
    
    /// Border colors for different states.
    public enum Border {
        /// Default border color
        public static let `default` = "#404040"
        /// Focus state border color
        public static let focus = "#6366F1"
        /// Error state border color
        public static let error = "#EF4444"
    }
}

// MARK: - Color Extension

extension Color {
    /// Initialize a Color from a hex string.
    ///
    /// - Parameter hex: A hex color string (e.g., "#6366F1" or "6366F1")
    public init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
