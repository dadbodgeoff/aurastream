'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useConfirmPasswordReset } from '@aurastream/api-client';

// Icons
const CheckCircleIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationCircleIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

// Password strength calculation
function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  if (score <= 2) return { score, label: 'Weak', color: 'bg-error-main' };
  if (score <= 4) return { score, label: 'Fair', color: 'bg-warning-main' };
  return { score, label: 'Strong', color: 'bg-success-main' };
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { mutate: confirmReset, isPending, error } = useConfirmPasswordReset();
  
  const passwordStrength = calculatePasswordStrength(password);
  
  // Clear validation errors when inputs change
  useEffect(() => {
    setValidationErrors({});
  }, [password, confirmPassword]);
  
  // No token provided
  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-error-dark/20 rounded-full flex items-center justify-center mb-6 text-error-light">
          <ExclamationCircleIcon />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Invalid reset link</h2>
        <p className="text-text-secondary mb-6">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full py-3 px-4 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg text-center transition-colors"
        >
          Request new link
        </Link>
      </div>
    );
  }
  
  // Success state
  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-success-dark/20 rounded-full flex items-center justify-center mb-6 text-success-light">
          <CheckCircleIcon />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Password reset successful</h2>
        <p className="text-text-secondary mb-6">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="block w-full py-3 px-4 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg text-center transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }
  
  const validateForm = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    confirmReset(
      { token, newPassword: password },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (err) => {
          console.log('Password reset failed:', err.message);
        },
      }
    );
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Reset your password</h2>
      <p className="text-text-secondary mb-6">
        Enter your new password below.
      </p>
      
      {error && (
        <div className="mb-6 p-4 bg-error-dark/20 border border-error-main/30 rounded-lg text-error-light text-sm" role="alert">
          {error.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 bg-background-elevated border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:border-transparent transition-all ${
                validationErrors.password ? 'border-error-main' : 'border-border-default'
              }`}
              placeholder="Enter new password"
              aria-invalid={!!validationErrors.password}
              aria-describedby={validationErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {validationErrors.password && (
            <p id="password-error" className="mt-1.5 text-sm text-error-light" role="alert">
              {validationErrors.password}
            </p>
          )}
          
          {/* Password strength indicator */}
          {password && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1.5 bg-background-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength.label === 'Weak' ? 'text-error-light' :
                  passwordStrength.label === 'Fair' ? 'text-warning-light' :
                  'text-success-light'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">
                Use 8+ characters with a mix of letters, numbers & symbols
              </p>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1.5">
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-12 bg-background-elevated border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:border-transparent transition-all ${
                validationErrors.confirmPassword ? 'border-error-main' : 'border-border-default'
              }`}
              placeholder="Confirm new password"
              aria-invalid={!!validationErrors.confirmPassword}
              aria-describedby={validationErrors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {validationErrors.confirmPassword && (
            <p id="confirm-password-error" className="mt-1.5 text-sm text-error-light" role="alert">
              {validationErrors.confirmPassword}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 bg-interactive-600 hover:bg-interactive-500 disabled:bg-interactive-600/50 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:ring-offset-2 focus:ring-offset-background-surface disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Resetting...
            </span>
          ) : (
            'Reset password'
          )}
        </button>
      </form>
      
      <p className="mt-6 text-center text-sm text-text-secondary">
        Remember your password?{' '}
        <Link href="/login" className="text-interactive-600 hover:text-interactive-500 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-interactive-600" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
