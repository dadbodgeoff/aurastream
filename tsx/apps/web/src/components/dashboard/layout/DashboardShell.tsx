'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
import { MobileDrawer, MobileHeader } from '@/components/mobile';
import { Logo } from '@/components/brand';
import { LogoutIcon } from '../icons';
import { 
  Sidebar, 
  SidebarProps, 
  mainNavItems, 
  toolsNavItems, 
  settingsNavItems,
  NavLink,
  NavItem,
} from './Sidebar';

export interface DashboardShellProps extends SidebarProps {
  children: React.ReactNode;
  className?: string;
  pageTitle?: string;
}

/**
 * MobileSidebarContent - Navigation content for mobile drawer
 * Reuses the same nav items as desktop sidebar
 */
function MobileSidebarContent({ 
  user, 
  isAdmin = false, 
  onLogout,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border-subtle">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
          <Logo size="sm" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Main */}
        <div>
          <p className="px-3 mb-2 text-xs font-medium text-text-muted uppercase tracking-wider">Main</p>
          <div className="space-y-1" onClick={handleNavClick}>
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Tools */}
        <div>
          <p className="px-3 mb-2 text-xs font-medium text-text-muted uppercase tracking-wider">Tools</p>
          <div className="space-y-1" onClick={handleNavClick}>
            {toolsNavItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Settings */}
        <div>
          <p className="px-3 mb-2 text-xs font-medium text-text-muted uppercase tracking-wider">Account</p>
          <div className="space-y-1" onClick={handleNavClick}>
            {settingsNavItems
              .filter((item: NavItem) => !item.adminOnly || isAdmin)
              .map((item) => (
                <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
          </div>
        </div>
      </nav>

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
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
            title="Sign out"
          >
            <LogoutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  user,
  isAdmin,
  onLogout,
  className,
  pageTitle,
}: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className={cn('flex h-screen bg-background-default', className)}>
      {/* Desktop Sidebar - hidden on mobile via Sidebar's own classes */}
      <Sidebar user={user} isAdmin={isAdmin} onLogout={onLogout} />
      
      {/* Mobile Drawer - only rendered on mobile */}
      {isMobile && (
        <MobileDrawer 
          isOpen={isMobileMenuOpen} 
          onClose={closeMobileMenu}
        >
          <MobileSidebarContent 
            user={user} 
            isAdmin={isAdmin} 
            onLogout={onLogout}
            onNavigate={closeMobileMenu}
          />
        </MobileDrawer>
      )}
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header - only visible on mobile */}
        <MobileHeader 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
          title={pageTitle}
        />
        
        {/* Content with responsive padding */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
