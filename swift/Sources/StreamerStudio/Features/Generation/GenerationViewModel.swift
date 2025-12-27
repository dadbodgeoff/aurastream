//
//  GenerationViewModel.swift
//  StreamerStudio
//
//  ViewModel for asset generation management using @Observable.
//

import Foundation
import Observation
import StreamerStudioCore

// MARK: - Generation Service Protocol

/// Protocol defining generation service operations.
public protocol GenerationServiceProtocol: Sendable {
    /// Create a new generation job.
    func createJob(_ request: GenerateRequest) async throws -> GenerationJob
    
    /// Get a specific generation job by ID.
    func getJob(_ id: String) async throws -> GenerationJob
    
    /// List generation jobs with optional filtering.
    func listJobs(status: JobStatus?, limit: Int?, offset: Int?) async throws -> JobListResponse
    
    /// List assets with optional filtering.
    func listAssets(assetType: AssetType?, limit: Int?, offset: Int?) async throws -> AssetListResponse
    
    /// Delete an asset.
    func deleteAsset(_ id: String) async throws
    
    /// Update asset visibility.
    func updateAssetVisibility(_ id: String, isPublic: Bool) async throws -> Asset
}

// MARK: - Generation Service Implementation

/// Generation service implementation using REST API.
public final class GenerationService: GenerationServiceProtocol, @unchecked Sendable {
    
    // MARK: - Properties
    
    private let baseURL: URL
    private let session: URLSession
    private let tokenStorage: TokenStorageProtocol
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    
    // MARK: - Initialization
    
    public init(
        baseURL: URL = URL(string: "http://localhost:8000")!,
        session: URLSession = .shared,
        tokenStorage: TokenStorageProtocol = KeychainTokenStorage()
    ) {
        self.baseURL = baseURL
        self.session = session
        self.tokenStorage = tokenStorage
        
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
        
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601
    }
    
    // MARK: - GenerationServiceProtocol Implementation
    
    public func createJob(_ request: GenerateRequest) async throws -> GenerationJob {
        let url = baseURL.appendingPathComponent("/api/v1/generate")
        var urlRequest = try createAuthenticatedRequest(url: url, method: "POST")
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await performRequest(urlRequest)
        try validateResponse(response, data: data)
        
        return try decoder.decode(GenerationJob.self, from: data)
    }
    
    public func getJob(_ id: String) async throws -> GenerationJob {
        let url = baseURL.appendingPathComponent("/api/v1/jobs/\(id)")
        let request = try createAuthenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
        
        return try decoder.decode(GenerationJob.self, from: data)
    }
    
    public func listJobs(status: JobStatus?, limit: Int?, offset: Int?) async throws -> JobListResponse {
        var components = URLComponents(url: baseURL.appendingPathComponent("/api/v1/jobs"), resolvingAgainstBaseURL: false)!
        var queryItems: [URLQueryItem] = []
        
        if let status = status {
            queryItems.append(URLQueryItem(name: "status", value: status.rawValue))
        }
        if let limit = limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        if let offset = offset {
            queryItems.append(URLQueryItem(name: "offset", value: String(offset)))
        }
        
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        
        let request = try createAuthenticatedRequest(url: components.url!, method: "GET")
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
        
        return try decoder.decode(JobListResponse.self, from: data)
    }
    
    public func listAssets(assetType: AssetType?, limit: Int?, offset: Int?) async throws -> AssetListResponse {
        var components = URLComponents(url: baseURL.appendingPathComponent("/api/v1/assets"), resolvingAgainstBaseURL: false)!
        var queryItems: [URLQueryItem] = []
        
        if let assetType = assetType {
            queryItems.append(URLQueryItem(name: "asset_type", value: assetType.rawValue))
        }
        if let limit = limit {
            queryItems.append(URLQueryItem(name: "limit", value: String(limit)))
        }
        if let offset = offset {
            queryItems.append(URLQueryItem(name: "offset", value: String(offset)))
        }
        
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        
        let request = try createAuthenticatedRequest(url: components.url!, method: "GET")
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
        
        return try decoder.decode(AssetListResponse.self, from: data)
    }
    
