'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRequestPasswordReset } from '@aurastream/api-client';

// Icons
const MailIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

export default function ForgotPasswordPage() {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { mutate: requestReset, isPending, error } = useRequestPasswordReset();
  
  // Auto-focus email field on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);
  
  // Clear validation error when email changes
  useEffect(() => {
    setValidationError(null);
  }, [email]);
  
  const validateEmail = (): boolean => {
    if (!email) {
      setValidationError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) return;
    
    requestReset(
      { email },
      {
        onSuccess: () => {
          setIsSubmitted(true);
        },
        onError: () => {
          // Error is displayed via the error state from the mutation
        },
      }
    );
  };
  
  // Success state
  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-success-dark/20 rounded-full flex items-center justify-center mb-6 text-success-light">
          <MailIcon />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Check your email</h2>
        <p className="text-text-secondary mb-6">
          We&apos;ve sent a password reset link to <span className="text-text-primary font-medium">{email}</span>
        </p>
        <p className="text-sm text-text-tertiary mb-6">
          Didn&apos;t receive the email? Check your spam folder or try again.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => setIsSubmitted(false)}
            className="w-full py-3 px-4 bg-background-elevated border border-border-default text-text-primary font-medium rounded-lg hover:bg-background-card transition-colors"
          >
            Try another email
          </button>
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg text-center transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeftIcon />
        Back to sign in
      </Link>
      
      <h2 className="text-2xl font-bold text-text-primary mb-2">Forgot password?</h2>
      <p className="text-text-secondary mb-6">
        No worries, we&apos;ll send you reset instructions.
      </p>
      
      {error && (
        <div className="mb-6 p-4 bg-error-dark/20 border border-error-main/30 rounded-lg text-error-light text-sm" role="alert">
          {error.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
            Email address
          </label>
          <input
            ref={emailInputRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-3 bg-background-elevated border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:border-transparent transition-all ${
              validationError ? 'border-error-main' : 'border-border-default'
            }`}
            placeholder="you@example.com"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'email-error' : undefined}
          />
          {validationError && (
            <p id="email-error" className="mt-1.5 text-sm text-error-light" role="alert">
              {validationError}
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
              Sending...
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
