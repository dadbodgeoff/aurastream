//
//  GenerateView.swift
//  StreamerStudio
//
//  View for generating new assets.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Generate View

/// View for creating new asset generation jobs.
///
/// This view provides:
/// - Asset type selection (grid or segmented)
/// - Brand kit selection
/// - Brand customization options (colors, typography, voice, logo)
/// - Optional custom prompt input
/// - Generate button with loading state
/// - Navigation to job progress when generating
///
/// Usage:
/// ```swift
/// NavigationStack {
///     GenerateView()
/// }
/// ```
public struct GenerateView: View {
    
    // MARK: - State
    
    @State private var viewModel = GenerationViewModel()
    @State private var brandKitViewModel = BrandKitViewModel()
    @State private var selectedAssetType: AssetType = .thumbnail
    @State private var selectedBrandKitId: String?
    @State private var customPrompt: String = ""
    @State private var showingJobProgress = false
    @State private var isGenerating = false
    
    // Brand customization state
    @State private var brandCustomization = BrandCustomization()
    @State private var colorPalette: ColorPalette?
    @State private var typography: BrandTypography?
    @State private var voice: BrandVoice?
    
    // MARK: - Environment
    
    @Environment(\.dismiss) private var dismiss
    
    // MARK: - Initialization
    
    public init() {}
    
    // MARK: - Computed Properties
    
    private var canGenerate: Bool {
        selectedBrandKitId != nil && !isGenerating
    }
    
    private var selectedBrandKit: BrandKit? {
        brandKitViewModel.brandKits.first { $0.id == selectedBrandKitId }
    }
    
    // MARK: - Body
    
    public var body: some View {
        NavigationStack {
            Form {
                assetTypeSection
                brandKitSection
                brandCustomizationSection
                customPromptSection
                generateSection
            }
            .navigationTitle("Generate Asset")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .task {
                await brandKitViewModel.loadBrandKits()
                // Auto-select active brand kit
                if selectedBrandKitId == nil {
                    selectedBrandKitId = brandKitViewModel.activeBrandKit?.id ?? brandKitViewModel.brandKits.first?.id
                }
            }
            .sheet(isPresented: $showingJobProgress) {
                if let job = viewModel.currentJob {
                    JobProgressView(
                        viewModel: viewModel,
                        job: job
                    ) {
                        showingJobProgress = false
                        dismiss()
                    }
                }
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
    
    private var assetTypeSection: some View {
        Section {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(AssetType.allCases, id: \.self) { type in
                    AssetTypeCard(
                        type: type,
                        isSelected: selectedAssetType == type
                    )
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedAssetType = type
                        }
                    }
                }
            }
            .padding(.vertical, 8)
        } header: {
            Text("Asset Type")
        } footer: {
            Text("Select the type of asset you want to generate")
        }
    }
    
