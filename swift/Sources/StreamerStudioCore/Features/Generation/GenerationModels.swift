//
//  GenerationModels.swift
//  StreamerStudioCore
//
//  Data models for asset generation and management.
//

import Foundation

// MARK: - Asset Type

/// Types of assets that can be generated.
public enum AssetType: String, Codable, CaseIterable, Sendable {
    case thumbnail
    case overlay
    case banner
    case storyGraphic = "story_graphic"
    case clipCover = "clip_cover"
    
    /// Human-readable display name for the asset type.
    public var displayName: String {
        switch self {
        case .thumbnail:
            return "Thumbnail"
        case .overlay:
            return "Overlay"
        case .banner:
            return "Banner"
        case .storyGraphic:
            return "Story Graphic"
        case .clipCover:
            return "Clip Cover"
        }
    }
    
    /// Default dimensions for the asset type.
    public var dimensions: (width: Int, height: Int) {
        switch self {
        case .thumbnail:
            return (1280, 720)
        case .overlay:
            return (1920, 1080)
        case .banner:
            return (1200, 480)
        case .storyGraphic:
            return (1080, 1920)
        case .clipCover:
            return (1080, 1080)
        }
    }
    
    /// Aspect ratio description for the asset type.
    public var aspectRatioDescription: String {
        switch self {
        case .thumbnail:
            return "16:9"
        case .overlay:
            return "16:9"
        case .banner:
            return "5:2"
        case .storyGraphic:
            return "9:16"
        case .clipCover:
            return "1:1"
        }
    }
    
    /// SF Symbol name for the asset type.
    public var iconName: String {
        switch self {
        case .thumbnail:
            return "photo.tv"
        case .overlay:
            return "square.stack.3d.up"
        case .banner:
            return "rectangle.split.3x1"
        case .storyGraphic:
            return "rectangle.portrait"
        case .clipCover:
            return "square"
        }
    }
}

// MARK: - Job Status

/// Status of a generation job.
public enum JobStatus: String, Codable, CaseIterable, Sendable {
    case queued
    case processing
    case completed
    case failed
    case partial
    
    /// Human-readable display name for the status.
    public var displayName: String {
        switch self {
        case .queued:
            return "Queued"
        case .processing:
            return "Processing"
        case .completed:
            return "Completed"
        case .failed:
            return "Failed"
        case .partial:
            return "Partial"
        }
    }
    
    /// Whether the job is still in progress.
    public var isInProgress: Bool {
        switch self {
        case .queued, .processing:
            return true
        case .completed, .failed, .partial:
            return false
        }
    }
    
    /// Whether the job has finished (successfully or not).
    public var isFinished: Bool {
        switch self {
        case .completed, .failed, .partial:
            return true
        case .queued, .processing:
            return false
        }
    }
    
    /// SF Symbol name for the status.
    public var iconName: String {
        switch self {
        case .queued:
            return "clock"
        case .processing:
            return "arrow.triangle.2.circlepath"
        case .completed:
            return "checkmark.circle.fill"
        case .failed:
            return "xmark.circle.fill"
        case .partial:
            return "exclamationmark.triangle.fill"
        }
    }
}

// MARK: - Generation Job

/// Model representing a generation job.
public struct GenerationJob: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let brandKitId: String
    public let assetType: AssetType
    public let status: JobStatus
    public let progress: Int
    public let errorMessage: String?
    public let createdAt: Date
    public let updatedAt: Date
    public let completedAt: Date?
    
    public init(
        id: String,
        userId: String,
        brandKitId: String,
        assetType: AssetType,
        status: JobStatus = .queued,
        progress: Int = 0,
        errorMessage: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        completedAt: Date? = nil
    ) {
        self.id = id
        self.userId = userId
        self.brandKitId = brandKitId
        self.assetType = assetType
        self.status = status
        self.progress = progress
        self.errorMessage = errorMessage
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.completedAt = completedAt
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case brandKitId = "brand_kit_id"
        case assetType = "asset_type"
        case status
        case progress
        case errorMessage = "error_message"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case completedAt = "completed_at"
    }
}

// MARK: - Asset

/// Model representing a generated asset.
public struct Asset: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let jobId: String
    public let userId: String
    public let assetType: AssetType
    public let url: String
    public let width: Int
    public let height: Int
    public let fileSize: Int
    public let isPublic: Bool
    public let viralScore: Int?
    public let createdAt: Date
    
    public init(
        id: String,
        jobId: String,
        userId: String,
        assetType: AssetType,
        url: String,
        width: Int,
        height: Int,
        fileSize: Int,
        isPublic: Bool = false,
        viralScore: Int? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.jobId = jobId
        self.userId = userId
        self.assetType = assetType
        self.url = url
        self.width = width
        self.height = height
        self.fileSize = fileSize
        self.isPublic = isPublic
        self.viralScore = viralScore
        self.createdAt = createdAt
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case jobId = "job_id"
        case userId = "user_id"
        case assetType = "asset_type"
        case url
        case width
        case height
        case fileSize = "file_size"
        case isPublic = "is_public"
        case viralScore = "viral_score"
        case createdAt = "created_at"
    }
    
    /// Formatted file size string.
    public var formattedFileSize: String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(fileSize))
    }
    
    /// Dimensions string (e.g., "1280 × 720").
    public var dimensionsString: String {
        "\(width) × \(height)"
    }
}

