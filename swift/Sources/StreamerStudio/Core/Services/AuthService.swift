//
//  AuthService.swift
//  StreamerStudio
//
//  Authentication service for user signup, login, logout, and token management.
//

import Foundation

// MARK: - Auth Service Protocol

/// Protocol defining authentication service operations.
public protocol AuthServiceProtocol: Sendable {
    /// Register a new user account.
    /// - Parameters:
    ///   - email: User's email address.
    ///   - password: User's password.
    ///   - displayName: User's display name.
    /// - Returns: The newly created user.
    func signup(email: String, password: String, displayName: String) async throws -> User
    
    /// Authenticate a user with email and password.
    /// - Parameters:
    ///   - email: User's email address.
    ///   - password: User's password.
    /// - Returns: Login response containing user and tokens.
    func login(email: String, password: String) async throws -> LoginResponse
    
    /// Sign out the current user and clear stored tokens.
    func logout() async throws
    
    /// Refresh the access token using the stored refresh token.
    /// - Returns: New token response.
    func refreshToken() async throws -> TokenResponse
    
    /// Get the currently authenticated user.
    /// - Returns: The current user.
    func getCurrentUser() async throws -> User
}

// MARK: - Auth Service Implementation

/// Authentication service implementation using REST API.
///
/// This service handles all authentication operations including signup,
/// login, logout, and token refresh. Tokens are securely stored using
/// the provided TokenStorageProtocol implementation.
///
/// Usage:
/// ```swift
/// let authService = AuthService()
/// let response = try await authService.login(email: "user@example.com", password: "password")
/// print("Logged in as: \(response.user.displayName)")
/// ```
public final class AuthService: AuthServiceProtocol, @unchecked Sendable {
    
    // MARK: - Properties
    
    private let baseURL: URL
    private let session: URLSession
    private let tokenStorage: TokenStorageProtocol
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    
    // MARK: - Initialization
    
    /// Initialize the auth service.
    /// - Parameters:
    ///   - baseURL: Base URL for the API server.
    ///   - session: URLSession for network requests.
    ///   - tokenStorage: Storage for authentication tokens.
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
    
    // MARK: - AuthServiceProtocol Implementation
    
    public func signup(email: String, password: String, displayName: String) async throws -> User {
        // Validate input
        guard isValidEmail(email) else {
            throw AuthError.invalidEmail
        }
        
        guard isValidPassword(password) else {
            throw AuthError.weakPassword
        }
        
        let request = SignupRequest(email: email, password: password, displayName: displayName)
        let url = baseURL.appendingPathComponent("/api/v1/auth/signup")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await performRequest(urlRequest)
        
        try validateResponse(response, data: data)
        
        do {
            let user = try decoder.decode(User.self, from: data)
            return user
        } catch {
            throw AuthError.decodingError(error.localizedDescription)
        }
    }
    
    public func login(email: String, password: String) async throws -> LoginResponse {
        // Validate input
        guard isValidEmail(email) else {
            throw AuthError.invalidEmail
        }
        
        let request = LoginRequest(email: email, password: password)
        let url = baseURL.appendingPathComponent("/api/v1/auth/login")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await performRequest(urlRequest)
        
        try validateResponse(response, data: data)
        
        do {
            let loginResponse = try decoder.decode(LoginResponse.self, from: data)
            
            // Store tokens securely
            try tokenStorage.saveAccessToken(loginResponse.accessToken)
            try tokenStorage.saveRefreshToken(loginResponse.refreshToken)
            
            return loginResponse
        } catch let error as AuthError {
            throw error
        } catch {
            throw AuthError.decodingError(error.localizedDescription)
        }
    }
    
    public func logout() async throws {
        // Get the current access token for the logout request
        guard let accessToken = try tokenStorage.getAccessToken() else {
            // Already logged out, just clear any remaining tokens
            try tokenStorage.clearTokens()
            return
        }
        
        let url = baseURL.appendingPathComponent("/api/v1/auth/logout")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        
        // Attempt to notify server, but don't fail if it doesn't work
        do {
            let (_, response) = try await performRequest(urlRequest)
            // We don't strictly require success here - the important thing is clearing local tokens
            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode >= 500 {
                // Log server error but continue with local logout
                print("Warning: Server logout failed with status \(httpResponse.statusCode)")
            }
        } catch {
            // Log error but continue with local logout
            print("Warning: Server logout request failed: \(error.localizedDescription)")
        }
        
        // Always clear local tokens
        try tokenStorage.clearTokens()
    }
    
    public func refreshToken() async throws -> TokenResponse {
        guard let refreshToken = try tokenStorage.getRefreshToken() else {
            throw AuthError.notAuthenticated
        }
        
        let request = RefreshTokenRequest(refreshToken: refreshToken)
        let url = baseURL.appendingPathComponent("/api/v1/auth/refresh")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try encoder.encode(request)
        
        let (data, response) = try await performRequest(urlRequest)
        
        try validateResponse(response, data: data)
        
        do {
            let tokenResponse = try decoder.decode(TokenResponse.self, from: data)
            
            // Update stored tokens
            try tokenStorage.saveAccessToken(tokenResponse.accessToken)
            if let newRefreshToken = tokenResponse.refreshToken {
                try tokenStorage.saveRefreshToken(newRefreshToken)
            }
            
            return tokenResponse
        } catch let error as AuthError {
            throw error
        } catch {
            throw AuthError.decodingError(error.localizedDescription)
        }
    }
    
