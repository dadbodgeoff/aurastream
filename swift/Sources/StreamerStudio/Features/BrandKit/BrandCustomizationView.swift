//
//  BrandCustomizationView.swift
//  StreamerStudio
//
//  SwiftUI view for brand customization during asset generation.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Brand Customization View

/// View for customizing brand elements during asset generation.
///
/// This view provides controls for:
/// - Color selection from brand palette
/// - Typography level selection
/// - Voice/tagline options
/// - Logo placement and sizing
/// - Brand intensity
///
/// Usage:
/// ```swift
/// @State private var customization = BrandCustomization()
///
/// BrandCustomizationView(
///     customization: $customization,
///     brandKit: selectedBrandKit,
///     colorPalette: palette,
///     typography: typography,
///     voice: voice
/// )
/// ```
public struct BrandCustomizationView: View {
    
    // MARK: - Bindings
    
    @Binding var customization: BrandCustomization
    
    // MARK: - Properties
    
    let brandKit: BrandKit
    let colorPalette: ColorPalette?
    let typography: BrandTypography?
    let voice: BrandVoice?
    
    // MARK: - State
    
    @State private var isExpanded = false
    
    // MARK: - Initialization
    
    public init(
        customization: Binding<BrandCustomization>,
        brandKit: BrandKit,
        colorPalette: ColorPalette? = nil,
        typography: BrandTypography? = nil,
        voice: BrandVoice? = nil
    ) {
        self._customization = customization
        self.brandKit = brandKit
        self.colorPalette = colorPalette
        self.typography = typography
        self.voice = voice
    }
    
    // MARK: - Body
    
    public var body: some View {
        DisclosureGroup(
            isExpanded: $isExpanded,
            content: {
                VStack(spacing: 16) {
                    brandIntensitySection
                    
                    if colorPalette != nil {
                        colorSelectionSection
                    }
                    
                    if typography != nil {
                        typographySection
                    }
                    
                    if voice != nil {
                        voiceSection
                    }
                    
                    logoSection
                }
                .padding(.top, 8)
            },
            label: {
                HStack {
                    Image(systemName: "paintbrush.pointed")
                        .foregroundColor(.accentColor)
                    Text("Brand Customization")
                        .font(.headline)
                }
            }
        )
        .accessibilityLabel("Brand customization options")
    }
    
    // MARK: - Brand Intensity Section
    
    private var brandIntensitySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Brand Intensity")
                .font(.subheadline)
                .fontWeight(.medium)
            
            Picker("Intensity", selection: brandIntensityBinding) {
                ForEach(BrandIntensity.allCases, id: \.self) { intensity in
                    Text(intensity.displayName)
                        .tag(intensity)
                }
            }
            .pickerStyle(.segmented)
            .accessibilityLabel("Brand intensity")
            .accessibilityHint("Controls how prominently brand elements appear")
            
            Text(customization.brandIntensity.description)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Color Selection Section
    
    private var colorSelectionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Colors")
                .font(.subheadline)
                .fontWeight(.medium)
            
