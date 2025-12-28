'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@aurastream/shared';

// Icons for bottom nav
const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const GridIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const PaletteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CommunityIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
}

function NavItem({ href, icon: Icon, label, isActive, onNavigate }: NavItemProps) {
  const handleClick = () => {
    onNavigate?.();
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px]',
        'transition-colors',
        isActive
          ? 'text-interactive-600'
          : 'text-text-muted hover:text-text-secondary active:text-text-primary'
      )}
    >
      <Icon className={cn('w-6 h-6', isActive && 'text-interactive-600')} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

/**
 * MobileBottomNav - Fixed bottom navigation bar for mobile
 * 
 * Shows the 4 most important nav items + a "More" button
 * that opens the full drawer for less common actions.
 * 
 * Includes haptic feedback on navigation taps for enhanced mobile UX.
 */
export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { trigger: triggerHaptic } = useHapticFeedback();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleNavItemClick = () => {
    triggerHaptic('light');
  };

  const handleMoreClick = () => {
    triggerHaptic('light');
    onMoreClick();
  };

  const navItems = [
    { href: '/dashboard', icon: HomeIcon, label: 'Home' },
    { href: '/dashboard/create', icon: SparklesIcon, label: 'Create' },
    { href: '/dashboard/assets', icon: GridIcon, label: 'Assets' },
    { href: '/community', icon: CommunityIcon, label: 'Community' },
  ];

  return (
    <nav 
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-background-surface/95 backdrop-blur-lg',
        'border-t border-border-subtle',
        'safe-area-bottom',
        'md:hidden' // Only show on mobile
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.href)}
            onNavigate={handleNavItemClick}
          />
        ))}
        
        {/* More button to open full drawer */}
        <button
          onClick={handleMoreClick}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px]',
            'text-text-muted hover:text-text-secondary active:text-text-primary',
            'transition-colors'
          )}
          aria-label="More options"
        >
          <MenuIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
