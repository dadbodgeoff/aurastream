//
//  AuthCoordinator.swift
//  StreamerStudio
//
//  Navigation coordinator for authentication flow.
//

import SwiftUI
import Observation

// MARK: - Auth Route

/// Routes available in the authentication flow.
public enum AuthRoute: Hashable, Sendable {
    /// Login screen
    case login
    /// Signup/registration screen
    case signup
    /// Forgot password screen
    case forgotPassword
    /// Email verification screen
    case emailVerification(email: String)
    /// Password reset confirmation
    case resetPasswordConfirmation
}

// MARK: - Auth Coordinator

/// Coordinator for managing navigation within the authentication flow.
///
/// This class uses the @Observable macro (iOS 17+) and NavigationPath
/// for type-safe, programmatic navigation.
///
/// Usage:
/// ```swift
/// @State private var coordinator = AuthCoordinator()
///
/// var body: some View {
///     NavigationStack(path: $coordinator.path) {
///         LoginView(viewModel: viewModel)
///             .navigationDestination(for: AuthRoute.self) { route in
///                 coordinator.view(for: route, viewModel: viewModel)
///             }
///     }
/// }
/// ```
@Observable
public final class AuthCoordinator {
    
    // MARK: - Properties
    
    /// Navigation path for the auth flow.
    public var path = NavigationPath()
    
    /// Whether the coordinator is presenting a sheet.
    public var presentedSheet: AuthRoute?
    
    /// Whether the coordinator is presenting an alert.
    public var showingAlert: Bool = false
    
    /// Alert message to display.
    public var alertMessage: String = ""
    
    // MARK: - Initialization
    
    public init() {}
    
    // MARK: - Navigation Actions
    
    /// Navigate to a specific route.
    /// - Parameter route: The route to navigate to.
    public func navigate(to route: AuthRoute) {
        path.append(route)
    }
    
    /// Pop the top view from the navigation stack.
    public func pop() {
        guard !path.isEmpty else { return }
        path.removeLast()
    }
    
    /// Pop to the root of the navigation stack.
    public func popToRoot() {
        path.removeLast(path.count)
    }
    
    /// Present a route as a sheet.
    /// - Parameter route: The route to present.
    public func presentSheet(_ route: AuthRoute) {
        presentedSheet = route
    }
    
    /// Dismiss the currently presented sheet.
    public func dismissSheet() {
        presentedSheet = nil
    }
    
    /// Show an alert with a message.
    /// - Parameter message: The message to display.
    public func showAlert(message: String) {
        alertMessage = message
        showingAlert = true
    }
    
    /// Dismiss the current alert.
    public func dismissAlert() {
        showingAlert = false
        alertMessage = ""
    }
    
    // MARK: - Route Handling
    
    /// Get the title for a route.
    /// - Parameter route: The route to get the title for.
    /// - Returns: The navigation title for the route.
    public func title(for route: AuthRoute) -> String {
        switch route {
        case .login:
            return "Sign In"
        case .signup:
            return "Create Account"
        case .forgotPassword:
            return "Reset Password"
        case .emailVerification:
            return "Verify Email"
        case .resetPasswordConfirmation:
            return "Password Reset"
        }
    }
    
    /// Check if back navigation is available.
    public var canGoBack: Bool {
        !path.isEmpty
    }
    
    /// Get the current depth of the navigation stack.
    public var navigationDepth: Int {
        path.count
    }
}

// MARK: - Auth Flow Container

/// Container view for the authentication flow with navigation.
///
/// This view sets up the NavigationStack and handles routing
/// between authentication screens.
public struct AuthFlowContainer: View {
    @Bindable var coordinator: AuthCoordinator
    @Bindable var viewModel: AuthViewModel
    
    public init(coordinator: AuthCoordinator, viewModel: AuthViewModel) {
        self.coordinator = coordinator
        self.viewModel = viewModel
    }
    
