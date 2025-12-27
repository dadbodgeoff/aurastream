//
//  Spacing.swift
//  StreamerStudio
//
//  Design tokens for spacing, radius, and z-index - matches TSX design system exactly.
//

import SwiftUI

/// Spacing design tokens for Streamer Studio.
///
/// These values are synchronized with the TSX design system to ensure
/// visual consistency across all platforms.
///
/// Usage:
/// ```swift
/// .padding(Spacing.scale4)
/// .cornerRadius(Spacing.Radius.md)
/// ```
public enum Spacing {
    
    // MARK: - Spacing Scale
    
    /// No spacing - 0pt
    public static let scale0: CGFloat = 0
    /// Scale 1 - 4pt
    public static let scale1: CGFloat = 4
    /// Scale 2 - 8pt
    public static let scale2: CGFloat = 8
    /// Scale 3 - 12pt
    public static let scale3: CGFloat = 12
    /// Scale 4 - 16pt
    public static let scale4: CGFloat = 16
    /// Scale 5 - 20pt
    public static let scale5: CGFloat = 20
    /// Scale 6 - 24pt
    public static let scale6: CGFloat = 24
    /// Scale 8 - 32pt
    public static let scale8: CGFloat = 32
    /// Scale 10 - 40pt
    public static let scale10: CGFloat = 40
    /// Scale 12 - 48pt
    public static let scale12: CGFloat = 48
    /// Scale 16 - 64pt
    public static let scale16: CGFloat = 64
    /// Scale 20 - 80pt
    public static let scale20: CGFloat = 80
    /// Scale 24 - 96pt
    public static let scale24: CGFloat = 96
    
    // MARK: - Border Radius
    
    /// Border radius values for rounded corners.
    public enum Radius {
        /// No radius - 0pt
        public static let none: CGFloat = 0
        /// Small radius - 4pt
        public static let sm: CGFloat = 4
        /// Medium radius - 8pt
        public static let md: CGFloat = 8
        /// Large radius - 12pt
        public static let lg: CGFloat = 12
        /// Extra large radius - 16pt
        public static let xl: CGFloat = 16
        /// 2x Extra large radius - 24pt
        public static let xl2: CGFloat = 24
        /// Full radius (circular) - 9999pt
        public static let full: CGFloat = 9999
    }
    
    // MARK: - Z-Index
    
    /// Z-index values for layering elements.
    public enum ZIndex {
        /// Dropdown menus
        public static let dropdown: Double = 1000
        /// Sticky elements
        public static let sticky: Double = 1100
        /// Modal dialogs
        public static let modal: Double = 1200
        /// Popovers
        public static let popover: Double = 1300
        /// Tooltips
        public static let tooltip: Double = 1400
    }
}
