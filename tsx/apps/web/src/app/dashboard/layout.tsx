'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@aurastream/shared';
import { DashboardShell, LoadingState } from '@/components/dashboard';
import { CelebrationOverlay } from '@/components/celebrations/CelebrationOverlay';

// Admin email whitelist
const ADMIN_EMAILS = ['dadbodgeoff@gmail.com'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-default flex items-center justify-center">
        <LoadingState message="Loading..." size="lg" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false;

  return (
    <>
      <DashboardShell
        user={user ? {
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl ?? undefined,
          subscriptionTier: user.subscriptionTier,
        } : undefined}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      >
        {children}
      </DashboardShell>
      <CelebrationOverlay />
    </>
  );
}
