//
//  BrandKitViewModel.swift
//  StreamerStudio
//
//  ViewModel for brand kit management using @Observable.
//

import Foundation
import Observation
import StreamerStudioCore

// MARK: - Brand Kit Service Protocol

/// Protocol defining brand kit service operations.
public protocol BrandKitServiceProtocol: Sendable {
    /// Load all brand kits for the current user.
    func loadBrandKits() async throws -> BrandKitListResponse
    
    /// Create a new brand kit.
    func createBrandKit(_ data: BrandKitCreate) async throws -> BrandKit
    
    /// Update an existing brand kit.
    func updateBrandKit(_ id: String, data: BrandKitUpdate) async throws -> BrandKit
    
    /// Delete a brand kit.
    func deleteBrandKit(_ id: String) async throws
    
    /// Activate a brand kit.
    func activateBrandKit(_ id: String) async throws -> BrandKit
}

// MARK: - Brand Kit Service Implementation

/// Brand kit service implementation using REST API.
public final class BrandKitService: BrandKitServiceProtocol, @unchecked Sendable {
    
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
    
    // MARK: - BrandKitServiceProtocol Implementation
    
    public func loadBrandKits() async throws -> BrandKitListResponse {
        let url = baseURL.appendingPathComponent("/api/v1/brand-kits")
        var request = try createAuthenticatedRequest(url: url, method: "GET")
        
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
        
        return try decoder.decode(BrandKitListResponse.self, from: data)
    }
    
    public func createBrandKit(_ data: BrandKitCreate) async throws -> BrandKit {
        let url = baseURL.appendingPathComponent("/api/v1/brand-kits")
        var request = try createAuthenticatedRequest(url: url, method: "POST")
        request.httpBody = try encoder.encode(data)
        
        let (responseData, response) = try await performRequest(request)
        try validateResponse(response, data: responseData)
        
        return try decoder.decode(BrandKit.self, from: responseData)
    }
    
    public func updateBrandKit(_ id: String, data: BrandKitUpdate) async throws -> BrandKit {
        let url = baseURL.appendingPathComponent("/api/v1/brand-kits/\(id)")
        var request = try createAuthenticatedRequest(url: url, method: "PUT")
        request.httpBody = try encoder.encode(data)
        
        let (responseData, response) = try await performRequest(request)
        try validateResponse(response, data: responseData)
        
        return try decoder.decode(BrandKit.self, from: responseData)
    }
    
    public func deleteBrandKit(_ id: String) async throws {
        let url = baseURL.appendingPathComponent("/api/v1/brand-kits/\(id)")
        let request = try createAuthenticatedRequest(url: url, method: "DELETE")
        
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
    }
    
    public func activateBrandKit(_ id: String) async throws -> BrandKit {
        let url = baseURL.appendingPathComponent("/api/v1/brand-kits/\(id)/activate")
        let request = try createAuthenticatedRequest(url: url, method: "POST")
        
        let (data, response) = try await performRequest(request)
        try validateResponse(response, data: data)
        
        return try decoder.decode(BrandKit.self, from: data)
    }
    
    // MARK: - Private Methods
    
    private func createAuthenticatedRequest(url: URL, method: String) throws -> URLRequest {
        guard let accessToken = try tokenStorage.getAccessToken() else {
            throw BrandKitError.unauthorized
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
            throw BrandKitError.networkError(error.localizedDescription)
        } catch {
            throw BrandKitError.networkError(error.localizedDescription)
        }
    }
    
    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw BrandKitError.networkError("Invalid response type")
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            return // Success
        case 401:
            throw BrandKitError.unauthorized
        case 404:
            throw BrandKitError.notFound
        default:
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw BrandKitError.networkError(errorResponse.detail)
            }
            throw BrandKitError.networkError("Server error: \(httpResponse.statusCode)")
        }
    }
}

// MARK: - Brand Kit ViewModel

/// ViewModel for managing brand kit state and operations.
///
/// This class uses the @Observable macro (iOS 17+) for automatic
/// SwiftUI view updates when state changes.
///
/// Usage:
/// ```swift
/// @State private var viewModel = BrandKitViewModel()
///
/// var body: some View {
///     BrandKitListView()
///         .task {
///             await viewModel.loadBrandKits()
///         }
/// }
/// ```
@Observable
public final class BrandKitViewModel {
    
