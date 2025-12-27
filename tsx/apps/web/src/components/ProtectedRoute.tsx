'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@aurastream/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional fallback component to show while loading
   */
  fallback?: React.ReactNode;
  /**
   * Optional redirect path (defaults to /login)
   */
  redirectTo?: string;
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
          {/* Spinning border */}
          <div className="w-12 h-12 rounded-full border-4 border-border-default border-t-primary-500 animate-spin" />
        </div>
        <p className="text-text-secondary text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute component
 * 
 * Wraps protected pages to ensure user is authenticated.
 * Redirects to login if not authenticated, preserving the intended destination.
 * 
 * @example
 * ```tsx
 * // In a layout or page
 * export default function DashboardLayout({ children }) {
 *   return (
 *     <ProtectedRoute>
 *       {children}
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 */
export function ProtectedRoute({ 
  children, 
  fallback,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  
  // Try to refresh user on mount
  useEffect(() => {
    const attemptRefresh = async () => {
      try {
        await refreshUser();
      } catch (error) {
        // Refresh failed, user will be redirected
      } finally {
        setHasAttemptedRefresh(true);
      }
    };
    
    if (!isAuthenticated && !hasAttemptedRefresh) {
      attemptRefresh();
    } else {
      setHasAttemptedRefresh(true);
    }
  }, [isAuthenticated, hasAttemptedRefresh, refreshUser]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (hasAttemptedRefresh && !isLoading && !isAuthenticated) {
      // Store intended destination for redirect after login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, hasAttemptedRefresh, pathname, router, redirectTo]);
  
  // Show loading state while checking authentication
  if (isLoading || !hasAttemptedRefresh) {
    return fallback ? <>{fallback}</> : <LoadingSpinner />;
  }
  
  // Don't render children if not authenticated (will redirect)
  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : <LoadingSpinner />;
  }
  
  return <>{children}</>;
}

/**
 * Higher-order component version of ProtectedRoute
 * 
 * @example
 * ```tsx
 * const ProtectedDashboard = withProtectedRoute(DashboardPage);
 * ```
 */
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: { redirectTo?: string }
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithProtectedRoute = (props: P) => {
    return (
      <ProtectedRoute redirectTo={options?.redirectTo}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
  
  WithProtectedRoute.displayName = `withProtectedRoute(${displayName})`;
  
  return WithProtectedRoute;
}

/**
 * Hook for checking if user is authenticated
 * Returns loading state and authentication status
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, isLoading } = useProtectedRoute();
 *   
 *   if (isLoading) return <Loading />;
 *   if (!isAuthenticated) return null; // Will redirect
 *   
 *   return <div>Protected content</div>;
 * }
 * ```
 */
export function useProtectedRoute(redirectTo: string = '/login') {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  
  useEffect(() => {
    const attemptRefresh = async () => {
      try {
        await refreshUser();
      } catch (error) {
        // Refresh failed
      } finally {
        setHasAttemptedRefresh(true);
      }
    };
    
    if (!isAuthenticated && !hasAttemptedRefresh) {
      attemptRefresh();
    } else {
      setHasAttemptedRefresh(true);
    }
  }, [isAuthenticated, hasAttemptedRefresh, refreshUser]);
  
  useEffect(() => {
    if (hasAttemptedRefresh && !isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, hasAttemptedRefresh, pathname, router, redirectTo]);
  
  return {
    isAuthenticated,
    isLoading: isLoading || !hasAttemptedRefresh,
  };
}

export default ProtectedRoute;