    public func deleteAsset(_ id: String) async throws {
        let url = baseURL.appendingPathComponent("/api/v1/assets/\(id)")
        let request = try createAuthenticatedRequest(url: url, method: "DELETE")
        
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
    }
    
    public func updateAssetVisibility(_ id: String, isPublic: Bool) async throws -> Asset {
        let url = baseURL.appendingPathComponent("/api/v1/assets/\(id)/visibility")
        var request = try createAuthenticatedRequest(url: url, method: "PUT")
        request.httpBody = try encoder.encode(AssetVisibilityUpdate(isPublic: isPublic))
        
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
        
        return try decoder.decode(Asset.self, from: data)
    }
    
    // MARK: - Private Methods
    
    private func createAuthenticatedRequest(url: URL, method: String) throws -> URLRequest {
        guard let accessToken = try tokenStorage.getAccessToken() else {
            throw GenerationError.unauthorized
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        
        return request
    }
    
    private func performRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch let error as URLError {
            throw GenerationError.networkError(error.localizedDescription)
        } catch {
            throw GenerationError.networkError(error.localizedDescription)
        }
    }
    
    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GenerationError.networkError("Invalid response type")
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            return // Success
        case 401:
            throw GenerationError.unauthorized
        case 404:
            throw GenerationError.jobNotFound
        case 429:
            throw GenerationError.quotaExceeded
        default:
            if let errorResponse = try? decoder.decode(GenerationAPIErrorResponse.self, from: data) {
                throw GenerationError.networkError(errorResponse.detail)
            }
            throw GenerationError.networkError("Server error: \(httpResponse.statusCode)")
        }
    }
}

// MARK: - Generation ViewModel

/// ViewModel for managing generation state and operations.
///
/// This class uses the @Observable macro (iOS 17+) for automatic
/// SwiftUI view updates when state changes.
///
/// Usage:
/// ```swift
/// @State private var viewModel = GenerationViewModel()
///
/// var body: some View {
///     GenerateView()
///         .task {
///             await viewModel.loadJobs()
///         }
/// }
/// ```
@Observable
public final class GenerationViewModel {
    
    // MARK: - Published State
    
    /// List of generation jobs.
    public private(set) var jobs: [GenerationJob] = []
    
    /// List of generated assets.
    public private(set) var assets: [Asset] = []
    
    /// The currently active/polling job.
    public private(set) var currentJob: GenerationJob?
    
    /// Whether an operation is in progress.
    public private(set) var isLoading: Bool = false
    
    /// Whether job polling is active.
    public private(set) var isPolling: Bool = false
    
    /// The most recent error, if any.
    public private(set) var error: GenerationError?
    
    // MARK: - Dependencies
    
    private let service: GenerationServiceProtocol
    
    /// Polling interval in seconds.
    private let pollingInterval: TimeInterval = 2.0
    
    /// Task for polling job status.
    private var pollingTask: Task<Void, Never>?
    
    // MARK: - Initialization
    
    /// Initialize the generation view model.
    /// - Parameter service: The generation service to use.
    public init(service: GenerationServiceProtocol = GenerationService()) {
        self.service = service
    }
    
    deinit {
        pollingTask?.cancel()
    }
    
    // MARK: - Job Actions
    