    // MARK: - Published State
    
    /// List of brand kits for the current user.
    public private(set) var brandKits: [BrandKit] = []
    
    /// The currently active brand kit, if any.
    public var activeBrandKit: BrandKit? {
        brandKits.first { $0.isActive }
    }
    
    /// Whether a brand kit operation is in progress.
    public private(set) var isLoading: Bool = false
    
    /// The most recent error, if any.
    public private(set) var error: BrandKitError?
    
    // MARK: - Dependencies
    
    private let service: BrandKitServiceProtocol
    
    // MARK: - Initialization
    
    /// Initialize the brand kit view model.
    /// - Parameter service: The brand kit service to use.
    public init(service: BrandKitServiceProtocol = BrandKitService()) {
        self.service = service
    }
    
    // MARK: - Actions
    
    /// Load all brand kits for the current user.
    @MainActor
    public func loadBrandKits() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let response = try await service.loadBrandKits()
            brandKits = response.brandKits
        } catch let err as BrandKitError {
            self.error = err
        } catch {
            self.error = .loadFailed(error.localizedDescription)
        }
    }
    
    /// Create a new brand kit.
    /// - Parameter data: The brand kit creation data.
    /// - Returns: The newly created brand kit.
    @MainActor
    public func createBrandKit(_ data: BrandKitCreate) async throws -> BrandKit {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let brandKit = try await service.createBrandKit(data)
            await loadBrandKits()
            return brandKit
        } catch let err as BrandKitError {
            self.error = err
            throw err
        } catch {
            let brandKitError = BrandKitError.createFailed(error.localizedDescription)
            self.error = brandKitError
            throw brandKitError
        }
    }
    
    /// Update an existing brand kit.
    /// - Parameters:
    ///   - id: The brand kit ID.
    ///   - data: The update data.
    /// - Returns: The updated brand kit.
    @MainActor
    public func updateBrandKit(_ id: String, data: BrandKitUpdate) async throws -> BrandKit {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            let brandKit = try await service.updateBrandKit(id, data: data)
            await loadBrandKits()
            return brandKit
        } catch let err as BrandKitError {
            self.error = err
            throw err
        } catch {
            let brandKitError = BrandKitError.updateFailed(error.localizedDescription)
            self.error = brandKitError
            throw brandKitError
        }
    }
    
    /// Delete a brand kit.
    /// - Parameter id: The brand kit ID.
    @MainActor
    public func deleteBrandKit(_ id: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            try await service.deleteBrandKit(id)
            await loadBrandKits()
        } catch let err as BrandKitError {
            self.error = err
            throw err
        } catch {
            let brandKitError = BrandKitError.deleteFailed(error.localizedDescription)
            self.error = brandKitError
            throw brandKitError
        }
    }
    
    /// Activate a brand kit.
    /// - Parameter id: The brand kit ID.
    @MainActor
    public func activateBrandKit(_ id: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        do {
            _ = try await service.activateBrandKit(id)
            await loadBrandKits()
        } catch let err as BrandKitError {
            self.error = err
            throw err
        } catch {
            let brandKitError = BrandKitError.activateFailed(error.localizedDescription)
            self.error = brandKitError
            throw brandKitError
        }
    }
    
    /// Clear any displayed error.
    @MainActor
    public func clearError() {
        error = nil
    }
}

// MARK: - Mock Brand Kit Service (for testing and previews)

/// Mock brand kit service for testing and SwiftUI previews.
public final class MockBrandKitService: BrandKitServiceProtocol, @unchecked Sendable {
    
    public var mockBrandKits: [BrandKit] = []
    public var shouldFail: Bool = false
    public var errorToThrow: BrandKitError = .networkError("Mock error")
    public var simulatedDelay: TimeInterval = 0.5
    
