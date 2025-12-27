//
//  BrandKitEditorView.swift
//  StreamerStudio
//
//  View for creating or editing a brand kit.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Brand Kit Editor Mode

/// Mode for the brand kit editor.
public enum BrandKitEditorMode: Identifiable {
    case create
    case edit(BrandKit)
    
    public var id: String {
        switch self {
        case .create:
            return "create"
        case .edit(let brandKit):
            return "edit-\(brandKit.id)"
        }
    }
}

// MARK: - Brand Kit Editor View

/// View for creating or editing a brand kit.
///
/// This view provides:
/// - Name input
/// - Primary and accent color management
/// - Font selection for headline and body
/// - Tone selection
/// - Style reference description
///
/// Usage:
/// ```swift
/// BrandKitEditorView(mode: .create) { brandKit in
///     print("Created: \(brandKit.name)")
/// }
/// ```
public struct BrandKitEditorView: View {
    
    // MARK: - Properties
    
    let mode: BrandKitEditorMode
    let onSave: (BrandKit) -> Void
    
    // MARK: - Environment
    
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - State
    
    @State private var viewModel = BrandKitViewModel()
    @State private var name = ""
    @State private var primaryColors: [String] = ["#FF5733"]
    @State private var accentColors: [String] = []
    @State private var headlineFont = "Inter"
    @State private var bodyFont = "Inter"
    @State private var tone: BrandKitTone = .professional
    @State private var styleReference = ""
    @State private var isSaving = false
    @State private var showingColorPicker = false
    @State private var editingColorIndex: Int?
    @State private var isEditingAccentColor = false
    
    // MARK: - Computed Properties
    
    private var isEditing: Bool {
        if case .edit = mode { return true }
        return false
    }
    
