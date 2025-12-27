//
//  AuthModels.swift
//  StreamerStudio
//
//  Data models for authentication - User, tokens, and API responses.
//

import Foundation

// MARK: - User Model

/// Represents an authenticated user in the system.
public struct User: Codable, Equatable, Identifiable, Sendable {
    /// Unique identifier for the user
    public let id: String
    /// User's email address
    public let email: String
    /// User's display name
    public let displayName: String
    /// URL to user's avatar image
    public let avatarURL: String?
    /// Whether the user's email has been verified
    public let emailVerified: Bool
    /// Account creation timestamp
    public let createdAt: Date
    /// Last update timestamp
    public let updatedAt: Date
    
    public init(
        id: String,
        email: String,
        displayName: String,
        avatarURL: String? = nil,
        emailVerified: Bool = false,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.avatarURL = avatarURL
        self.emailVerified = emailVerified
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case displayName = "display_name"
        case avatarURL = "avatar_url"
        case emailVerified = "email_verified"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// MARK: - Login Response

/// Response from a successful login request.
public struct LoginResponse: Codable, Equatable, Sendable {
    /// The authenticated user
    public let user: User
    /// JWT access token for API requests
    public let accessToken: String
    /// Refresh token for obtaining new access tokens
    public let refreshToken: String
    /// Token type (typically "Bearer")
    public let tokenType: String
    /// Access token expiration time in seconds
    public let expiresIn: Int
    
    public init(
        user: User,
        accessToken: String,
        refreshToken: String,
        tokenType: String = "Bearer",
        expiresIn: Int = 3600
    ) {
        self.user = user
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.tokenType = tokenType
        self.expiresIn = expiresIn
    }
    
    enum CodingKeys: String, CodingKey {
        case user
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
    }
}

// MARK: - Token Response

/// Response from a token refresh request.
public struct TokenResponse: Codable, Equatable, Sendable {
    /// New JWT access token
    public let accessToken: String
    /// New refresh token (if rotated)
    public let refreshToken: String?
    /// Token type (typically "Bearer")
    public let tokenType: String
    /// Access token expiration time in seconds
    public let expiresIn: Int
    
    public init(
        accessToken: String,
        refreshToken: String? = nil,
        tokenType: String = "Bearer",
        expiresIn: Int = 3600
    ) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.tokenType = tokenType
        self.expiresIn = expiresIn
    }
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
    }
}

// MARK: - Auth Request Models

/// Request body for user signup.
public struct SignupRequest: Codable, Sendable {
    public let email: String
    public let password: String
    public let displayName: String
    
    public init(email: String, password: String, displayName: String) {
        self.email = email
        self.password = password
        self.displayName = displayName
    }
    
    enum CodingKeys: String, CodingKey {
        case email
        case password
        case displayName = "display_name"
    }
}

/// Request body for user login.
public struct LoginRequest: Codable, Sendable {
    public let email: String
    public let password: String
    
    public init(email: String, password: String) {
        self.email = email
        self.password = password
    }
}

/// Request body for token refresh.
public struct RefreshTokenRequest: Codable, Sendable {
    public let refreshToken: String
    
    public init(refreshToken: String) {
        self.refreshToken = refreshToken
    }
    
    enum CodingKeys: String, CodingKey {
        case refreshToken = "refresh_token"
    }
}

// MARK: - Auth Error

/// Errors that can occur during authentication operations.
public enum AuthError: Error, Equatable, LocalizedError {
    /// Invalid email or password
    case invalidCredentials
    /// User account not found
    case userNotFound
    /// Email already registered
    case emailAlreadyExists
    /// Invalid or expired token
    case invalidToken
    /// Token has expired
    case tokenExpired
    /// Network request failed
    case networkError(String)
    /// Server returned an error
    case serverError(Int, String)
    /// Failed to decode response
    case decodingError(String)
    /// Keychain operation failed
    case keychainError(String)
    /// User is not authenticated
    case notAuthenticated
    /// Password does not meet requirements
    case weakPassword
    /// Invalid email format
    case invalidEmail
    /// Unknown error occurred
    case unknown(String)
    
    public var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password. Please try again."
        case .userNotFound:
            return "No account found with this email address."
        case .emailAlreadyExists:
            return "An account with this email already exists."
        case .invalidToken:
            return "Your session is invalid. Please sign in again."
        case .tokenExpired:
            return "Your session has expired. Please sign in again."
        case .networkError(let message):
            return "Network error: \(message)"
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message)"
        case .decodingError(let message):
            return "Failed to process response: \(message)"
        case .keychainError(let message):
            return "Secure storage error: \(message)"
        case .notAuthenticated:
            return "You must be signed in to perform this action."
        case .weakPassword:
            return "Password must be at least 8 characters with a mix of letters and numbers."
        case .invalidEmail:
            return "Please enter a valid email address."
        case .unknown(let message):
            return "An unexpected error occurred: \(message)"
        }
    }
    
    /// Create an AuthError from a generic Error.
    public static func from(_ error: Error) -> AuthError {
        if let authError = error as? AuthError {
            return authError
        }
        return .unknown(error.localizedDescription)
    }
}

// MARK: - API Error Response

/// Standard error response from the API.
public struct APIErrorResponse: Codable, Sendable {
    public let detail: String
    public let code: String?
    
    public init(detail: String, code: String? = nil) {
        self.detail = detail
        self.code = code
    }
}
