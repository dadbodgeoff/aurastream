//
//  TokenStorage.swift
//  StreamerStudio
//
//  Secure token storage using Keychain for authentication tokens.
//

import Foundation
import Security

// MARK: - Token Storage Protocol

/// Protocol defining secure token storage operations.
public protocol TokenStorageProtocol: Sendable {
    /// Save the access token securely.
    /// - Parameter token: The access token to save.
    func saveAccessToken(_ token: String) throws
    
    /// Retrieve the stored access token.
    /// - Returns: The access token if available, nil otherwise.
    func getAccessToken() throws -> String?
    
    /// Save the refresh token securely.
    /// - Parameter token: The refresh token to save.
    func saveRefreshToken(_ token: String) throws
    
    /// Retrieve the stored refresh token.
    /// - Returns: The refresh token if available, nil otherwise.
    func getRefreshToken() throws -> String?
    
    /// Clear all stored tokens.
    func clearTokens() throws
}

// MARK: - Keychain Token Storage

/// Secure token storage implementation using the iOS/macOS Keychain.
///
/// This class provides secure storage for authentication tokens using
/// the system Keychain, which encrypts data at rest and provides
/// protection against unauthorized access.
///
/// Usage:
/// ```swift
/// let storage = KeychainTokenStorage()
/// try storage.saveAccessToken("jwt_token_here")
/// let token = try storage.getAccessToken()
/// ```
public final class KeychainTokenStorage: TokenStorageProtocol, @unchecked Sendable {
    
    // MARK: - Constants
    
    private let accessTokenKey = "com.streamerstudio.accessToken"
    private let refreshTokenKey = "com.streamerstudio.refreshToken"
    private let serviceName = "com.streamerstudio.auth"
    
    /// Lock for thread-safe operations
    private let lock = NSLock()
    
    // MARK: - Initialization
    
    public init() {}
    
    // MARK: - TokenStorageProtocol Implementation
    
    public func saveAccessToken(_ token: String) throws {
        try save(token, forKey: accessTokenKey)
    }
    
    public func getAccessToken() throws -> String? {
        return try get(forKey: accessTokenKey)
    }
    
    public func saveRefreshToken(_ token: String) throws {
        try save(token, forKey: refreshTokenKey)
    }
    
    public func getRefreshToken() throws -> String? {
        return try get(forKey: refreshTokenKey)
    }
    
    public func clearTokens() throws {
        try delete(forKey: accessTokenKey)
        try delete(forKey: refreshTokenKey)
    }
    
    // MARK: - Private Keychain Methods
    
    /// Save a value to the Keychain.
    /// - Parameters:
    ///   - value: The string value to save.
    ///   - key: The key to associate with the value.
    private func save(_ value: String, forKey key: String) throws {
        lock.lock()
        defer { lock.unlock() }
        
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }
        
        // First, try to delete any existing item
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // Add the new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status: status)
        }
    }
    
    /// Retrieve a value from the Keychain.
    /// - Parameter key: The key associated with the value.
    /// - Returns: The stored string value, or nil if not found.
    private func get(forKey key: String) throws -> String? {
        lock.lock()
        defer { lock.unlock() }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        switch status {
        case errSecSuccess:
            guard let data = result as? Data,
                  let string = String(data: data, encoding: .utf8) else {
                throw KeychainError.decodingFailed
            }
            return string
            
        case errSecItemNotFound:
            return nil
            
        default:
            throw KeychainError.readFailed(status: status)
        }
    }
    
    /// Delete a value from the Keychain.
    /// - Parameter key: The key associated with the value to delete.
    private func delete(forKey key: String) throws {
        lock.lock()
        defer { lock.unlock() }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        // It's okay if the item doesn't exist
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status: status)
        }
    }
}

// MARK: - Keychain Error

/// Errors that can occur during Keychain operations.
public enum KeychainError: Error, LocalizedError {
    case encodingFailed
    case decodingFailed
    case saveFailed(status: OSStatus)
    case readFailed(status: OSStatus)
    case deleteFailed(status: OSStatus)
    
    public var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode data for Keychain storage."
        case .decodingFailed:
            return "Failed to decode data from Keychain."
        case .saveFailed(let status):
            return "Failed to save to Keychain (status: \(status))."
        case .readFailed(let status):
            return "Failed to read from Keychain (status: \(status))."
        case .deleteFailed(let status):
            return "Failed to delete from Keychain (status: \(status))."
        }
    }
}

// MARK: - In-Memory Token Storage (for testing)

/// In-memory token storage for testing purposes.
///
/// This implementation stores tokens in memory and should only be used
/// for unit testing. Do not use in production.
public final class InMemoryTokenStorage: TokenStorageProtocol, @unchecked Sendable {
    private var accessToken: String?
    private var refreshToken: String?
    private let lock = NSLock()
    
    public init() {}
    
    public func saveAccessToken(_ token: String) throws {
        lock.lock()
        defer { lock.unlock() }
        accessToken = token
    }
    
    public func getAccessToken() throws -> String? {
        lock.lock()
        defer { lock.unlock() }
        return accessToken
    }
    
    public func saveRefreshToken(_ token: String) throws {
        lock.lock()
        defer { lock.unlock() }
        refreshToken = token
    }
    
    public func getRefreshToken() throws -> String? {
        lock.lock()
        defer { lock.unlock() }
        return refreshToken
    }
    
    public func clearTokens() throws {
        lock.lock()
        defer { lock.unlock() }
        accessToken = nil
        refreshToken = nil
    }
}
