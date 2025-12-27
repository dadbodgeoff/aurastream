//
//  SignupView.swift
//  StreamerStudio
//
//  Signup view for new user registration.
//

import SwiftUI
import StreamerStudioCore

// MARK: - Signup View

/// Signup view for registering new users.
///
/// This view provides user registration with support for:
/// - Email, password, and display name input
/// - Password strength validation
/// - Password confirmation
/// - Terms of service agreement
/// - Loading states
/// - Error display
/// - Navigation back to login
///
/// Usage:
/// ```swift
/// @State private var viewModel = AuthViewModel()
/// @State private var coordinator = AuthCoordinator()
///
/// var body: some View {
///     SignupView(viewModel: viewModel, coordinator: coordinator)
/// }
/// ```
public struct SignupView: View {
    
    // MARK: - State
    
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var displayName = ""
    @State private var showPassword = false
    @State private var showConfirmPassword = false
    @State private var agreedToTerms = false
    
    // MARK: - Focus State
    
    @FocusState private var focusedField: Field?
    
    private enum Field: Hashable {
        case displayName
        case email
        case password
        case confirmPassword
    }
    
    // MARK: - Dependencies
    
    @Bindable var viewModel: AuthViewModel
    var coordinator: AuthCoordinator?
    
    // MARK: - Computed Properties
    
