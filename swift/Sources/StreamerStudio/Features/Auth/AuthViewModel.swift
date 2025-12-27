//
//  AuthViewModel.swift
//  StreamerStudio
//
//  ViewModel for authentication state management using @Observable.
//

import Foundation
import Observation

// MARK: - Auth State

/// Represents the current authentication state.
public enum AuthState: Equatable, Sendable {
    /// User is not authenticated
    case unauthenticated
    /// Authentication is in progress
    case authenticating
    /// User is authenticated
    case authenticated(User)
    /// Authentication failed with an error
    case failed(AuthError)
}

// MARK: - Auth ViewModel

/// ViewModel for managing authentication state and operations.
///
/// This class uses the @Observable macro (iOS 17+) for automatic
/// SwiftUI view updates when state changes.
///
/// Usage:
/// ```swift
/// @State private var viewModel = AuthViewModel()
///
/// var body: some View {
///     if viewModel.isAuthenticated {
///         HomeView()
///     } else {
///         LoginView(viewModel: viewModel)
///     }
/// }
/// ```
@Observable
public final class AuthViewModel {
    
    // MARK: - Published State
    
    /// The currently authenticated user, if any.
    public private(set) var user: User?
    
    /// Whether the user is currently authenticated.
    public private(set) var isAuthenticated: Bool = false
    
    /// Whether an authentication operation is in progress.
    public private(set) var isLoading: Bool = false
    
    /// The most recent authentication error, if any.
    public private(set) var error: AuthError?
    
    /// Current authentication state.
    public var authState: AuthState {
        if isLoading {
            return .authenticating
        }
        if let error = error {
            return .failed(error)
        }
        if let user = user, isAuthenticated {
            return .authenticated(user)
        }
        return .unauthenticated
    }
    
    // MARK: - Dependencies
    
    private let authService: AuthServiceProtocol
    
    // MARK: - Initialization
    
    /// Initialize the auth view model.
    /// - Parameter authService: The authentication service to use.
    public init(authService: AuthServiceProtocol = AuthService()) {
        self.authService = authService
    }
    
    // MARK: - Actions
    
    /// Attempt to log in with email and password.
    /// - Parameters:
    ///   - email: User's email address.
    ///   - password: User's password.
    @MainActor
    public func login(email: String, password: String) async {
        isLoading = true
        error = nil
        
        do {
            let response = try await authService.login(email: email, password: password)
            user = response.user
            isAuthenticated = true
        } catch {
            self.error = AuthError.from(error)
            isAuthenticated = false
            user = nil
        }
        
        isLoading = false
    }
    
    /// Register a new user account.
    /// - Parameters:
    ///   - email: User's email address.
    ///   - password: User's password.
    ///   - displayName: User's display name.
    @MainActor
    public func signup(email: String, password: String, displayName: String) async {
        isLoading = true
        error = nil
        
        do {
            let newUser = try await authService.signup(
                email: email,
                password: password,
                displayName: displayName
            )
            
            // After successful signup, automatically log in
            let response = try await authService.login(email: email, password: password)
            user = response.user
            isAuthenticated = true
        } catch {
            self.error = AuthError.from(error)
            isAuthenticated = false
            user = nil
        }
        
        isLoading = false
    }
    
    /// Sign out the current user.
    @MainActor
    public func logout() async {
        isLoading = true
        error = nil
        
        do {
            try await authService.logout()
        } catch {
            // Log error but continue with local logout
            print("Logout error: \(error.localizedDescription)")
        }
        
        // Always clear local state
        user = nil
        isAuthenticated = false
        isLoading = false
    }
    
    /// Refresh the current user's information.
    @MainActor
    public func refreshUser() async {
        guard isAuthenticated else { return }
        
        isLoading = true
        error = nil
        
        do {
            let currentUser = try await authService.getCurrentUser()
            user = currentUser
        } catch {
            self.error = AuthError.from(error)
            
            // If we get an auth error, the user may need to re-authenticate
            if case .notAuthenticated = AuthError.from(error) {
                user = nil
                isAuthenticated = false
            } else if case .tokenExpired = AuthError.from(error) {
                user = nil
                isAuthenticated = false
            }
        }
        
        isLoading = false
    }
    
    /// Attempt to restore authentication state from stored tokens.
    @MainActor
    public func restoreSession() async {
        isLoading = true
        error = nil
        
        do {
            let currentUser = try await authService.getCurrentUser()
            user = currentUser
            isAuthenticated = true
        } catch {
            // Session restoration failed - user needs to log in again
            user = nil
            isAuthenticated = false
            // Don't set error for session restoration failure
        }
        
        isLoading = false
    }
    
    /// Clear any displayed error.
    @MainActor
    public func clearError() {
        error = nil
    }
    
    // MARK: - Validation Helpers
    
    /// Validate an email address format.
    /// - Parameter email: The email to validate.
    /// - Returns: True if the email format is valid.
    public func isValidEmail(_ email: String) -> Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return email.range(of: emailRegex, options: .regularExpression) != nil
    }
    
    /// Validate password strength.
    /// - Parameter password: The password to validate.
    /// - Returns: True if the password meets requirements.
    public func isValidPassword(_ password: String) -> Bool {
        guard password.count >= 8 else { return false }
        let hasLetter = password.range(of: "[A-Za-z]", options: .regularExpression) != nil
        let hasNumber = password.range(of: "[0-9]", options: .regularExpression) != nil
        return hasLetter && hasNumber
    }
    
    /// Get password validation feedback.
    /// - Parameter password: The password to check.
    /// - Returns: Array of validation issues, empty if valid.
    public func passwordValidationIssues(_ password: String) -> [String] {
        var issues: [String] = []
        
        if password.count < 8 {
            issues.append("At least 8 characters")
        }
        if password.range(of: "[A-Za-z]", options: .regularExpression) == nil {
            issues.append("At least one letter")
        }
        if password.range(of: "[0-9]", options: .regularExpression) == nil {
            issues.append("At least one number")
        }
        
        return issues
    }
}

// MARK: - Preview Helper

extension AuthViewModel {
    /// Create a preview instance with mock data.
    public static var preview: AuthViewModel {
        let viewModel = AuthViewModel(authService: MockAuthService())
        return viewModel
    }
    
    /// Create a preview instance in authenticated state.
    public static var authenticatedPreview: AuthViewModel {
        let viewModel = AuthViewModel(authService: MockAuthService())
        viewModel.user = User(
            id: "preview-user",
            email: "preview@example.com",
            displayName: "Preview User",
            emailVerified: true
        )
        viewModel.isAuthenticated = true
        return viewModel
    }
    
    /// Create a preview instance with an error.
    public static var errorPreview: AuthViewModel {
        let viewModel = AuthViewModel(authService: MockAuthService())
        viewModel.error = .invalidCredentials
        return viewModel
    }
}
