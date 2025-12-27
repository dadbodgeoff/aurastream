//
//  AssetGalleryView.swift
//  StreamerStudio
//
//  View for displaying and managing generated assets.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Asset Gallery View

/// View for displaying a gallery of generated assets.
///
/// This view provides:
/// - Grid layout of asset thumbnails
/// - Filter by asset type
/// - Pull to refresh
/// - Empty state handling
/// - Asset detail sheet with actions
///
/// Usage:
/// ```swift
/// NavigationStack {
///     AssetGalleryView()
/// }
/// ```
public struct AssetGalleryView: View {
    
    // MARK: - State
    
    @State private var viewModel = GenerationViewModel()
    @State private var selectedAssetType: AssetType?
    @State private var selectedAsset: Asset?
    @State private var showingGenerateSheet = false
    @State private var searchText = ""
    
    // MARK: - Grid Configuration
    
    private let columns = [
        GridItem(.adaptive(minimum: 150, maximum: 200), spacing: 12)
    ]
    
    // MARK: - Computed Properties
    
    private var filteredAssets: [Asset] {
        var assets = viewModel.assets
        
        if let type = selectedAssetType {
            assets = assets.filter { $0.assetType == type }
        }
        
        if !searchText.isEmpty {
            assets = assets.filter { asset in
                asset.assetType.displayName.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return assets
    }
    
    // MARK: - Initialization
    
    public init() {}
    
    // MARK: - Body
    
    public var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.assets.isEmpty {
                    loadingView
                } else if viewModel.assets.isEmpty {
                    emptyStateView
                } else {
                    assetGrid
                }
            }
            .navigationTitle("Assets")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingGenerateSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Generate new asset")
                }
                