    private var isFormValid: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        !confirmPassword.isEmpty &&
        !displayName.isEmpty &&
        viewModel.isValidEmail(email) &&
        viewModel.isValidPassword(password) &&
        password == confirmPassword &&
        agreedToTerms
    }
    
    private var passwordsMatch: Bool {
        password == confirmPassword || confirmPassword.isEmpty
    }
    
    private var passwordValidationIssues: [String] {
        viewModel.passwordValidationIssues(password)
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
                // Header
                headerSection
                
                // Error Banner
                errorBanner
                
                // Signup Form
                formSection
                
                // Password Requirements
                passwordRequirementsSection
                
                // Terms Agreement
                termsSection
                
                // Signup Button
                signupButton
                
                // Divider
                dividerSection
                
                // OAuth Buttons
                oauthSection
                
                // Login Link
                loginLink
            }
            .padding(Spacing.scale4)
        }
        .background(Color(hex: Colors.Background.primary))
        .navigationTitle("Create Account")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
    
    // MARK: - View Components
    
    private var headerSection: some View {
        VStack(spacing: Spacing.scale2) {
            Image(systemName: "person.badge.plus.fill")
                .font(.system(size: 48))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color(hex: Colors.Primary.main), Color(hex: Colors.Primary.light)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .accessibilityHidden(true)
            
            Text("Create Your Account")
                .font(.system(size: Typography.FontSize.xl2, weight: .bold))
                .foregroundColor(Color(hex: Colors.Text.primary))
            
            Text("Join Aurastream today")
                .font(.system(size: Typography.FontSize.base))
                .foregroundColor(Color(hex: Colors.Text.secondary))
        }
        .padding(.vertical, Spacing.scale4)
    }
    
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
    
    private var formSection: some View {
        VStack(spacing: Spacing.scale4) {
            // Display Name Field
            VStack(alignment: .leading, spacing: Spacing.scale1) {
                Text("Display Name")
                    .font(.system(size: Typography.FontSize.sm, weight: .medium))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                TextField("Enter your display name", text: $displayName)
                    .textFieldStyle(AuthTextFieldStyle())
                    .textContentType(.name)
                    #if os(iOS)
                    .textInputAutocapitalization(.words)
                    #endif
                    .focused($focusedField, equals: .displayName)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .email }
                    .accessibilityLabel("Display name")
                    .accessibilityHint("Enter the name others will see")
            }
            
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
                    .focused($focusedField, equals: .email)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .password }
                    .accessibilityLabel("Email address")
                    .accessibilityHint("Enter your email address")
                
                // Email validation feedback
                if !email.isEmpty && !viewModel.isValidEmail(email) {
                    Text("Please enter a valid email address")
                        .font(.system(size: Typography.FontSize.xs))
                        .foregroundColor(Color(hex: Colors.Semantic.error))
                }
            }
            
            // Password Field
            VStack(alignment: .leading, spacing: Spacing.scale1) {
                Text("Password")
                    .font(.system(size: Typography.FontSize.sm, weight: .medium))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                HStack {
                    Group {
                        if showPassword {
                            TextField("Create a password", text: $password)
                        } else {
                            SecureField("Create a password", text: $password)
                        }
                    }
                    .textContentType(.newPassword)
                    #if os(iOS)
                    .textInputAutocapitalization(.never)
                    #endif
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .password)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .confirmPassword }
                    
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
                .accessibilityHint("Create a secure password")
            }
            
            // Confirm Password Field
            VStack(alignment: .leading, spacing: Spacing.scale1) {
                Text("Confirm Password")
                    .font(.system(size: Typography.FontSize.sm, weight: .medium))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                HStack {
                    Group {
                        if showConfirmPassword {
                            TextField("Confirm your password", text: $confirmPassword)
                        } else {
                            SecureField("Confirm your password", text: $confirmPassword)
                        }
                    }
                    .textContentType(.newPassword)
                    #if os(iOS)
                    .textInputAutocapitalization(.never)
                    #endif
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .confirmPassword)
                    .submitLabel(.done)
                    .onSubmit { focusedField = nil }
                    
                    Button(action: { showConfirmPassword.toggle() }) {
                        Image(systemName: showConfirmPassword ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(Color(hex: Colors.Text.tertiary))
                    }
                    .accessibilityLabel(showConfirmPassword ? "Hide password" : "Show password")
                }
                .padding(Spacing.scale3)
                .background(Color(hex: Colors.Background.secondary))
                .cornerRadius(Spacing.Radius.md)
                .overlay(
                    RoundedRectangle(cornerRadius: Spacing.Radius.md)
                        .stroke(
                            passwordsMatch
                                ? Color(hex: Colors.Border.default)
                                : Color(hex: Colors.Semantic.error),
                            lineWidth: 1
                        )
                )
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Confirm password")
                .accessibilityHint("Re-enter your password to confirm")
                
                // Password match feedback
                if !confirmPassword.isEmpty && !passwordsMatch {
                    Text("Passwords do not match")
                        .font(.system(size: Typography.FontSize.xs))
                        .foregroundColor(Color(hex: Colors.Semantic.error))
                }
            }
        }
    }
    
    @ViewBuilder
    private var passwordRequirementsSection: some View {
        if !password.isEmpty {
            VStack(alignment: .leading, spacing: Spacing.scale2) {
                Text("Password Requirements")
                    .font(.system(size: Typography.FontSize.sm, weight: .medium))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                VStack(alignment: .leading, spacing: Spacing.scale1) {
                    PasswordRequirementRow(
                        text: "At least 8 characters",
                        isMet: password.count >= 8
                    )
                    PasswordRequirementRow(
                        text: "At least one letter",
                        isMet: password.range(of: "[A-Za-z]", options: .regularExpression) != nil
                    )
                    PasswordRequirementRow(
                        text: "At least one number",
                        isMet: password.range(of: "[0-9]", options: .regularExpression) != nil
                    )
                }
            }
            .padding(Spacing.scale3)
            .background(Color(hex: Colors.Background.secondary))
            .cornerRadius(Spacing.Radius.md)
        }
    }
    
    private var termsSection: some View {
        Toggle(isOn: $agreedToTerms) {
            HStack(spacing: Spacing.scale1) {
                Text("I agree to the")
                    .font(.system(size: Typography.FontSize.sm))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                Button(action: openTermsOfService) {
                    Text("Terms of Service")
                        .font(.system(size: Typography.FontSize.sm))
                        .foregroundColor(Color(hex: Colors.Primary.main))
                }
                
                Text("and")
                    .font(.system(size: Typography.FontSize.sm))
                    .foregroundColor(Color(hex: Colors.Text.secondary))
                
                Button(action: openPrivacyPolicy) {
                    Text("Privacy Policy")
                        .font(.system(size: Typography.FontSize.sm))
                        .foregroundColor(Color(hex: Colors.Primary.main))
                }
            }
        }
        .toggleStyle(CheckboxToggleStyle())
        .accessibilityLabel("Terms agreement")
        .accessibilityHint("You must agree to the terms to create an account")
    }
    
    private var signupButton: some View {
        Button(action: performSignup) {
            HStack {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.9)
                } else {
                    Text("Create Account")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(Spacing.scale3)
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!isFormValid || viewModel.isLoading)
        .accessibilityLabel("Create account")
        .accessibilityHint(isFormValid ? "Double tap to create your account" : "Complete all fields to enable")
    }
    
    private var dividerSection: some View {
        HStack {
            Rectangle()
                .fill(Color(hex: Colors.Border.default))
                .frame(height: 1)
            
            Text("or sign up with")
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
            // Sign up with Apple
            Button(action: signUpWithApple) {
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
            .accessibilityLabel("Sign up with Apple")
            .accessibilityHint("Double tap to sign up using your Apple ID")
            
            // Sign up with Google
            Button(action: signUpWithGoogle) {
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
            .accessibilityLabel("Sign up with Google")
            .accessibilityHint("Double tap to sign up using your Google account")
        }
    }
    
    private var loginLink: some View {
        HStack(spacing: Spacing.scale1) {
            Text("Already have an account?")
                .font(.system(size: Typography.FontSize.sm))
                .foregroundColor(Color(hex: Colors.Text.secondary))
            
            Button(action: navigateToLogin) {
                Text("Sign in")
                    .font(.system(size: Typography.FontSize.sm, weight: .semibold))
                    .foregroundColor(Color(hex: Colors.Primary.main))
            }
            .accessibilityLabel("Sign in")
            .accessibilityHint("Double tap to go to the sign in screen")
        }
        .padding(.top, Spacing.scale4)
    }
    
    // MARK: - Actions
    
    private func performSignup() {
        Task {
            await viewModel.signup(
                email: email,
                password: password,
                displayName: displayName
            )
        }
    }
    
    private func navigateToLogin() {
        coordinator?.pop()
    }
    
    private func signUpWithApple() {
        // TODO: Implement Sign up with Apple
        coordinator?.showAlert(message: "Sign up with Apple coming soon!")
    }
    
    private func signUpWithGoogle() {
        // TODO: Implement Sign up with Google
        coordinator?.showAlert(message: "Sign up with Google coming soon!")
    }
    
    private func openTermsOfService() {
        // TODO: Open Terms of Service
        coordinator?.showAlert(message: "Terms of Service")
    }
    
    private func openPrivacyPolicy() {
        // TODO: Open Privacy Policy
        coordinator?.showAlert(message: "Privacy Policy")
    }
}

// MARK: - Supporting Views

/// Row displaying a password requirement with check/cross indicator.
struct PasswordRequirementRow: View {
    let text: String
    let isMet: Bool
    
    var body: some View {
        HStack(spacing: Spacing.scale2) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .foregroundColor(
                    isMet
                        ? Color(hex: Colors.Semantic.success)
                        : Color(hex: Colors.Text.tertiary)
                )
                .font(.system(size: 14))
            
            Text(text)
                .font(.system(size: Typography.FontSize.xs))
                .foregroundColor(
                    isMet
                        ? Color(hex: Colors.Text.secondary)
                        : Color(hex: Colors.Text.tertiary)
                )
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(text): \(isMet ? "met" : "not met")")
    }
}

/// Custom checkbox toggle style.
struct CheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .top, spacing: Spacing.scale2) {
            Button(action: { configuration.isOn.toggle() }) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .foregroundColor(
                        configuration.isOn
                            ? Color(hex: Colors.Primary.main)
                            : Color(hex: Colors.Text.tertiary)
                    )
                    .font(.system(size: 20))
            }
            
            configuration.label
        }
    }
}

// MARK: - Preview

#Preview("Signup View") {
    NavigationStack {
        SignupView(
            viewModel: AuthViewModel.preview,
            coordinator: AuthCoordinator()
        )
    }
}

#Preview("Signup View - Dark") {
    NavigationStack {
        SignupView(
            viewModel: AuthViewModel.preview,
            coordinator: AuthCoordinator()
        )
    }
    .preferredColorScheme(.dark)
}
