'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
import { MobileNavDropdown } from '@/components/mobile';
import { Logo } from '@/components/brand';
import { 
  Sidebar, 
  SidebarProps, 
} from './Sidebar';

const DASHBOARD_BACKGROUND_URL = 'https://qgyvdadgdomnubngfpun.supabase.co/storage/v1/object/public/streamer-studio-assets/landing/dashboard-background.jpeg';

export interface DashboardShellProps extends SidebarProps {
  children: React.ReactNode;
  className?: string;
  pageTitle?: string;
}

export function DashboardShell({
  children,
  user,
  isAdmin,
  onLogout,
  className,
  pageTitle,
}: DashboardShellProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn('flex h-screen bg-background-default relative', className)}>
      {/* Dashboard background image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url(${DASHBOARD_BACKGROUND_URL})`,
          opacity: 0.35,
        }}
      />
      
      {/* Overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-br from-background-default/70 via-background-default/60 to-background-default/80 pointer-events-none" />
      
      {/* Desktop Sidebar - hidden on mobile via Sidebar's own classes */}
      <Sidebar user={user} isAdmin={isAdmin} onLogout={onLogout} />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Mobile Header with dropdown nav */}
        <header 
          className={cn(
            'sticky top-0 z-30 flex items-center justify-between h-14 px-4',
            'bg-background-surface/95 backdrop-blur-lg border-b border-border-subtle',
            'md:hidden'
          )}
        >
          {/* Logo */}
          <Logo size="sm" />
          
          {/* Navigation Dropdown */}
          <MobileNavDropdown onLogout={onLogout} />
        </header>
        
        {/* Content with responsive padding */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