    public func getCurrentUser() async throws -> User {
        guard let accessToken = try tokenStorage.getAccessToken() else {
            throw AuthError.notAuthenticated
        }
        
        let url = baseURL.appendingPathComponent("/api/v1/auth/me")
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        urlRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await performRequest(urlRequest)
        
        // Handle 401 by attempting token refresh
        if let httpResponse = response as? HTTPURLResponse,
           httpResponse.statusCode == 401 {
            // Try to refresh the token
            _ = try await refreshToken()
            
            // Retry with new token
            guard let newAccessToken = try tokenStorage.getAccessToken() else {
                throw AuthError.notAuthenticated
            }
            
            var retryRequest = URLRequest(url: url)
            retryRequest.httpMethod = "GET"
            retryRequest.setValue("Bearer \(newAccessToken)", forHTTPHeaderField: "Authorization")
            
            let (retryData, retryResponse) = try await performRequest(retryRequest)
            try validateResponse(retryResponse, data: retryData)
            
            return try decoder.decode(User.self, from: retryData)
        }
        
        try validateResponse(response, data: data)
        
        do {
            let user = try decoder.decode(User.self, from: data)
            return user
        } catch {
            throw AuthError.decodingError(error.localizedDescription)
        }
    }
    
    // MARK: - Private Methods
    
    /// Perform a network request with error handling.
    private func performRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch let error as URLError {
            throw AuthError.networkError(error.localizedDescription)
        } catch {
            throw AuthError.networkError(error.localizedDescription)
        }
    }
    
    /// Validate HTTP response and handle errors.
    private func validateResponse(_ response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.networkError("Invalid response type")
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            return // Success
            
        case 400:
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                if errorResponse.detail.lowercased().contains("email") &&
                   errorResponse.detail.lowercased().contains("exists") {
                    throw AuthError.emailAlreadyExists
                }
                throw AuthError.serverError(400, errorResponse.detail)
            }
            throw AuthError.serverError(400, "Bad request")
            
        case 401:
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                if errorResponse.detail.lowercased().contains("expired") {
                    throw AuthError.tokenExpired
                }
                if errorResponse.detail.lowercased().contains("invalid") {
                    throw AuthError.invalidCredentials
                }
            }
            throw AuthError.invalidCredentials
            
        case 403:
            throw AuthError.invalidToken
            
        case 404:
            throw AuthError.userNotFound
            
        case 422:
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw AuthError.serverError(422, errorResponse.detail)
            }
            throw AuthError.serverError(422, "Validation error")
            
        case 500...599:
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw AuthError.serverError(httpResponse.statusCode, errorResponse.detail)
            }
            throw AuthError.serverError(httpResponse.statusCode, "Server error")
            
        default:
            throw AuthError.serverError(httpResponse.statusCode, "Unexpected error")
        }
    }
    
    /// Validate email format.
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return email.range(of: emailRegex, options: .regularExpression) != nil
    }
    
    /// Validate password strength.
    private func isValidPassword(_ password: String) -> Bool {
        // At least 8 characters
        guard password.count >= 8 else { return false }
        
        // Contains at least one letter
        let hasLetter = password.range(of: "[A-Za-z]", options: .regularExpression) != nil
        
        // Contains at least one number
        let hasNumber = password.range(of: "[0-9]", options: .regularExpression) != nil
        
        return hasLetter && hasNumber
    }
}

// MARK: - Mock Auth Service (for testing and previews)

/// Mock authentication service for testing and SwiftUI previews.
public final class MockAuthService: AuthServiceProtocol, @unchecked Sendable {
    
    public var mockUser: User?
    public var mockLoginResponse: LoginResponse?
    public var mockTokenResponse: TokenResponse?
    public var shouldFail: Bool = false
    public var errorToThrow: AuthError = .unknown("Mock error")
    
    /// Simulated network delay in seconds
    public var simulatedDelay: TimeInterval = 0.5
    
    public init() {
        // Create default mock data
        let user = User(
            id: "mock-user-id",
            email: "test@example.com",
            displayName: "Test User",
            avatarURL: nil,
            emailVerified: true
        )
        self.mockUser = user
        self.mockLoginResponse = LoginResponse(
            user: user,
            accessToken: "mock-access-token",
            refreshToken: "mock-refresh-token"
        )
        self.mockTokenResponse = TokenResponse(
            accessToken: "mock-new-access-token",
            refreshToken: "mock-new-refresh-token"
        )
    }
    
    public func signup(email: String, password: String, displayName: String) async throws -> User {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        return User(
            id: UUID().uuidString,
            email: email,
            displayName: displayName,
            emailVerified: false
        )
    }
    
    public func login(email: String, password: String) async throws -> LoginResponse {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        guard let response = mockLoginResponse else {
            throw AuthError.unknown("No mock response configured")
        }
        
        return response
    }
    
    public func logout() async throws {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
    }
    
    public func refreshToken() async throws -> TokenResponse {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        guard let response = mockTokenResponse else {
            throw AuthError.unknown("No mock response configured")
        }
        
        return response
    }
    
    public func getCurrentUser() async throws -> User {
        try await simulateNetworkDelay()
        
        if shouldFail {
            throw errorToThrow
        }
        
        guard let user = mockUser else {
            throw AuthError.notAuthenticated
        }
        
        return user
    }
    
    private func simulateNetworkDelay() async throws {
        if simulatedDelay > 0 {
            try await Task.sleep(nanoseconds: UInt64(simulatedDelay * 1_000_000_000))
        }
    }
}