    /// Create a new generation job.
    /// - Parameters:
    ///   - assetType: The type of asset to generate.
    ///   - brandKitId: The brand kit ID to use.
    ///   - customPrompt: Optional custom prompt.
    ///   - brandCustomization: Optional brand customization settings.
    /// - Returns: The created generation job.
    @MainActor
    public func createJob(
        assetType: AssetType,
        brandKitId: String,
        customPrompt: String? = nil,
        brandCustomization: BrandCustomization? = nil
    ) async throws -> GenerationJob {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let request = GenerateRequest(
                assetType: assetType,
                brandKitId: brandKitId,
                customPrompt: customPrompt?.trimmingCharacters(in: .whitespacesAndNewlines),
                brandCustomization: brandCustomization
            )
            let job = try await service.createJob(request)
            currentJob = job
            
            // Start polling for job status
            startPolling(jobId: job.id)
            
            return job
        } catch let err as GenerationError {
            self.error = err
            throw err
        } catch {
            let generationError = GenerationError.createJobFailed(error.localizedDescription)
            self.error = generationError
            throw generationError
        }
    }
    
    /// Load all generation jobs.
    @MainActor
    public func loadJobs(status: JobStatus? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let response = try await service.listJobs(status: status, limit: 50, offset: 0)
            jobs = response.jobs
        } catch let err as GenerationError {
            self.error = err
        } catch {
            self.error = .loadJobsFailed(error.localizedDescription)
        }
    }
    
    /// Get a specific job by ID.
    /// - Parameter id: The job ID.
    /// - Returns: The generation job.
    @MainActor
    public func getJob(_ id: String) async throws -> GenerationJob {
        do {
            let job = try await service.getJob(id)
            
            // Update in jobs list if present
            if let index = jobs.firstIndex(where: { $0.id == id }) {
                jobs[index] = job
            }
            
            // Update current job if it matches
            if currentJob?.id == id {
                currentJob = job
            }
            
            return job
        } catch let err as GenerationError {
            throw err
        } catch {
            throw GenerationError.loadJobsFailed(error.localizedDescription)
        }
    }
    
    /// Poll job status until completed or failed.
    /// - Parameter jobId: The job ID to poll.
    @MainActor
    public func pollJobStatus(_ jobId: String) async {
        isPolling = true
        defer { isPolling = false }
        
        while !Task.isCancelled {
            do {
                let job = try await getJob(jobId)
                
                if job.status.isFinished {
                    currentJob = job
                    
                    // Reload assets if job completed successfully
                    if job.status == .completed {
                        await loadAssets()
                    }
                    
                    break
                }
                
                // Wait before next poll
                try await Task.sleep(nanoseconds: UInt64(pollingInterval * 1_000_000_000))
            } catch {
                // Stop polling on error
                break
            }
        }
    }
    
    /// Start polling for job status in the background.
    /// - Parameter jobId: The job ID to poll.
    private func startPolling(jobId: String) {
        // Cancel any existing polling task
        pollingTask?.cancel()
        
        pollingTask = Task { @MainActor in
            await pollJobStatus(jobId)
        }
    }
    
    /// Stop any active polling.
    @MainActor
    public func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
        isPolling = false
    }
    
    // MARK: - Asset Actions
    
    /// Load all assets.
    /// - Parameter assetType: Optional filter by asset type.
    @MainActor
    public func loadAssets(assetType: AssetType? = nil) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let response = try await service.listAssets(assetType: assetType, limit: 100, offset: 0)
            assets = response.assets
        } catch let err as GenerationError {
            self.error = err
        } catch {
            self.error = .loadAssetsFailed(error.localizedDescription)
        }
    }
    
    /// Delete an asset.
    /// - Parameter id: The asset ID to delete.
    @MainActor
    public func deleteAsset(_ id: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            try await service.deleteAsset(id)
            assets.removeAll { $0.id == id }
        } catch let err as GenerationError {
            self.error = err
            throw err
        } catch {
            let generationError = GenerationError.deleteAssetFailed(error.localizedDescription)
            self.error = generationError
            throw generationError
        }
    }
    
    /// Toggle asset visibility.
    /// - Parameter asset: The asset to toggle.
    @MainActor
    public func toggleAssetVisibility(_ asset: Asset) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let updatedAsset = try await service.updateAssetVisibility(asset.id, isPublic: !asset.isPublic)
            
            // Update in assets list
            if let index = assets.firstIndex(where: { $0.id == asset.id }) {
                assets[index] = updatedAsset
            }
        } catch let err as GenerationError {
            self.error = err
            throw err
        } catch {
            let generationError = GenerationError.updateVisibilityFailed(error.localizedDescription)
            self.error = generationError
            throw generationError
        }
    }
    
    // MARK: - Utility
    
    /// Clear any displayed error.
    @MainActor
    public func clearError() {
        error = nil
    }
    
    /// Clear the current job.
    @MainActor
    public func clearCurrentJob() {
        stopPolling()
        currentJob = nil
    }
    
    /// Get assets filtered by type.
    /// - Parameter type: The asset type to filter by.
    /// - Returns: Filtered assets.
    public func assets(ofType type: AssetType) -> [Asset] {
        assets.filter { $0.assetType == type }
    }
    
    /// Get jobs filtered by status.
    /// - Parameter status: The status to filter by.
    /// - Returns: Filtered jobs.
    public func jobs(withStatus status: JobStatus) -> [GenerationJob] {
        jobs.filter { $0.status == status }
    }
}