                ToolbarItem(placement: .secondaryAction) {
                    filterMenu
                }
            }
            .searchable(text: $searchText, prompt: "Search assets")
            .refreshable {
                await viewModel.loadAssets()
            }
            .task {
                await viewModel.loadAssets()
            }
            .sheet(item: $selectedAsset) { asset in
                AssetDetailView(
                    asset: asset,
                    viewModel: viewModel
                ) {
                    selectedAsset = nil
                }
            }
            .sheet(isPresented: $showingGenerateSheet) {
                GenerateView()
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
            Text("Loading assets...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Assets", systemImage: "photo.stack")
        } description: {
            Text("Generate your first asset to get started")
        } actions: {
            Button {
                showingGenerateSheet = true
            } label: {
                Label("Generate Asset", systemImage: "wand.and.stars")
            }
            .buttonStyle(.borderedProminent)
        }
    }
    
    private var assetGrid: some View {
        ScrollView {
            if filteredAssets.isEmpty {
                ContentUnavailableView.search(text: searchText.isEmpty ? (selectedAssetType?.displayName ?? "") : searchText)
                    .padding(.top, 60)
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(filteredAssets) { asset in
                        AssetThumbnail(asset: asset)
                            .onTapGesture {
                                selectedAsset = asset
                            }
                            .contextMenu {
                                assetContextMenu(for: asset)
                            }
                    }
                }
                .padding()
            }
        }
    }
    
    private var filterMenu: some View {
        Menu {
            Button {
                selectedAssetType = nil
            } label: {
                HStack {
                    Text("All Types")
                    if selectedAssetType == nil {
                        Image(systemName: "checkmark")
                    }
                }
            }
            
            Divider()
            
            ForEach(AssetType.allCases, id: \.self) { type in
                Button {
                    selectedAssetType = type
                } label: {
                    HStack {
                        Label(type.displayName, systemImage: type.iconName)
                        if selectedAssetType == type {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            Image(systemName: selectedAssetType == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
        }
        .accessibilityLabel("Filter assets")
    }
    
    @ViewBuilder
    private func assetContextMenu(for asset: Asset) -> some View {
        Button {
            Task {
                try? await viewModel.toggleAssetVisibility(asset)
            }
        } label: {
            Label(
                asset.isPublic ? "Make Private" : "Make Public",
                systemImage: asset.isPublic ? "lock" : "globe"
            )
        }
        
        Button(role: .destructive) {
            Task {
                try? await viewModel.deleteAsset(asset.id)
            }
        } label: {
            Label("Delete", systemImage: "trash")
        }
    }
}

// MARK: - Asset Thumbnail

/// Thumbnail view for an asset in the grid.
struct AssetThumbnail: View {
    let asset: Asset
    
    var body: some View {
        VStack(spacing: 8) {
            // Thumbnail image
            AsyncImage(url: URL(string: asset.url)) { phase in
                switch phase {
                case .empty:
                    ZStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                        ProgressView()
                    }
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    ZStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                        Image(systemName: "photo")
                            .font(.title)
                            .foregroundColor(.secondary)
                    }
                @unknown default:
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                }
            }
            .aspectRatio(aspectRatio, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.gray.opacity(0.3), lineWidth: 0.5)
            )
            
            // Asset info
            HStack {
                Image(systemName: asset.assetType.iconName)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                
                Text(asset.assetType.displayName)
                    .font(.caption)
                    .lineLimit(1)
                
                Spacer()
                
                if asset.isPublic {
                    Image(systemName: "globe")
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
                
                if let score = asset.viralScore {
                    HStack(spacing: 2) {
                        Image(systemName: "flame.fill")
                            .font(.caption2)
                        Text("\(score)")
                            .font(.caption2)
                    }
                    .foregroundColor(viralScoreColor(score))
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(asset.assetType.displayName), \(asset.dimensionsString)\(asset.isPublic ? ", public" : "")")
        .accessibilityHint("Double tap to view details")
    }
    
    private var aspectRatio: CGFloat {
        CGFloat(asset.width) / CGFloat(asset.height)
    }
    
    private func viralScoreColor(_ score: Int) -> Color {
        switch score {
        case 80...100:
            return .orange
        case 60..<80:
            return .yellow
        default:
            return .secondary
        }
    }
}

// MARK: - Asset Detail View

/// Detail view for a single asset with actions.
struct AssetDetailView: View {
    let asset: Asset
    @Bindable var viewModel: GenerationViewModel
    let onDismiss: () -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var showingDeleteConfirmation = false
    @State private var showingShareSheet = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Asset image
                    AsyncImage(url: URL(string: asset.url)) { phase in
                        switch phase {
                        case .empty:
                            ZStack {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .aspectRatio(aspectRatio, contentMode: .fit)
                                ProgressView()
                            }
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                        case .failure:
                            ZStack {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .aspectRatio(aspectRatio, contentMode: .fit)
                                VStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.triangle")
                                        .font(.title)
                                    Text("Failed to load image")
                                        .font(.caption)
                                }
                                .foregroundColor(.secondary)
                            }
                        @unknown default:
                            Rectangle()
                                .fill(Color.gray.opacity(0.2))
                                .aspectRatio(aspectRatio, contentMode: .fit)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
                    .padding(.horizontal)
                    
                    // Asset info
                    VStack(spacing: 16) {
                        infoSection
                        actionButtons
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle(asset.assetType.displayName)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .confirmationDialog(
                "Delete Asset",
                isPresented: $showingDeleteConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    Task {
                        try? await viewModel.deleteAsset(asset.id)
                        onDismiss()
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This action cannot be undone.")
            }
        }
    }
    
    private var aspectRatio: CGFloat {
        CGFloat(asset.width) / CGFloat(asset.height)
    }
    
    private var infoSection: some View {
        VStack(spacing: 12) {
            // Dimensions and size
            HStack {
                InfoItem(
                    icon: "aspectratio",
                    title: "Dimensions",
                    value: asset.dimensionsString
                )
                
                Spacer()
                
                InfoItem(
                    icon: "doc",
                    title: "Size",
                    value: asset.formattedFileSize
                )
            }
            
            Divider()
            
            // Visibility and viral score
            HStack {
                InfoItem(
                    icon: asset.isPublic ? "globe" : "lock",
                    title: "Visibility",
                    value: asset.isPublic ? "Public" : "Private"
                )
                
                Spacer()
                
                if let score = asset.viralScore {
                    InfoItem(
                        icon: "flame.fill",
                        title: "Viral Score",
                        value: "\(score)/100"
                    )
                }
            }
            
            Divider()
            
            // Created date
            HStack {
                InfoItem(
                    icon: "calendar",
                    title: "Created",
                    value: asset.createdAt.formatted(date: .abbreviated, time: .shortened)
                )
                
                Spacer()
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private var actionButtons: some View {
        VStack(spacing: 12) {
            // Primary actions
            HStack(spacing: 12) {
                Button {
                    // Download action
                    downloadAsset()
                } label: {
                    Label("Download", systemImage: "arrow.down.circle")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                
                Button {
                    showingShareSheet = true
                } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
            }
            
            // Secondary actions
            HStack(spacing: 12) {
                Button {
                    Task {
                        try? await viewModel.toggleAssetVisibility(asset)
                    }
                } label: {
                    Label(
                        asset.isPublic ? "Make Private" : "Make Public",
                        systemImage: asset.isPublic ? "lock" : "globe"
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
                
                Button(role: .destructive) {
                    showingDeleteConfirmation = true
                } label: {
                    Label("Delete", systemImage: "trash")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
        }
    }
    
    private func downloadAsset() {
        // In a real app, this would download the asset
        // For now, we'll just open the URL
        if let url = URL(string: asset.url) {
            #if os(iOS)
            UIApplication.shared.open(url)
            #elseif os(macOS)
            NSWorkspace.shared.open(url)
            #endif
        }
    }
}

// MARK: - Info Item

/// Small info item for displaying asset metadata.
struct InfoItem: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                Text(title)
                    .font(.caption)
            }
            .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title): \(value)")
    }
}

// MARK: - Preview

#Preview("Asset Gallery") {
    AssetGalleryView()
}

#Preview("Asset Gallery - Dark") {
    AssetGalleryView()
        .preferredColorScheme(.dark)
}

#Preview("Asset Thumbnail") {
    let asset = Asset(
        id: "preview-asset",
        jobId: "job-id",
        userId: "user-id",
        assetType: .thumbnail,
        url: "https://picsum.photos/1280/720",
        width: 1280,
        height: 720,
        fileSize: 245760,
        isPublic: true,
        viralScore: 85
    )
    
    return AssetThumbnail(asset: asset)
        .frame(width: 180)
        .padding()
}

#Preview("Asset Detail") {
    let asset = Asset(
        id: "preview-asset",
        jobId: "job-id",
        userId: "user-id",
        assetType: .thumbnail,
        url: "https://picsum.photos/1280/720",
        width: 1280,
        height: 720,
        fileSize: 245760,
        isPublic: false,
        viralScore: 78
    )
    let viewModel = GenerationViewModel.loadedPreview
    
    return AssetDetailView(asset: asset, viewModel: viewModel) {
        print("Dismissed")
    }
}