// MARK: - Request Types

/// Request body for creating a generation job.
public struct GenerateRequest: Codable, Sendable {
    public let assetType: AssetType
    public let brandKitId: String
    public let customPrompt: String?
    public let brandCustomization: BrandCustomization?
    
    public init(
        assetType: AssetType,
        brandKitId: String,
        customPrompt: String? = nil,
        brandCustomization: BrandCustomization? = nil
    ) {
        self.assetType = assetType
        self.brandKitId = brandKitId
        self.customPrompt = customPrompt
        self.brandCustomization = brandCustomization
    }
    
    enum CodingKeys: String, CodingKey {
        case assetType = "asset_type"
        case brandKitId = "brand_kit_id"
        case customPrompt = "custom_prompt"
        case brandCustomization = "brand_customization"
    }
}

/// Request body for updating asset visibility.
public struct AssetVisibilityUpdate: Codable, Sendable {
    public let isPublic: Bool
    
    public init(isPublic: Bool) {
        self.isPublic = isPublic
    }
    
    enum CodingKeys: String, CodingKey {
        case isPublic = "is_public"
    }
}

// MARK: - Response Types

/// Response for listing generation jobs.
public struct JobListResponse: Codable, Sendable {
    public let jobs: [GenerationJob]
    public let total: Int
    public let limit: Int
    public let offset: Int
    
    public init(jobs: [GenerationJob], total: Int, limit: Int, offset: Int) {
        self.jobs = jobs
        self.total = total
        self.limit = limit
        self.offset = offset
    }
}

/// Response for listing assets.
public struct AssetListResponse: Codable, Sendable {
    public let assets: [Asset]
    public let total: Int
    public let limit: Int
    public let offset: Int
    
    public init(assets: [Asset], total: Int, limit: Int, offset: Int) {
        self.assets = assets
        self.total = total
        self.limit = limit
        self.offset = offset
    }
}

// MARK: - Generation Error

/// Error types for generation operations.
public enum GenerationError: LocalizedError, Equatable {
    case createJobFailed(String)
    case loadJobsFailed(String)
    case loadAssetsFailed(String)
    case deleteAssetFailed(String)
    case updateVisibilityFailed(String)
    case jobNotFound
    case assetNotFound
    case unauthorized
    case networkError(String)
    case decodingError(String)
    case invalidBrandKit
    case quotaExceeded
    case generationFailed(String)
    
    public var errorDescription: String? {
        switch self {
        case .createJobFailed(let message):
            return "Failed to create generation job: \(message)"
        case .loadJobsFailed(let message):
            return "Failed to load jobs: \(message)"
        case .loadAssetsFailed(let message):
            return "Failed to load assets: \(message)"
        case .deleteAssetFailed(let message):
            return "Failed to delete asset: \(message)"
        case .updateVisibilityFailed(let message):
            return "Failed to update visibility: \(message)"
        case .jobNotFound:
            return "Generation job not found"
        case .assetNotFound:
            return "Asset not found"
        case .unauthorized:
            return "You are not authorized to perform this action"
        case .networkError(let message):
            return "Network error: \(message)"
        case .decodingError(let message):
            return "Failed to process response: \(message)"
        case .invalidBrandKit:
            return "Invalid or missing brand kit"
        case .quotaExceeded:
            return "Generation quota exceeded. Please try again later."
        case .generationFailed(let message):
            return "Generation failed: \(message)"
        }
    }
    
    public static func == (lhs: GenerationError, rhs: GenerationError) -> Bool {
        switch (lhs, rhs) {
        case (.createJobFailed(let l), .createJobFailed(let r)): return l == r
        case (.loadJobsFailed(let l), .loadJobsFailed(let r)): return l == r
        case (.loadAssetsFailed(let l), .loadAssetsFailed(let r)): return l == r
        case (.deleteAssetFailed(let l), .deleteAssetFailed(let r)): return l == r
        case (.updateVisibilityFailed(let l), .updateVisibilityFailed(let r)): return l == r
        case (.jobNotFound, .jobNotFound): return true
        case (.assetNotFound, .assetNotFound): return true
        case (.unauthorized, .unauthorized): return true
        case (.networkError(let l), .networkError(let r)): return l == r
        case (.decodingError(let l), .decodingError(let r)): return l == r
        case (.invalidBrandKit, .invalidBrandKit): return true
        case (.quotaExceeded, .quotaExceeded): return true
        case (.generationFailed(let l), .generationFailed(let r)): return l == r
        default: return false
        }
    }
}

// MARK: - API Error Response

/// Generic API error response for decoding server errors.
public struct GenerationAPIErrorResponse: Codable, Sendable {
    public let detail: String
    public let code: String?
    
    public init(detail: String, code: String? = nil) {
        self.detail = detail
        self.code = code
    }
}