// MARK: - Mock Generation Service

/// Mock generation service for testing and SwiftUI previews.
public final class MockGenerationService: GenerationServiceProtocol, @unchecked Sendable {
    
    public var mockJobs: [GenerationJob] = []
    public var mockAssets: [Asset] = []
    public var shouldFail: Bool = false
    public var errorToThrow: GenerationError = .networkError("Mock error")
    public var simulatedDelay: TimeInterval = 0.5
    public var simulateProcessing: Bool = false
    
    private var processingJobId: String?
    
    public init() {
        // Create default mock data
        mockJobs = [
            GenerationJob(
                id: "mock-job-1",
                userId: "mock-user-id",
                brandKitId: "mock-brand-kit-1",
                assetType: .thumbnail,
                status: .completed,
                progress: 100,
                createdAt: Date().addingTimeInterval(-3600),
                updatedAt: Date().addingTimeInterval(-3500),
                completedAt: Date().addingTimeInterval(-3500)
            ),
            GenerationJob(
                id: "mock-job-2",
                userId: "mock-user-id",
                brandKitId: "mock-brand-kit-1",
                assetType: .banner,
                status: .processing,
                progress: 45,
                createdAt: Date().addingTimeInterval(-300),
                updatedAt: Date()
            )
        ]
        
        mockAssets = [
            Asset(
                id: "mock-asset-1",
                jobId: "mock-job-1",
                userId: "mock-user-id",
                assetType: .thumbnail,
                url: "https://example.com/assets/thumbnail-1.png",
                width: 1280,
                height: 720,
                fileSize: 245760,
                isPublic: false,
                viralScore: 85,
                createdAt: Date().addingTimeInterval(-3500)
            ),
            Asset(
                id: "mock-asset-2",
                jobId: "mock-job-1",
                userId: "mock-user-id",
                assetType: .thumbnail,
                url: "https://example.com/assets/thumbnail-2.png",
                width: 1280,
                height: 720,
                fileSize: 198432,
                isPublic: true,
                viralScore: 72,
                createdAt: Date().addingTimeInterval(-3400)
            )
        ]
    }
    
    public func createJob(_ request: GenerateRequest) async throws -> GenerationJob {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        let job = GenerationJob(
            id: UUID().uuidString,
            userId: "mock-user-id",
            brandKitId: request.brandKitId,
            assetType: request.assetType,
            status: simulateProcessing ? .queued : .completed,
            progress: simulateProcessing ? 0 : 100
        )
        
        if simulateProcessing {
            processingJobId = job.id
        }
        
        mockJobs.insert(job, at: 0)
        return job
    }
    
    public func getJob(_ id: String) async throws -> GenerationJob {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        guard var job = mockJobs.first(where: { $0.id == id }) else {
            throw GenerationError.jobNotFound
        }
        
        // Simulate progress for processing jobs
        if simulateProcessing && job.id == processingJobId {
            let newProgress = min(job.progress + 25, 100)
            let newStatus: JobStatus = newProgress >= 100 ? .completed : .processing
            
            job = GenerationJob(
                id: job.id,
                userId: job.userId,
                brandKitId: job.brandKitId,
                assetType: job.assetType,
                status: newStatus,
                progress: newProgress,
                createdAt: job.createdAt,
                updatedAt: Date(),
                completedAt: newStatus == .completed ? Date() : nil
            )
            
            // Update in mock jobs
            if let index = mockJobs.firstIndex(where: { $0.id == id }) {
                mockJobs[index] = job
            }
            
            // Create asset when completed
            if newStatus == .completed {
                let asset = Asset(
                    id: UUID().uuidString,
                    jobId: job.id,
                    userId: job.userId,
                    assetType: job.assetType,
                    url: "https://example.com/assets/\(job.assetType.rawValue)-\(job.id).png",
                    width: job.assetType.dimensions.width,
                    height: job.assetType.dimensions.height,
                    fileSize: Int.random(in: 100000...500000),
                    viralScore: Int.random(in: 60...95)
                )
                mockAssets.insert(asset, at: 0)
                processingJobId = nil
            }
        }
        
        return job
    }
    
