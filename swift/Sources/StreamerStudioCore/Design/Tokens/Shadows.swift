//
//  Shadows.swift
//  StreamerStudio
//
//  Design tokens for shadows - matches TSX design system exactly.
//

import SwiftUI

/// Shadow design tokens for Streamer Studio.
///
/// These values are synchronized with the TSX design system to ensure
/// visual consistency across all platforms.
///
/// Usage:
/// ```swift
/// .shadow(Shadows.md.color, radius: Shadows.md.radius, x: Shadows.md.x, y: Shadows.md.y)
/// ```
public enum Shadows {
    
    /// Shadow configuration struct
    public struct ShadowConfig {
        /// Shadow color
        public let color: Color
        /// Shadow blur radius
        public let radius: CGFloat
        /// Horizontal offset
        public let x: CGFloat
        /// Vertical offset
        public let y: CGFloat
        
        public init(color: Color, radius: CGFloat, x: CGFloat, y: CGFloat) {
            self.color = color
            self.radius = radius
            self.x = x
            self.y = y
        }
    }
    
    // MARK: - Shadow Definitions
    
    /// Small shadow - subtle elevation
    public static let sm = ShadowConfig(
        color: Color.black.opacity(0.05),
        radius: 2,
        x: 0,
        y: 1
    )
    
    /// Medium shadow - default elevation
    public static let md = ShadowConfig(
        color: Color.black.opacity(0.1),
        radius: 4,
        x: 0,
        y: 4
    )
    
    /// Large shadow - prominent elevation
    public static let lg = ShadowConfig(
        color: Color.black.opacity(0.1),
        radius: 8,
        x: 0,
        y: 10
    )
    
    /// Extra large shadow - maximum elevation
    public static let xl = ShadowConfig(
        color: Color.black.opacity(0.1),
        radius: 16,
        x: 0,
        y: 20
    )
    
    /// Inner shadow - inset effect
    public static let inner = ShadowConfig(
        color: Color.black.opacity(0.05),
        radius: 2,
        x: 0,
        y: 2
    )
    
    /// No shadow
    public static let none = ShadowConfig(
        color: Color.clear,
        radius: 0,
        x: 0,
        y: 0
    )
}

// MARK: - View Extension

extension View {
    /// Apply a Streamer Studio shadow to a view.
    ///
    /// - Parameter shadow: The shadow configuration to apply
    /// - Returns: A view with the shadow applied
    public func streamerShadow(_ shadow: Shadows.ShadowConfig) -> some View {
        self.shadow(
            color: shadow.color,
            radius: shadow.radius,
            x: shadow.x,
            y: shadow.y
        )
    }
}
