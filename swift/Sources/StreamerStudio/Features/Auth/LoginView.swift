//
//  LoginView.swift
//  StreamerStudio
//
//  Login view for user authentication.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Login View

/// Login view for authenticating users.
///
/// This view provides email/password login with support for:
/// - Password visibility toggle
/// - Form validation
/// - Loading states
/// - Error display
/// - Navigation to signup and forgot password
/// - OAuth sign-in options (Apple, Google)
///
/// Usage:
/// ```swift
/// @State private var viewModel = AuthViewModel()
/// @State private var coordinator = AuthCoordinator()
///
/// var body: some View {
///     LoginView(viewModel: viewModel, coordinator: coordinator)
/// }
/// ```
public struct LoginView: View {
    
    // MARK: - State
    
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var rememberMe = false
    
    // MARK: - Dependencies
    
    @Bindable var viewModel: AuthViewModel
    var coordinator: AuthCoordinator?
    
    // MARK: - Computed Properties
    
    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty && viewModel.isValidEmail(email)
    }
    
    // MARK: - Initialization
    
    public init(viewModel: AuthViewModel, coordinator: AuthCoordinator? = nil) {
        self.viewModel = viewModel
        self.coordinator = coordinator
    }
    
    // MARK: - Body
    
    public var body: some View {
        ScrollView {
            VStack(spacing: Spacing.scale6) {
                // Logo and Title
                headerSection
                
                // Login Form
                formSection
                
                // Login Button
                loginButton
                
                // Forgot Password
                forgotPasswordLink
                
                // Divider
                dividerSection
                
                // OAuth Buttons
                oauthSection
                
                // Sign Up Link
                signupLink
            }
            .padding(Spacing.scale4)
        }
        .background(Color(hex: Colors.Background.primary))
        .navigationTitle("Sign In")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
    
    // MARK: - View Components
    
    private var headerSection: some View {
        VStack(spacing: Spacing.scale2) {
            // App Logo
            Image(systemName: "video.fill")
                .font(.system(size: 48))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(hex: Colors.Primary.main), Color(hex: Colors.Primary.light)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .accessibilityHidden(true)
            
            Text("Aurastream")
                .font(.system(size: Typography.FontSize.xl2, weight: .bold))
                .foregroundColor(Color(hex: Colors.Text.primary))
            
            Text("Sign in to continue")
                .font(.system(size: Typography.FontSize.base))
                .foregroundColor(Color(hex: Colors.Text.secondary))
        }
        .padding(.vertical, Spacing.scale4)
    }
    
    private var formSection: some View {
        VStack(spacing: Spacing.scale4) {
            // Email Field
            VStack(alignment: .leading, spacing: Spacing.scale1) {
                Text("Email")
                    .font(.system(size: Typography.FontSize.sm, weight: .medium))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                TextField("Enter your email", text: $email)
                    .textFieldStyle(AuthTextFieldStyle())
                    .textContentType(.emailAddress)
                    #if os(iOS)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    #endif
                    .autocorrectionDisabled()
                    .accessibilityLabel("Email address")
                    .accessibilityHint("Enter your email address to sign in")
            }
            
            // Password Field
            VStack(alignment: .leading, spacing: Spacing.scale1) {
                Text("Password")
                    .font(.system(size: Typography.FontSize.sm, weight: .medium))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                HStack {
                    Group {
                        if showPassword {
                            TextField("Enter your password", text: $password)
                        } else {
                            SecureField("Enter your password", text: $password)
                        }
                    }
                    .textContentType(.password)
                    #if os(iOS)
                    .textInputAutocapitalization(.never)
                    #endif
                    .autocorrectionDisabled()
                    
                    Button(action: { showPassword.toggle() }) {
                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(Color(hex: Colors.Text.tertiary))
                    }
                    .accessibilityLabel(showPassword ? "Hide password" : "Show password")
                }
                .padding(Spacing.scale3)
                .background(Color(hex: Colors.Background.secondary))
                .cornerRadius(Spacing.Radius.md)
                .overlay(
                    RoundedRectangle(cornerRadius: Spacing.Radius.md)
                        .stroke(Color(hex: Colors.Border.default), lineWidth: 1)
                )
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Password")
                .accessibilityHint("Enter your password to sign in")
            }
            
            // Remember Me Toggle
            Toggle(isOn: $rememberMe) {
                Text("Remember me")
                    .font(.system(size: Typography.FontSize.sm))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
            }
            .toggleStyle(SwitchToggleStyle(tint: Color(hex: Colors.Primary.main)))
            .accessibilityLabel("Remember me")
            .accessibilityHint("Keep me signed in on this device")
        }
    }
    
    private var loginButton: some View {
        Button(action: performLogin) {
            HStack {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.9)
                } else {
                    Text("Sign In")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(Spacing.scale3)
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!isFormValid || viewModel.isLoading)
        .accessibilityLabel("Sign in")
        .accessibilityHint(isFormValid ? "Double tap to sign in" : "Enter email and password to enable")
    }
    
    private var forgotPasswordLink: some View {
        Button(action: navigateToForgotPassword) {
            Text("Forgot password?")
                .font(.system(size: Typography.FontSize.sm))
                .foregroundColor(Color(hex: Colors.Primary.main))
        }
        .accessibilityLabel("Forgot password")
        .accessibilityHint("Double tap to reset your password")
    }
    
    private var dividerSection: some View {
        HStack {
            Rectangle()
                .fill(Color(hex: Colors.Border.default))
                .frame(height: 1)
            
            Text("or continue with")
                .font(.system(size: Typography.FontSize.sm))
                .foregroundColor(Color(hex: Colors.Text.tertiary))
                .padding(.horizontal, Spacing.scale2)
            
            Rectangle()
                .fill(Color(hex: Colors.Border.default))
                .frame(height: 1)
        }
        .padding(.vertical, Spacing.scale2)
    }
    
    private var oauthSection: some View {
        VStack(spacing: Spacing.scale3) {
            // Sign in with Apple
            Button(action: signInWithApple) {
                HStack {
                    Image(systemName: "apple.logo")
                        .font(.system(size: 18))
                    Text("Continue with Apple")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(Spacing.scale3)
            }
            .buttonStyle(OAuthButtonStyle())
            .accessibilityLabel("Sign in with Apple")
            .accessibilityHint("Double tap to sign in using your Apple ID")
            
            // Sign in with Google
            Button(action: signInWithGoogle) {
                HStack {
                    Image(systemName: "g.circle.fill")
                        .font(.system(size: 18))
                    Text("Continue with Google")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(Spacing.scale3)
            }
            .buttonStyle(OAuthButtonStyle())
            .accessibilityLabel("Sign in with Google")
            .accessibilityHint("Double tap to sign in using your Google account")
        }
    }
    
    private var signupLink: some View {
        HStack(spacing: Spacing.scale1) {
            Text("Don't have an account?")
                .font(.system(size: Typography.FontSize.sm))
                .foregroundColor(Color(hex: Colors.Text.secondary))
            
            Button(action: navigateToSignup) {
                Text("Sign up")
                    .font(.system(size: Typography.FontSize.sm, weight: .semibold))
                    .foregroundColor(Color(hex: Colors.Primary.main))
            }
            .accessibilityLabel("Sign up")
            .accessibilityHint("Double tap to create a new account")
        }
        .padding(.top, Spacing.scale4)
    }
    
    // MARK: - Error Display
    
    @ViewBuilder
    private var errorBanner: some View {
        if let error = viewModel.error {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(Color(hex: Colors.Semantic.error))
                
                Text(error.localizedDescription)
                    .font(.system(size: Typography.FontSize.sm))
                    .foregroundColor(Color(hex: Colors.Semantic.error))
                
                Spacer()
                
                Button(action: { viewModel.clearError() }) {
                    Image(systemName: "xmark")
                        .foregroundColor(Color(hex: Colors.Text.tertiary))
                }
                .accessibilityLabel("Dismiss error")
            }
            .padding(Spacing.scale3)
            .background(Color(hex: Colors.Semantic.error).opacity(0.1))
            .cornerRadius(Spacing.Radius.md)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Error: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Actions
    
    private func performLogin() {
        Task {
            await viewModel.login(email: email, password: password)
        }
    }
    
    private func navigateToSignup() {
        coordinator?.navigate(to: .signup)
    }
    
    private func navigateToForgotPassword() {
        coordinator?.navigate(to: .forgotPassword)
    }
    
    private func signInWithApple() {
        // TODO: Implement Sign in with Apple
        coordinator?.showAlert(message: "Sign in with Apple coming soon!")
    }
    
    private func signInWithGoogle() {
        // TODO: Implement Sign in with Google
        coordinator?.showAlert(message: "Sign in with Google coming soon!")
    }
}

// MARK: - Custom Styles

/// Text field style for authentication forms.
struct AuthTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(Spacing.scale3)
            .background(Color(hex: Colors.Background.secondary))
            .cornerRadius(Spacing.Radius.md)
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.Radius.md)
                    .stroke(Color(hex: Colors.Border.default), lineWidth: 1)
            )
            .foregroundColor(Color(hex: Colors.Text.primary))
    }
}

/// Primary button style for main actions.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(.white)
            .background(
                RoundedRectangle(cornerRadius: Spacing.Radius.md)
                    .fill(
                        isEnabled
                            ? (configuration.isPressed
                                ? Color(hex: Colors.Primary.dark)
                                : Color(hex: Colors.Primary.main))
                            : Color(hex: Colors.Text.disabled)
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

/// Button style for OAuth sign-in buttons.
struct OAuthButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(Color(hex: Colors.Text.primary))
            .background(
                RoundedRectangle(cornerRadius: Spacing.Radius.md)
                    .fill(Color(hex: Colors.Background.secondary))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Spacing.Radius.md)
                    .stroke(Color(hex: Colors.Border.default), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Preview

#Preview("Login View") {
    LoginView(
        viewModel: AuthViewModel.preview,
        coordinator: AuthCoordinator()
    )
}

#Preview("Login View - Dark") {
    LoginView(
        viewModel: AuthViewModel.preview,
        coordinator: AuthCoordinator()
    )
    .preferredColorScheme(.dark)
}

#Preview("Login View - With Error") {
    LoginView(
        viewModel: AuthViewModel.errorPreview,
        coordinator: AuthCoordinator()
    )
}