            if let palette = colorPalette {
                ColorPaletteSelector(
                    palette: palette,
                    selection: colorSelectionBinding
                )
            }
        }
    }
    
    // MARK: - Typography Section
    
    private var typographySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Typography")
                .font(.subheadline)
                .fontWeight(.medium)
            
            Picker("Typography Level", selection: typographyLevelBinding) {
                ForEach(TypographyLevel.allCases, id: \.self) { level in
                    Text(level.displayName)
                        .tag(level)
                }
            }
            .pickerStyle(.menu)
            .accessibilityLabel("Typography level")
        }
    }
    
    // MARK: - Voice Section
    
    private var voiceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Voice & Messaging")
                .font(.subheadline)
                .fontWeight(.medium)
            
            if let voice = voice {
                VoiceOptionsView(
                    voice: voice,
                    useTagline: useTaglineBinding,
                    catchphraseIndex: catchphraseIndexBinding
                )
            }
        }
    }
    
    // MARK: - Logo Section
    
    private var logoSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle(isOn: includeLogoBinding) {
                HStack {
                    Image(systemName: "photo.badge.checkmark")
                    Text("Include Logo")
                }
            }
            .accessibilityLabel("Include logo in generated asset")
            
            if customization.includeLogo {
                logoOptionsView
            }
        }
    }
    
    private var logoOptionsView: some View {
        VStack(spacing: 12) {
            // Logo Type
            HStack {
                Text("Type")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Picker("Logo Type", selection: logoTypeBinding) {
                    ForEach(LogoType.allCases, id: \.self) { type in
                        Text(type.displayName)
                            .tag(type)
                    }
                }
                .pickerStyle(.menu)
                .labelsHidden()
            }
            
            // Logo Position
            HStack {
                Text("Position")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Picker("Logo Position", selection: logoPositionBinding) {
                    ForEach(LogoPosition.allCases, id: \.self) { position in
                        Text(position.displayName)
                            .tag(position)
                    }
                }
                .pickerStyle(.menu)
                .labelsHidden()
            }
            
            // Logo Size
            HStack {
                Text("Size")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Picker("Logo Size", selection: logoSizeBinding) {
                    ForEach(LogoSize.allCases, id: \.self) { size in
                        Text(size.displayName)
                            .tag(size)
                    }
                }
                .pickerStyle(.segmented)
            }
        }
        .padding(.leading, 24)
    }
    
    // MARK: - Bindings
    
    private var brandIntensityBinding: Binding<BrandIntensity> {
        Binding(
            get: { customization.brandIntensity },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: customization.typography,
                    voice: customization.voice,
                    includeLogo: customization.includeLogo,
                    logoType: customization.logoType,
                    logoPosition: customization.logoPosition,
                    logoSize: customization.logoSize,
                    brandIntensity: newValue
                )
            }
        )
    }
    
    private var colorSelectionBinding: Binding<ColorSelection> {
        Binding(
            get: { customization.colors ?? ColorSelection() },
            set: { newValue in
                customization = BrandCustomization(
                    colors: newValue,
                    typography: customization.typography,
                    voice: customization.voice,
                    includeLogo: customization.includeLogo,
                    logoType: customization.logoType,
                    logoPosition: customization.logoPosition,
                    logoSize: customization.logoSize,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
    
    private var typographyLevelBinding: Binding<TypographyLevel> {
        Binding(
            get: { customization.typography?.level ?? .headline },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: TypographySelection(level: newValue),
                    voice: customization.voice,
                    includeLogo: customization.includeLogo,
                    logoType: customization.logoType,
                    logoPosition: customization.logoPosition,
                    logoSize: customization.logoSize,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
    
    private var useTaglineBinding: Binding<Bool> {
        Binding(
            get: { customization.voice?.useTagline ?? false },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: customization.typography,
                    voice: VoiceSelection(
                        useTagline: newValue,
                        useCatchphrase: customization.voice?.useCatchphrase
                    ),
                    includeLogo: customization.includeLogo,
                    logoType: customization.logoType,
                    logoPosition: customization.logoPosition,
                    logoSize: customization.logoSize,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
    
    private var catchphraseIndexBinding: Binding<Int?> {
        Binding(
            get: { customization.voice?.useCatchphrase },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: customization.typography,
                    voice: VoiceSelection(
                        useTagline: customization.voice?.useTagline ?? false,
                        useCatchphrase: newValue
                    ),
                    includeLogo: customization.includeLogo,
                    logoType: customization.logoType,
                    logoPosition: customization.logoPosition,
                    logoSize: customization.logoSize,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
    
    private var includeLogoBinding: Binding<Bool> {
        Binding(
            get: { customization.includeLogo },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: customization.typography,
                    voice: customization.voice,
                    includeLogo: newValue,
                    logoType: customization.logoType,
                    logoPosition: customization.logoPosition,
                    logoSize: customization.logoSize,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
    
    private var logoTypeBinding: Binding<LogoType> {
        Binding(
            get: { customization.logoType },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: customization.typography,
                    voice: customization.voice,
                    includeLogo: customization.includeLogo,
                    logoType: newValue,
                    logoPosition: customization.logoPosition,
                    logoSize: customization.logoSize,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
    
    private var logoPositionBinding: Binding<LogoPosition> {
        Binding(
            get: { customization.logoPosition },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: customization.typography,
                    voice: customization.voice,
                    includeLogo: customization.includeLogo,
                    logoType: customization.logoType,
                    logoPosition: newValue,
                    logoSize: customization.logoSize,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
    
    private var logoSizeBinding: Binding<LogoSize> {
        Binding(
            get: { customization.logoSize },
            set: { newValue in
                customization = BrandCustomization(
                    colors: customization.colors,
                    typography: customization.typography,
                    voice: customization.voice,
                    includeLogo: customization.includeLogo,
                    logoType: customization.logoType,
                    logoPosition: customization.logoPosition,
                    logoSize: newValue,
                    brandIntensity: customization.brandIntensity
                )
            }
        )
    }
}

// MARK: - Color Palette Selector

/// Selector for choosing colors from a brand palette.
struct ColorPaletteSelector: View {
    let palette: ColorPalette
    @Binding var selection: ColorSelection
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !palette.primary.isEmpty {
                colorRow(title: "Primary", colors: palette.primary, selectedIndex: selection.primaryIndex) { index in
                    selection = ColorSelection(
                        primaryIndex: index ?? 0,
                        secondaryIndex: selection.secondaryIndex,
                        accentIndex: selection.accentIndex,
                        useGradient: selection.useGradient
                    )
                }
            }
            
            if !palette.secondary.isEmpty {
                colorRow(title: "Secondary", colors: palette.secondary, selectedIndex: selection.secondaryIndex) { index in
                    selection = ColorSelection(
                        primaryIndex: selection.primaryIndex,
                        secondaryIndex: index,
                        accentIndex: selection.accentIndex,
                        useGradient: selection.useGradient
                    )
                }
            }
            
            if !palette.accent.isEmpty {
                colorRow(title: "Accent", colors: palette.accent, selectedIndex: selection.accentIndex) { index in
                    selection = ColorSelection(
                        primaryIndex: selection.primaryIndex,
                        secondaryIndex: selection.secondaryIndex,
                        accentIndex: index,
                        useGradient: selection.useGradient
                    )
                }
            }
            
            if !palette.gradients.isEmpty {
                gradientRow
            }
        }
    }
    
    private func colorRow(
        title: String,
        colors: [ExtendedColor],
        selectedIndex: Int?,
        onSelect: @escaping (Int?) -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(colors.enumerated()), id: \.offset) { index, color in
                        ColorSwatch(
                            color: Color(hex: color.hex) ?? .gray,
                            name: color.name,
                            isSelected: selectedIndex == index
                        )
                        .onTapGesture {
                            onSelect(selectedIndex == index ? nil : index)
                        }
                    }
                }
            }
        }
    }
    
    private var gradientRow: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Gradients")
                .font(.caption)
                .foregroundColor(.secondary)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(palette.gradients.enumerated()), id: \.offset) { index, gradient in
                        GradientSwatch(
                            gradient: gradient,
                            isSelected: selection.useGradient == index
                        )
                        .onTapGesture {
                            selection = ColorSelection(
                                primaryIndex: selection.primaryIndex,
                                secondaryIndex: selection.secondaryIndex,
                                accentIndex: selection.accentIndex,
                                useGradient: selection.useGradient == index ? nil : index
                            )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Color Swatch

/// Individual color swatch for selection.
struct ColorSwatch: View {
    let color: Color
    let name: String
    let isSelected: Bool
    
    var body: some View {
        VStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 32, height: 32)
                .overlay(
                    Circle()
                        .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 3)
                )
                .overlay(
                    isSelected ? Image(systemName: "checkmark")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white) : nil
                )
            
            Text(name)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .frame(width: 48)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(name) color")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Gradient Swatch

/// Gradient swatch for selection.
struct GradientSwatch: View {
    let gradient: BrandGradient
    let isSelected: Bool
    
    private var swiftUIGradient: LinearGradient {
        let colors = gradient.stops.sorted { $0.position < $1.position }
            .map { Color(hex: $0.color) ?? .gray }
        return LinearGradient(
            colors: colors,
            startPoint: .leading,
            endPoint: .trailing
        )
    }
    
    var body: some View {
        VStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 6)
                .fill(swiftUIGradient)
                .frame(width: 48, height: 32)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 3)
                )
            
            Text(gradient.name)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .frame(width: 56)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(gradient.name) gradient")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Voice Options View

/// View for selecting voice/messaging options.
struct VoiceOptionsView: View {
    let voice: BrandVoice
    @Binding var useTagline: Bool
    @Binding var catchphraseIndex: Int?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let tagline = voice.tagline, !tagline.isEmpty {
                Toggle(isOn: $useTagline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Use Tagline")
                            .font(.caption)
                        Text("\"\(tagline)\"")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
            }
            
            if !voice.catchphrases.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Catchphrase")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Picker("Catchphrase", selection: catchphraseBinding) {
                        Text("None").tag(-1)
                        ForEach(Array(voice.catchphrases.enumerated()), id: \.offset) { index, phrase in
                            Text(phrase).tag(index)
                        }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                }
            }
        }
    }
    
    private var catchphraseBinding: Binding<Int> {
        Binding(
            get: { catchphraseIndex ?? -1 },
            set: { newValue in
                catchphraseIndex = newValue == -1 ? nil : newValue
            }
        )
    }
}

// MARK: - Display Name Extensions

extension BrandIntensity {
    var displayName: String {
        switch self {
        case .subtle: return "Subtle"
        case .balanced: return "Balanced"
        case .strong: return "Strong"
        }
    }
    
    var description: String {
        switch self {
        case .subtle: return "Light brand presence, focus on content"
        case .balanced: return "Balanced mix of brand and content"
        case .strong: return "Bold brand presence throughout"
        }
    }
}

extension TypographyLevel {
    var displayName: String {
        switch self {
        case .display: return "Display"
        case .headline: return "Headline"
        case .subheadline: return "Subheadline"
        case .body: return "Body"
        case .caption: return "Caption"
        case .accent: return "Accent"
        }
    }
}

extension LogoType {
    var displayName: String {
        switch self {
        case .primary: return "Primary"
        case .secondary: return "Secondary"
        case .icon: return "Icon"
        case .watermark: return "Watermark"
        }
    }
}

extension LogoPosition {
    var displayName: String {
        switch self {
        case .topLeft: return "Top Left"
        case .topRight: return "Top Right"
        case .bottomLeft: return "Bottom Left"
        case .bottomRight: return "Bottom Right"
        case .center: return "Center"
        }
    }
}

extension LogoSize {
    var displayName: String {
        switch self {
        case .small: return "S"
        case .medium: return "M"
        case .large: return "L"
        }
    }
}

// MARK: - Color Extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
            return nil
        }
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Previews

#Preview("Brand Customization View") {
    struct PreviewWrapper: View {
        @State private var customization = BrandCustomization()
        
        var body: some View {
            Form {
                BrandCustomizationView(
                    customization: $customization,
                    brandKit: .preview,
                    colorPalette: .preview,
                    typography: .preview,
                    voice: .preview
                )
            }
        }
    }
    
    return PreviewWrapper()
}

#Preview("Brand Customization - Minimal") {
    struct PreviewWrapper: View {
        @State private var customization = BrandCustomization()
        
        var body: some View {
            Form {
                BrandCustomizationView(
                    customization: $customization,
                    brandKit: .preview
                )
            }
        }
    }
    
    return PreviewWrapper()
}

// MARK: - Preview Helpers

extension BrandKit {
    static var preview: BrandKit {
        BrandKit(
            id: "preview-id",
            userId: "user-id",
            name: "Preview Brand",
            primaryColors: ["#FF5733", "#3498DB"],
            fonts: BrandKitFonts(headline: "Montserrat", body: "Inter"),
            tone: .competitive
        )
    }
}

extension ColorPalette {
    static var preview: ColorPalette {
        ColorPalette(
            primary: [
                ExtendedColor(hex: "#FF5733", name: "Coral", usage: "Main brand color"),
                ExtendedColor(hex: "#3498DB", name: "Sky Blue", usage: "Secondary")
            ],
            secondary: [
                ExtendedColor(hex: "#2ECC71", name: "Emerald"),
                ExtendedColor(hex: "#9B59B6", name: "Amethyst")
            ],
            accent: [
                ExtendedColor(hex: "#F1C40F", name: "Sunflower")
            ],
            gradients: [
                BrandGradient(
                    name: "Sunset",
                    type: .linear,
                    angle: 135,
                    stops: [
                        GradientStop(color: "#FF5733", position: 0),
                        GradientStop(color: "#F1C40F", position: 100)
                    ]
                )
            ]
        )
    }
}

extension BrandTypography {
    static var preview: BrandTypography {
        BrandTypography(
            display: FontConfig(family: "Montserrat", weight: 700),
            headline: FontConfig(family: "Montserrat", weight: 600),
            body: FontConfig(family: "Inter", weight: 400)
        )
    }
}

extension BrandVoice {
    static var preview: BrandVoice {
        BrandVoice(
            tone: .competitive,
            personalityTraits: ["Bold", "Energetic", "Confident"],
            tagline: "Level Up Your Stream",
            catchphrases: ["Let's Go!", "GG EZ", "Time to dominate"],
            contentThemes: ["Gaming", "Competition", "Victory"]
        )
    }
}