    public init() {
        // Create default mock data
        let fonts = BrandKitFonts(headline: "Montserrat", body: "Inter")
        mockBrandKits = [
            BrandKit(
                id: "mock-brand-kit-1",
                userId: "mock-user-id",
                name: "Gaming Brand",
                isActive: true,
                primaryColors: ["#FF5733", "#3498DB"],
                accentColors: ["#F1C40F"],
                fonts: fonts,
                tone: .competitive,
                styleReference: "Bold gaming style"
            ),
            BrandKit(
                id: "mock-brand-kit-2",
                userId: "mock-user-id",
                name: "Chill Vibes",
                isActive: false,
                primaryColors: ["#9B59B6", "#1ABC9C"],
                accentColors: [],
                fonts: fonts,
                tone: .casual,
                styleReference: "Relaxed and friendly"
            )
        ]
    }
    
    public func loadBrandKits() async throws -> BrandKitListResponse {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        let activeId = mockBrandKits.first { $0.isActive }?.id
        return BrandKitListResponse(
            brandKits: mockBrandKits,
            total: mockBrandKits.count,
            activeId: activeId
        )
    }
    
    public func createBrandKit(_ data: BrandKitCreate) async throws -> BrandKit {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        let brandKit = BrandKit(
            id: UUID().uuidString,
            userId: "mock-user-id",
            name: data.name,
            isActive: false,
            primaryColors: data.primaryColors,
            accentColors: data.accentColors,
            fonts: data.fonts,
            logoUrl: data.logoUrl,
            tone: data.tone,
            styleReference: data.styleReference
        )
        mockBrandKits.append(brandKit)
        return brandKit
    }
    
    public func updateBrandKit(_ id: String, data: BrandKitUpdate) async throws -> BrandKit {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        guard let index = mockBrandKits.firstIndex(where: { $0.id == id }) else {
            throw BrandKitError.notFound
        }
        
        let existing = mockBrandKits[index]
        let updated = BrandKit(
            id: existing.id,
            userId: existing.userId,
            name: data.name ?? existing.name,
            isActive: existing.isActive,
            primaryColors: data.primaryColors ?? existing.primaryColors,
            accentColors: data.accentColors ?? existing.accentColors,
            fonts: data.fonts ?? existing.fonts,
            logoUrl: data.logoUrl ?? existing.logoUrl,
            tone: data.tone ?? existing.tone,
            styleReference: data.styleReference ?? existing.styleReference,
            extractedFrom: existing.extractedFrom,
            createdAt: existing.createdAt,
            updatedAt: Date()
        )
        mockBrandKits[index] = updated
        return updated
    }
    
    public func deleteBrandKit(_ id: String) async throws {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        mockBrandKits.removeAll { $0.id == id }
    }
    
    public func activateBrandKit(_ id: String) async throws -> BrandKit {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        guard let index = mockBrandKits.firstIndex(where: { $0.id == id }) else {
            throw BrandKitError.notFound
        }
        
        // Deactivate all other brand kits
        for i in mockBrandKits.indices {
            let kit = mockBrandKits[i]
            mockBrandKits[i] = BrandKit(
                id: kit.id,
                userId: kit.userId,
                name: kit.name,
                isActive: i == index,
                primaryColors: kit.primaryColors,
                accentColors: kit.accentColors,
                fonts: kit.fonts,
                logoUrl: kit.logoUrl,
                tone: kit.tone,
                styleReference: kit.styleReference,
                extractedFrom: kit.extractedFrom,
                createdAt: kit.createdAt,
                updatedAt: kit.updatedAt
            )
        }
        
        return mockBrandKits[index]
    }
    
    private func simulateNetworkDelay() async throws {
        if simulatedDelay > 0 {
            try await Task.sleep(nanoseconds: UInt64(simulatedDelay * 1_000_000_000))
        }
    }
}

// MARK: - Preview Helper

extension BrandKitViewModel {
    /// Create a preview instance with mock data.
    public static var preview: BrandKitViewModel {
        let viewModel = BrandKitViewModel(service: MockBrandKitService())
        return viewModel
    }
    
    /// Create a preview instance with loaded brand kits.
    public static var loadedPreview: BrandKitViewModel {
        let mockService = MockBrandKitService()
        let viewModel = BrandKitViewModel(service: mockService)
        viewModel.brandKits = mockService.mockBrandKits
        return viewModel
    }
    
    /// Create a preview instance with an error.
    public static var errorPreview: BrandKitViewModel {
        let viewModel = BrandKitViewModel(service: MockBrandKitService())
        viewModel.error = .loadFailed("Network connection failed")
        return viewModel
    }
}
