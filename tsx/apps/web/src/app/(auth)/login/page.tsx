'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@aurastream/shared';

// OAuth provider icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TwitchIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" fill="#9146FF"/>
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/>
  </svg>
);

// Eye icons for password visibility toggle
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error, clearError } = useAuth();
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  
  // Check for registration success message
  const registered = searchParams.get('registered') === 'true';
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  
  // Auto-focus email field on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);
  
  // Clear errors when inputs change
  useEffect(() => {
    if (error) clearError();
    setValidationErrors({});
  }, [email, password, error, clearError]);
  
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    clearError();
    try {
      await login(email, password, rememberMe);
      router.push(decodeURIComponent(returnUrl));
    } catch (err) {
      // Error is handled by the store
    }
  };
  
  const handleOAuthLogin = (provider: 'google' | 'twitch' | 'discord') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    window.location.href = `${baseUrl}/api/v1/oauth/${provider}/authorize?returnUrl=${encodeURIComponent(returnUrl)}`;
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome back</h2>
      <p className="text-text-secondary mb-6">Sign in to your account to continue</p>
      
      {registered && (
        <div className="mb-6 p-4 bg-success-dark/20 border border-success-main/30 rounded-lg text-success-light text-sm" role="alert">
          Account created successfully! Please sign in.
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-error-dark/20 border border-error-main/30 rounded-lg text-error-light text-sm" role="alert" aria-live="polite">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">Email address</label>
          <input
            ref={emailInputRef}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-3 min-h-[44px] bg-background-elevated border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:border-transparent transition-all ${validationErrors.email ? 'border-error-main' : 'border-border-default'}`}
            placeholder="you@example.com"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? 'email-error' : undefined}
          />
          {validationErrors.email && <p id="email-error" className="mt-1.5 text-sm text-error-light" role="alert">{validationErrors.email}</p>}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 pr-14 min-h-[44px] bg-background-elevated border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:border-transparent transition-all ${validationErrors.password ? 'border-error-main' : 'border-border-default'}`}
              placeholder="Enter your password"
              aria-invalid={!!validationErrors.password}
              aria-describedby={validationErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-tertiary hover:text-text-secondary active:text-text-primary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {validationErrors.password && <p id="password-error" className="mt-1.5 text-sm text-error-light" role="alert">{validationErrors.password}</p>}
        </div>
        
        <div className="flex items-center justify-between">
          <label className="flex items-center cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 rounded border-border-default bg-background-elevated text-interactive-600 focus:ring-interactive-600 focus:ring-offset-0 cursor-pointer"
            />
            <span className="ml-2 text-sm text-text-secondary">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-interactive-600 hover:text-interactive-500 active:text-interactive-700 transition-colors py-2">Forgot password?</Link>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 min-h-[44px] bg-interactive-600 hover:bg-interactive-500 active:bg-interactive-700 disabled:bg-interactive-600/50 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:ring-offset-2 focus:ring-offset-background-surface disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : 'Sign in'}
        </button>
      </form>
      
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-default" /></div>
        <div className="relative flex justify-center text-sm"><span className="px-4 bg-background-surface text-text-tertiary">Or continue with</span></div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <button type="button" onClick={() => handleOAuthLogin('google')} className="flex items-center justify-center py-2.5 px-4 min-h-[44px] bg-background-elevated border border-border-default rounded-lg hover:bg-background-card hover:border-border-focus active:bg-background-surface transition-all focus:outline-none focus:ring-2 focus:ring-interactive-600" aria-label="Sign in with Google"><GoogleIcon /></button>
        <button type="button" onClick={() => handleOAuthLogin('twitch')} className="flex items-center justify-center py-2.5 px-4 min-h-[44px] bg-background-elevated border border-border-default rounded-lg hover:bg-background-card hover:border-border-focus active:bg-background-surface transition-all focus:outline-none focus:ring-2 focus:ring-interactive-600" aria-label="Sign in with Twitch"><TwitchIcon /></button>
        <button type="button" onClick={() => handleOAuthLogin('discord')} className="flex items-center justify-center py-2.5 px-4 min-h-[44px] bg-background-elevated border border-border-default rounded-lg hover:bg-background-card hover:border-border-focus active:bg-background-surface transition-all focus:outline-none focus:ring-2 focus:ring-interactive-600" aria-label="Sign in with Discord"><DiscordIcon /></button>
      </div>
      
      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-interactive-600 hover:text-interactive-500 active:text-interactive-700 font-medium transition-colors">Create one</Link>
      </p>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-interactive-600" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