    private var title: String {
        isEditing ? "Edit Brand Kit" : "Create Brand Kit"
    }
    
    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !primaryColors.isEmpty
    }
    
    // MARK: - Initialization
    
    public init(mode: BrandKitEditorMode, onSave: @escaping (BrandKit) -> Void) {
        self.mode = mode
        self.onSave = onSave
    }
    
    // MARK: - Body
    
    public var body: some View {
        NavigationStack {
            Form {
                basicInfoSection
                primaryColorsSection
                accentColorsSection
                fontsSection
                toneSection
                styleReferenceSection
            }
            .navigationTitle(title)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await save()
                        }
                    }
                    .disabled(!isFormValid || isSaving)
                }
            }
            .onAppear {
                loadExistingData()
            }
            .alert("Error", isPresented: .constant(viewModel.error != nil)) {
                Button("OK") {
                    viewModel.clearError()
                }
            } message: {
                if let error = viewModel.error {
                    Text(error.localizedDescription)
                }
            }
        }
    }
    
    // MARK: - View Sections
    
    private var basicInfoSection: some View {
        Section {
            TextField("Brand Kit Name", text: $name)
                .accessibilityLabel("Brand kit name")
                .accessibilityHint("Enter a name for your brand kit")
        } header: {
            Text("Basic Info")
        }
    }
    
    private var primaryColorsSection: some View {
        Section {
            ForEach(Array(primaryColors.enumerated()), id: \.offset) { index, color in
                colorRow(color: color, index: index, isPrimary: true)
            }
            
            if primaryColors.count < 5 {
                Button {
                    primaryColors.append("#000000")
                } label: {
                    Label("Add Color", systemImage: "plus.circle")
                }
                .accessibilityLabel("Add primary color")
            }
        } header: {
            Text("Primary Colors")
        } footer: {
            Text("Add up to 5 primary colors for your brand")
        }
    }
    
    private var accentColorsSection: some View {
        Section {
            ForEach(Array(accentColors.enumerated()), id: \.offset) { index, color in
                colorRow(color: color, index: index, isPrimary: false)
            }
            
            if accentColors.count < 3 {
                Button {
                    accentColors.append("#000000")
                } label: {
                    Label("Add Accent Color", systemImage: "plus.circle")
                }
                .accessibilityLabel("Add accent color")
            }
        } header: {
            Text("Accent Colors")
        } footer: {
            Text("Optional accent colors for highlights")
        }
    }
    
    private func colorRow(color: String, index: Int, isPrimary: Bool) -> some View {
        HStack {
            Circle()
                .fill(Color.brandKitColor(from: color) ?? .gray)
                .frame(width: 30, height: 30)
                .overlay(
                    Circle()
                        .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                )
                .accessibilityHidden(true)
            
            TextField("Hex Color", text: isPrimary
                ? Binding(
                    get: { primaryColors[index] },
                    set: { primaryColors[index] = $0.uppercased() }
                )
                : Binding(
                    get: { accentColors[index] },
                    set: { accentColors[index] = $0.uppercased() }
                )
            )
            #if os(iOS)
            .textInputAutocapitalization(.characters)
            #endif
            .autocorrectionDisabled()
            .font(.system(.body, design: .monospaced))
            .accessibilityLabel("Hex color value")
            
            if isPrimary ? primaryColors.count > 1 : true {
                Button {
                    if isPrimary {
                        primaryColors.remove(at: index)
                    } else {
                        accentColors.remove(at: index)
                    }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .foregroundColor(.red)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove color")
            }
        }
    }
    
    private var fontsSection: some View {
        Section {
            Picker("Headline Font", selection: $headlineFont) {
                ForEach(supportedFonts, id: \.self) { font in
                    Text(font).tag(font)
                }
            }
            .accessibilityLabel("Headline font")
            .accessibilityHint("Select a font for headlines")
            
            Picker("Body Font", selection: $bodyFont) {
                ForEach(supportedFonts, id: \.self) { font in
                    Text(font).tag(font)
                }
            }
            .accessibilityLabel("Body font")
            .accessibilityHint("Select a font for body text")
        } header: {
            Text("Fonts")
        }
    }
    
    private var toneSection: some View {
        Section {
            Picker("Brand Tone", selection: $tone) {
                ForEach(BrandKitTone.allCases, id: \.self) { toneOption in
                    Text(toneOption.rawValue.capitalized).tag(toneOption)
                }
            }
            .accessibilityLabel("Brand tone")
            .accessibilityHint("Select the tone for your brand")
        } header: {
            Text("Tone")
        } footer: {
            Text(toneDescription)
        }
    }
    
    private var toneDescription: String {
        switch tone {
        case .competitive:
            return "High energy, intense, focused on winning"
        case .casual:
            return "Relaxed, friendly, approachable"
        case .educational:
            return "Informative, helpful, teaching-focused"
        case .comedic:
            return "Funny, entertaining, light-hearted"
        case .professional:
            return "Polished, business-like, authoritative"
        }
    }
    
    private var styleReferenceSection: some View {
        Section {
            TextField("Describe your brand style...", text: $styleReference, axis: .vertical)
                .lineLimit(3...6)
                .accessibilityLabel("Style reference")
                .accessibilityHint("Describe your brand's visual style")
        } header: {
            Text("Style Reference")
        } footer: {
            Text("Describe your brand's visual style, influences, or aesthetic goals")
        }
    }
    
    // MARK: - Actions
    
    private func loadExistingData() {
        if case .edit(let brandKit) = mode {
            name = brandKit.name
            primaryColors = brandKit.primaryColors
            accentColors = brandKit.accentColors
            headlineFont = brandKit.fonts.headline
            bodyFont = brandKit.fonts.body
            tone = brandKit.tone
            styleReference = brandKit.styleReference
        }
    }
    
    private func save() async {
        isSaving = true
        defer { isSaving = false }
        
        let fonts = BrandKitFonts(headline: headlineFont, body: bodyFont)
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        
        do {
            let brandKit: BrandKit
            
            if case .edit(let existing) = mode {
                let update = BrandKitUpdate(
                    name: trimmedName,
                    primaryColors: primaryColors,
                    accentColors: accentColors,
                    fonts: fonts,
                    tone: tone,
                    styleReference: styleReference
                )
                brandKit = try await viewModel.updateBrandKit(existing.id, data: update)
            } else {
                let create = BrandKitCreate(
                    name: trimmedName,
                    primaryColors: primaryColors,
                    accentColors: accentColors,
                    fonts: fonts,
                    tone: tone,
                    styleReference: styleReference
                )
                brandKit = try await viewModel.createBrandKit(create)
            }
            
            onSave(brandKit)
            dismiss()
        } catch {
            // Error is handled by viewModel
        }
    }
}

// MARK: - Preview

#Preview("Create Brand Kit") {
    BrandKitEditorView(mode: .create) { brandKit in
        print("Created: \(brandKit.name)")
    }
}

#Preview("Edit Brand Kit") {
    let fonts = BrandKitFonts(headline: "Montserrat", body: "Inter")
    let brandKit = BrandKit(
        id: "preview-id",
        userId: "user-id",
        name: "Gaming Brand",
        isActive: true,
        primaryColors: ["#FF5733", "#3498DB"],
        accentColors: ["#F1C40F"],
        fonts: fonts,
        tone: .competitive,
        styleReference: "Bold gaming style with vibrant colors"
    )
    
    return BrandKitEditorView(mode: .edit(brandKit)) { updated in
        print("Updated: \(updated.name)")
    }
}

#Preview("Create Brand Kit - Dark") {
    BrandKitEditorView(mode: .create) { brandKit in
        print("Created: \(brandKit.name)")
    }
    .preferredColorScheme(.dark)
}
