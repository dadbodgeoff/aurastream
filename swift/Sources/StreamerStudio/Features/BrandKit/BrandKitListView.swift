//
//  BrandKitListView.swift
//  StreamerStudio
//
//  View for displaying a list of brand kits.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Brand Kit List View

/// View for displaying a list of brand kits.
///
/// This view provides:
/// - List of all user's brand kits
/// - Visual preview of colors
/// - Active brand kit indicator
/// - Swipe actions for delete and activate
/// - Pull to refresh
/// - Navigation to create/edit brand kits
///
/// Usage:
/// ```swift
/// NavigationStack {
///     BrandKitListView()
/// }
/// ```
public struct BrandKitListView: View {
    
    // MARK: - State
    
    @State private var viewModel = BrandKitViewModel()
    @State private var showingCreateSheet = false
    @State private var selectedBrandKit: BrandKit?
    
    // MARK: - Initialization
    
    public init() {}
    
    // MARK: - Body
    
    public var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.brandKits.isEmpty {
                    loadingView
                } else if viewModel.brandKits.isEmpty {
                    emptyStateView
                } else {
                    brandKitList
                }
            }
            .navigationTitle("Brand Kits")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingCreateSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Create brand kit")
                    .accessibilityHint("Double tap to create a new brand kit")
                }
            }
            .refreshable {
                await viewModel.loadBrandKits()
            }
            .task {
                await viewModel.loadBrandKits()
            }
            .sheet(isPresented: $showingCreateSheet) {
                BrandKitEditorView(mode: .create) { _ in
                    Task {
                        await viewModel.loadBrandKits()
                    }
                }
            }
            .sheet(item: $selectedBrandKit) { brandKit in
                BrandKitEditorView(mode: .edit(brandKit)) { _ in
                    Task {
                        await viewModel.loadBrandKits()
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
    
    // MARK: - View Components
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading brand kits...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyStateView: some View {
        ContentUnavailableView(
            "No Brand Kits",
            systemImage: "paintpalette",
            description: Text("Create your first brand kit to get started")
        )
    }
    
    private var brandKitList: some View {
        List {
            ForEach(viewModel.brandKits) { brandKit in
                BrandKitRow(brandKit: brandKit)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedBrandKit = brandKit
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            Task {
                                try? await viewModel.deleteBrandKit(brandKit.id)
                            }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        
                        if !brandKit.isActive {
                            Button {
                                Task {
                                    try? await viewModel.activateBrandKit(brandKit.id)
                                }
                            } label: {
                                Label("Activate", systemImage: "checkmark.circle")
                            }
                            .tint(.green)
                        }
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(brandKit.name), \(brandKit.tone.rawValue) tone\(brandKit.isActive ? ", active" : "")")
                    .accessibilityHint("Double tap to edit")
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
    }
}

// MARK: - Brand Kit Row

/// Row view for a single brand kit.
public struct BrandKitRow: View {
    
    let brandKit: BrandKit
    
    public init(brandKit: BrandKit) {
        self.brandKit = brandKit
    }
    
    public var body: some View {
        HStack(spacing: 12) {
            // Color preview
            colorPreview
            
            // Brand kit info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(brandKit.name)
                        .font(.headline)
                        .lineLimit(1)
                    
                    if brandKit.isActive {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                            .accessibilityLabel("Active")
                    }
                }
                
                Text(brandKit.tone.rawValue.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
                .font(.caption)
        }
        .padding(.vertical, 4)
    }
    
    private var colorPreview: some View {
        HStack(spacing: 2) {
            ForEach(Array(brandKit.primaryColors.prefix(3).enumerated()), id: \.offset) { _, color in
                Circle()
                    .fill(Color.brandKitColor(from: color) ?? .gray)
                    .frame(width: 20, height: 20)
            }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Color Extension for Brand Kit

extension Color {
    /// Initialize a Color from a hex string for brand kit colors.
    /// - Parameter hex: Hex color string (with or without #)
    /// - Returns: A Color if the hex string is valid, nil otherwise
    static func brandKitColor(from hex: String) -> Color? {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        guard hexSanitized.count == 6 else { return nil }
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        return Color(
            red: Double((rgb & 0xFF0000) >> 16) / 255.0,
            green: Double((rgb & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgb & 0x0000FF) / 255.0
        )
    }
}

// MARK: - Preview

#Preview("Brand Kit List") {
    BrandKitListView()
}

#Preview("Brand Kit List - Dark") {
    BrandKitListView()
        .preferredColorScheme(.dark)
}

#Preview("Brand Kit Row") {
    let fonts = BrandKitFonts(headline: "Montserrat", body: "Inter")
    let brandKit = BrandKit(
        id: "preview-id",
        userId: "user-id",
        name: "Gaming Brand",
        isActive: true,
        primaryColors: ["#FF5733", "#3498DB", "#2ECC71"],
        fonts: fonts,
        tone: .competitive,
        styleReference: "Bold gaming style"
    )
    
    return List {
        BrandKitRow(brandKit: brandKit)
    }
}
