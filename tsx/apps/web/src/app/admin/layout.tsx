'use client';

import { useAuth } from '@aurastream/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const ADMIN_EMAIL = 'dadbodgeoff@gmail.com';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-interactive-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-base">
      {/* Admin Nav */}
      <nav className="bg-background-elevated border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
                ← Back to App
              </Link>
              <span className="text-text-muted">|</span>
              <span className="text-sm font-semibold text-interactive-500">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/analytics" 
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Analytics
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
