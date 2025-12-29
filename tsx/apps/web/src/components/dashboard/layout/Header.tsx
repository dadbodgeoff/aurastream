'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BellIcon, UserIcon, ChevronDownIcon } from '../icons';
import { useState, useRef, useEffect } from 'react';

export interface HeaderProps {
  user?: {
    displayName?: string;
    email: string;
    avatarUrl?: string;
    subscriptionTier?: string;
  };
  onLogout?: () => void;
  className?: string;
}

export function Header({ user, onLogout, className }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={cn(
      'h-16 border-b border-border-subtle bg-background-surface/80 backdrop-blur-sm flex items-center justify-between px-6',
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Breadcrumb or search could go here */}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 text-text-muted hover:text-text-secondary hover:bg-background-elevated rounded-lg transition-colors">
          <BellIcon size="md" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-interactive-600 rounded-full" />
        </button>

        {/* Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-background-elevated rounded-lg transition-colors"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-interactive-600/10 flex items-center justify-center text-interactive-600">
                <UserIcon size="sm" />
              </div>
            )}
            <ChevronDownIcon size="sm" className={cn('text-text-muted transition-transform', isProfileOpen && 'rotate-180')} />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-background-surface border border-border-subtle rounded-xl shadow-lg z-50 py-2">
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="font-medium text-text-primary truncate">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-sm text-text-muted truncate">{user?.email}</p>
                {user?.subscriptionTier && (
                  <span className={cn(
                    'inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full',
                    user.subscriptionTier === 'studio'
                      ? 'bg-interactive-600/10 text-interactive-600'
                      : 'bg-background-elevated text-text-muted'
                  )}>
                    {user.subscriptionTier === 'studio' ? 'Studio' : 'Free'} Plan
                  </span>
                )}
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Settings
                </Link>
                <Link
                  href="/dashboard/settings?tab=billing"
                  className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Billing
                </Link>
              </div>
              <div className="border-t border-border-subtle pt-1">
                <button
                  onClick={() => { setIsProfileOpen(false); onLogout?.(); }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