    public func listJobs(status: JobStatus?, limit: Int?, offset: Int?) async throws -> JobListResponse {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        var filteredJobs = mockJobs
        if let status = status {
            filteredJobs = filteredJobs.filter { $0.status == status }
        }
        
        let actualOffset = offset ?? 0
        let actualLimit = limit ?? 50
        let paginatedJobs = Array(filteredJobs.dropFirst(actualOffset).prefix(actualLimit))
        
        return JobListResponse(
            jobs: paginatedJobs,
            total: filteredJobs.count,
            limit: actualLimit,
            offset: actualOffset
        )
    }
    
    public func listAssets(assetType: AssetType?, limit: Int?, offset: Int?) async throws -> AssetListResponse {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        var filteredAssets = mockAssets
        if let assetType = assetType {
            filteredAssets = filteredAssets.filter { $0.assetType == assetType }
        }
        
        let actualOffset = offset ?? 0
        let actualLimit = limit ?? 100
        let paginatedAssets = Array(filteredAssets.dropFirst(actualOffset).prefix(actualLimit))
        
        return AssetListResponse(
            assets: paginatedAssets,
            total: filteredAssets.count,
            limit: actualLimit,
            offset: actualOffset
        )
    }
    
    public func deleteAsset(_ id: String) async throws {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        mockAssets.removeAll { $0.id == id }
    }
    
    public func updateAssetVisibility(_ id: String, isPublic: Bool) async throws -> Asset {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        guard let index = mockAssets.firstIndex(where: { $0.id == id }) else {
            throw GenerationError.assetNotFound
        }
        
        let existing = mockAssets[index]
        let updated = Asset(
            id: existing.id,
            jobId: existing.jobId,
            userId: existing.userId,
            assetType: existing.assetType,
            url: existing.url,
            width: existing.width,
            height: existing.height,
            fileSize: existing.fileSize,
            isPublic: isPublic,
            viralScore: existing.viralScore,
            createdAt: existing.createdAt
        )
        mockAssets[index] = updated
        return updated
    }
    
    private func simulateNetworkDelay() async throws {
        if simulatedDelay > 0 {
            try await Task.sleep(nanoseconds: UInt64(simulatedDelay * 1_000_000_000))
        }
    }
}

// MARK: - Preview Helpers

extension GenerationViewModel {
    /// Create a preview instance with mock data.
    public static var preview: GenerationViewModel {
        let viewModel = GenerationViewModel(service: MockGenerationService())
        return viewModel
    }
    
    /// Create a preview instance with loaded data.
    public static var loadedPreview: GenerationViewModel {
        let mockService = MockGenerationService()
        let viewModel = GenerationViewModel(service: mockService)
        viewModel.jobs = mockService.mockJobs
        viewModel.assets = mockService.mockAssets
        return viewModel
    }
    
    /// Create a preview instance with a processing job.
    public static var processingPreview: GenerationViewModel {
        let mockService = MockGenerationService()
        let viewModel = GenerationViewModel(service: mockService)
        viewModel.currentJob = GenerationJob(
            id: "processing-job",
            userId: "mock-user-id",
            brandKitId: "mock-brand-kit-1",
            assetType: .thumbnail,
            status: .processing,
            progress: 45
        )
        viewModel.isPolling = true
        return viewModel
    }
    
    /// Create a preview instance with an error.
    public static var errorPreview: GenerationViewModel {
        let viewModel = GenerationViewModel(service: MockGenerationService())
        viewModel.error = .generationFailed("AI service temporarily unavailable")
        return viewModel
    }
}