    public var body: some View {
        NavigationStack(path: $coordinator.path) {
            LoginView(viewModel: viewModel, coordinator: coordinator)
                .navigationDestination(for: AuthRoute.self) { route in
                    destinationView(for: route)
                }
        }
        .sheet(item: $coordinator.presentedSheet) { route in
            sheetView(for: route)
        }
        .alert("Notice", isPresented: $coordinator.showingAlert) {
            Button("OK") {
                coordinator.dismissAlert()
            }
        } message: {
            Text(coordinator.alertMessage)
        }
    }
    
    @ViewBuilder
    private func destinationView(for route: AuthRoute) -> some View {
        switch route {
        case .login:
            LoginView(viewModel: viewModel, coordinator: coordinator)
        case .signup:
            SignupView(viewModel: viewModel, coordinator: coordinator)
        case .forgotPassword:
            ForgotPasswordView(coordinator: coordinator)
        case .emailVerification(let email):
            EmailVerificationView(email: email, coordinator: coordinator)
        case .resetPasswordConfirmation:
            ResetPasswordConfirmationView(coordinator: coordinator)
        }
    }
    
    @ViewBuilder
    private func sheetView(for route: AuthRoute) -> some View {
        NavigationStack {
            destinationView(for: route)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            coordinator.dismissSheet()
                        }
                    }
                }
        }
    }
}

// MARK: - AuthRoute Identifiable

extension AuthRoute: Identifiable {
    public var id: String {
        switch self {
        case .login:
            return "login"
        case .signup:
            return "signup"
        case .forgotPassword:
            return "forgotPassword"
        case .emailVerification(let email):
            return "emailVerification-\(email)"
        case .resetPasswordConfirmation:
            return "resetPasswordConfirmation"
        }
    }
}

// MARK: - Placeholder Views

/// Placeholder view for forgot password functionality.
public struct ForgotPasswordView: View {
    let coordinator: AuthCoordinator
    @State private var email = ""
    @State private var isSubmitting = false
    
    public init(coordinator: AuthCoordinator) {
        self.coordinator = coordinator
    }
    
    public var body: some View {
        VStack(spacing: 24) {
            Text("Reset Your Password")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Enter your email address and we'll send you a link to reset your password.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                #if os(iOS)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                #endif
                .accessibilityLabel("Email address")
            
            Button(action: submitReset) {
                if isSubmitting {
                    ProgressView()
                        .progressViewStyle(.circular)
                } else {
                    Text("Send Reset Link")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(email.isEmpty || isSubmitting)
            
            Spacer()
        }
        .padding()
        .navigationTitle("Reset Password")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
    
    private func submitReset() {
        isSubmitting = true
        // TODO: Implement password reset
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            coordinator.navigate(to: .resetPasswordConfirmation)
            isSubmitting = false
        }
    }
}

/// Placeholder view for email verification.
public struct EmailVerificationView: View {
    let email: String
    let coordinator: AuthCoordinator
    
    public init(email: String, coordinator: AuthCoordinator) {
        self.email = email
        self.coordinator = coordinator
    }
    
    public var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "envelope.badge")
                .font(.system(size: 60))
                .foregroundStyle(.blue)
            
            Text("Verify Your Email")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("We've sent a verification link to:")
                .font(.body)
                .foregroundStyle(.secondary)
            
            Text(email)
                .font(.body)
                .fontWeight(.medium)
            
            Text("Please check your inbox and click the link to verify your account.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Resend Email") {
                // TODO: Implement resend
            }
            .buttonStyle(.bordered)
            
            Spacer()
        }
        .padding()
        .navigationTitle("Verify Email")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

/// Placeholder view for password reset confirmation.
public struct ResetPasswordConfirmationView: View {
    let coordinator: AuthCoordinator
    
    public init(coordinator: AuthCoordinator) {
        self.coordinator = coordinator
    }
    
    public var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(.green)
            
            Text("Check Your Email")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("If an account exists with that email, we've sent password reset instructions.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Back to Sign In") {
                coordinator.popToRoot()
            }
            .buttonStyle(.borderedProminent)
            
            Spacer()
        }
        .padding()
        .navigationTitle("Email Sent")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}
