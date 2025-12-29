'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand';
import { UsageDisplay } from '@/components/usage';
import {
  DashboardIcon,
  CreateIcon,
  BrandIcon,
  LibraryIcon,
  CoachIcon,
  SettingsIcon,
  AnalyticsIcon,
  LogoutIcon,
  QuickCreateIcon,
  CommunityIcon,
  VibeIcon,
  AuraLabIcon,
  PromoIcon,
} from '../icons';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  dataTour?: string;
}

export interface SidebarProps {
  user?: {
    displayName?: string;
    email: string;
    avatarUrl?: string;
    subscriptionTier?: string;
  };
  isAdmin?: boolean;
  onLogout?: () => void;
  className?: string;
}

const mainNavItems: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: DashboardIcon },
  { name: 'Quick Create', href: '/dashboard/quick-create', icon: QuickCreateIcon, badge: 'New', dataTour: 'quick-create' },
  { name: 'Create', href: '/dashboard/create', icon: CreateIcon },
  { name: 'Brand Studio', href: '/dashboard/brand-kits', icon: BrandIcon, dataTour: 'brand-kits' },
  { name: 'Asset Library', href: '/dashboard/assets', icon: LibraryIcon, dataTour: 'assets' },
  { name: 'Community', href: '/community', icon: CommunityIcon, badge: 'New', dataTour: 'community' },
  { name: 'Promo Board', href: '/promo', icon: PromoIcon, badge: '$1', dataTour: 'promo' },
];

const toolsNavItems: NavItem[] = [
  { name: 'Prompt Coach', href: '/dashboard/coach', icon: CoachIcon, badge: 'Pro', dataTour: 'coach' },
  { name: 'Vibe Branding', href: '/dashboard/brand-kits?vibe=true', icon: VibeIcon, badge: 'New', dataTour: 'vibe-branding' },
  { name: 'Aura Lab', href: '/dashboard/aura-lab', icon: AuraLabIcon, badge: 'New', dataTour: 'aura-lab' },
];

const settingsNavItems: NavItem[] = [
  { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: AnalyticsIcon, adminOnly: true },
];

function NavLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={item.dataTour}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 min-h-11 rounded-lg text-sm font-medium',
        'transition-all duration-75',
        'active:bg-background-elevated active:scale-[0.98]',
        isActive
          ? 'bg-interactive-600/10 text-interactive-600'
          : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{item.name}</span>
      {item.badge && (
        <span className="px-1.5 py-0.5 text-xs font-medium bg-interactive-600 text-white rounded">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ user, isAdmin = false, onLogout, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Don't render on mobile at all (backup for CSS hidden)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Check if we're on mobile viewport
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // Don't render on mobile
  if (isMounted && isMobile) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleUpgrade = () => {
    router.push('/dashboard/settings?tab=billing');
  };

  return (
    <aside className={cn(
      'hidden md:flex w-64 h-screen bg-background-surface border-r border-border-subtle flex-col',
      className
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border-subtle">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Main */}
        <div>
          <p className="px-3 mb-2 text-xs font-medium text-text-muted uppercase tracking-wider">Main</p>
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Tools */}
        <div>
          <p className="px-3 mb-2 text-xs font-medium text-text-muted uppercase tracking-wider">Tools</p>
          <div className="space-y-1">
            {toolsNavItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Settings */}
        <div>
          <p className="px-3 mb-2 text-xs font-medium text-text-muted uppercase tracking-wider">Account</p>
          <div className="space-y-1">
            {settingsNavItems
              .filter(item => !item.adminOnly || isAdmin)
              .map((item) => (
                <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
          </div>
        </div>
      </nav>

      {/* Usage Display */}
      <div className="px-3 pb-3">
        <UsageDisplay 
          variant="compact" 
          showUpgrade 
          onUpgrade={handleUpgrade}
        />
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-border-subtle">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background-elevated">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-interactive-600/10 flex items-center justify-center text-interactive-600 font-medium">
              {user?.displayName?.[0] || user?.email?.[0] || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Sign out"
          >
            <LogoutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Export for use in mobile drawer
export { mainNavItems, toolsNavItems, settingsNavItems, NavLink };