    private var brandKitSection: some View {
        Section {
            if brandKitViewModel.isLoading && brandKitViewModel.brandKits.isEmpty {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Loading brand kits...")
                        .foregroundColor(.secondary)
                }
            } else if brandKitViewModel.brandKits.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "paintpalette")
                        .font(.title2)
                        .foregroundColor(.secondary)
                    Text("No brand kits available")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("Create a brand kit first to generate assets")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            } else {
                Picker("Brand Kit", selection: $selectedBrandKitId) {
                    Text("Select a brand kit").tag(nil as String?)
                    ForEach(brandKitViewModel.brandKits) { brandKit in
                        HStack {
                            Text(brandKit.name)
                            if brandKit.isActive {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            }
                        }
                        .tag(brandKit.id as String?)
                    }
                }
                .accessibilityLabel("Brand kit selection")
                .accessibilityHint("Select a brand kit to use for generation")
                .onChange(of: selectedBrandKitId) { _, newValue in
                    // Reset customization when brand kit changes
                    brandCustomization = BrandCustomization()
                    colorPalette = nil
                    typography = nil
                    voice = nil
                }
                
                if let brandKit = selectedBrandKit {
                    BrandKitPreview(brandKit: brandKit)
                }
            }
        } header: {
            Text("Brand Kit")
        } footer: {
            Text("Your brand kit's colors, fonts, and style will be applied to the generated asset")
        }
    }
    
    @ViewBuilder
    private var brandCustomizationSection: some View {
        if let brandKit = selectedBrandKit {
            Section {
                BrandCustomizationView(
                    customization: $brandCustomization,
                    brandKit: brandKit,
                    colorPalette: colorPalette,
                    typography: typography,
                    voice: voice
                )
            } header: {
                Text("Customization")
            } footer: {
                Text("Fine-tune how your brand elements appear in the generated asset")
            }
        }
    }
    
    private var customPromptSection: some View {
        Section {
            TextField("Describe your vision...", text: $customPrompt, axis: .vertical)
                .lineLimit(3...6)
                .accessibilityLabel("Custom prompt")
                .accessibilityHint("Optional description to guide the generation")
        } header: {
            Text("Custom Prompt (Optional)")
        } footer: {
            Text("Add specific details or themes you want in your asset. Leave empty for AI to decide based on your brand kit.")
        }
    }
    
    private var generateSection: some View {
        Section {
            Button {
                Task {
                    await generate()
                }
            } label: {
                HStack {
                    Spacer()
                    if isGenerating {
                        ProgressView()
                            .tint(.white)
                        Text("Starting Generation...")
                    } else {
                        Image(systemName: "wand.and.stars")
                        Text("Generate \(selectedAssetType.displayName)")
                    }
                    Spacer()
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.vertical, 4)
            }
            .listRowBackground(canGenerate ? Color.accentColor : Color.gray)
            .disabled(!canGenerate)
            .accessibilityLabel("Generate asset")
            .accessibilityHint(canGenerate ? "Double tap to start generating" : "Select a brand kit first")
        } footer: {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "info.circle")
                    Text("Output: \(selectedAssetType.dimensions.width) × \(selectedAssetType.dimensions.height) pixels")
                }
                HStack {
                    Image(systemName: "clock")
                    Text("Generation typically takes 30-60 seconds")
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Actions
    
    private func generate() async {
        guard let brandKitId = selectedBrandKitId else { return }
        
        isGenerating = true
        defer { isGenerating = false }
        
        do {
            let prompt = customPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
            _ = try await viewModel.createJob(
                assetType: selectedAssetType,
                brandKitId: brandKitId,
                customPrompt: prompt.isEmpty ? nil : prompt,
                brandCustomization: brandCustomization
            )
            showingJobProgress = true
        } catch {
            // Error is handled by viewModel
        }
    }
}

// MARK: - Asset Type Card

/// Card view for selecting an asset type.
struct AssetTypeCard: View {
    let type: AssetType
    let isSelected: Bool
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: type.iconName)
                .font(.title2)
                .foregroundColor(isSelected ? .white : .accentColor)
            
            Text(type.displayName)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isSelected ? .white : .primary)
            
            Text(type.aspectRatioDescription)
                .font(.caption2)
                .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isSelected ? Color.accentColor : Color.secondary.opacity(0.15))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(type.displayName), \(type.aspectRatioDescription)")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Brand Kit Preview

/// Compact preview of a brand kit.
struct BrandKitPreview: View {
    let brandKit: BrandKit
    
    var body: some View {
        HStack(spacing: 12) {
            // Color swatches
            HStack(spacing: 4) {
                ForEach(Array(brandKit.primaryColors.prefix(4).enumerated()), id: \.offset) { _, color in
                    Circle()
                        .fill(Color.brandKitColor(from: color) ?? .gray)
                        .frame(width: 16, height: 16)
                }
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(brandKit.tone.rawValue.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("\(brandKit.fonts.headline) / \(brandKit.fonts.body)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Brand kit preview: \(brandKit.name), \(brandKit.tone.rawValue) tone")
    }
}

// MARK: - Preview

#Preview("Generate View") {
    GenerateView()
}

#Preview("Generate View - Dark") {
    GenerateView()
        .preferredColorScheme(.dark)
}

#Preview("Asset Type Card") {
    HStack(spacing: 12) {
        AssetTypeCard(type: .thumbnail, isSelected: true)
        AssetTypeCard(type: .banner, isSelected: false)
    }
    .padding()
}
