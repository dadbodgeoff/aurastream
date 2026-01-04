'use client';

/**
 * Unified Navigation Tabs
 * 
 * Single navigation system for the entire app with:
 * - Primary tabs always visible
 * - Secondary tabs in dropdown on smaller screens
 * - All features from old dashboard + intel combined
 */

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Image, 
  Globe,
  Sparkles,
  FlaskConical,
  FolderOpen,
  UserCircle,
  Palette,
  Library,
  ChevronDown,
  MoreHorizontal,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntelTab = 
  | 'home' 
  | 'brief' 
  | 'thumbnails' 
  | 'observatory' 
  | 'create' 
  | 'aura-lab' 
  | 'assets' 
  | 'media-library' 
  | 'logos' 
  | 'brand-kits'
  | 'settings'
  | 'community';

interface TabItem {
  id: IntelTab;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  href: string;
  external?: boolean;
}

// Primary tabs - Core workflow, always visible
const PRIMARY_TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, href: '/intel' },
  { id: 'create', label: 'Create', icon: Sparkles, href: '/intel/create' },
  { id: 'assets', label: 'Assets', icon: FolderOpen, href: '/intel/assets' },
  { id: 'brand-kits', label: 'Brand Kits', shortLabel: 'Brands', icon: Palette, href: '/intel/brand-kits' },
];

// Secondary tabs - Tools & features
const SECONDARY_TABS: TabItem[] = [
  { id: 'thumbnails', label: 'Thumbnails', icon: Image, href: '/intel/thumbnails' },
  { id: 'observatory', label: 'Observatory', icon: Globe, href: '/intel/observatory' },
  { id: 'aura-lab', label: 'Aura Lab', icon: FlaskConical, href: '/intel/aura-lab' },
  { id: 'media-library', label: 'Media Library', icon: Library, href: '/intel/media-library' },
  { id: 'logos', label: 'Logos & PFP', icon: UserCircle, href: '/intel/logos' },
];

// Utility tabs - Settings, community (shown in header instead)
const UTILITY_TABS: TabItem[] = [
  { id: 'community', label: 'Community', icon: Users, href: '/community', external: true },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/intel/settings' },
];

const ALL_TABS = [...PRIMARY_TABS, ...SECONDARY_TABS, ...UTILITY_TABS];

interface IntelTabsProps {
  activeTab?: IntelTab;
  onTabChange?: (tab: IntelTab) => void;
}

export function IntelTabs({ activeTab, onTabChange }: IntelTabsProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active tab from pathname
  const getActiveTab = (): IntelTab => {
    if (activeTab) return activeTab;
    
    // Exact match for home
    if (pathname === '/intel') return 'home';
    
    // Check all tabs for prefix match
    const match = ALL_TABS.find(tab => 
      tab.href !== '/intel' && pathname.startsWith(tab.href)
    );
    return match?.id || 'home';
  };

  const currentTab = getActiveTab();
  const isSecondaryActive = SECONDARY_TABS.some(t => t.id === currentTab);
  const activeSecondaryTab = SECONDARY_TABS.find(t => t.id === currentTab);

  return (
    <nav className="flex items-center justify-center h-11">
      {/* Primary Tabs */}
      <div className="flex items-center gap-0.5">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all',
                isActive
                  ? 'text-interactive-400'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.shortLabel || tab.label}</span>
              
              {/* Active indicator */}
              {isActive && (
                <span className="absolute -bottom-[9px] left-3 right-3 h-0.5 bg-interactive-500 rounded-full" />
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <span className="w-px h-5 bg-white/[0.08] mx-1.5 hidden lg:block" />

        {/* Secondary tabs - visible on large screens */}
        <div className="hidden lg:flex items-center gap-0.5">
          {SECONDARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-all',
                  isActive
                    ? 'text-interactive-400'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                
                {isActive && (
                  <span className="absolute -bottom-[9px] left-2.5 right-2.5 h-0.5 bg-interactive-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* More dropdown - visible on smaller screens */}
        <div ref={moreRef} className="relative lg:hidden">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all',
              isSecondaryActive
                ? 'text-interactive-400'
                : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
            )}
          >
            {isSecondaryActive && activeSecondaryTab ? (
              <>
                <activeSecondaryTab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{activeSecondaryTab.label}</span>
              </>
            ) : (
              <>
                <MoreHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">More</span>
              </>
            )}
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform",
              moreOpen && "rotate-180"
            )} />
            
            {isSecondaryActive && (
              <span className="absolute -bottom-[9px] left-3 right-3 h-0.5 bg-interactive-500 rounded-full" />
            )}
          </button>

          {/* Dropdown */}
          {moreOpen && (
            <div className="absolute top-full mt-2 left-0 w-52 py-1.5 bg-background-elevated border border-white/[0.08] rounded-xl shadow-xl z-50">
              <div className="px-2 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
                Tools
              </div>
              {SECONDARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    onClick={() => {
                      onTabChange?.(tab.id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'text-interactive-400 bg-interactive-600/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </nav>
  );
}

// Export for use elsewhere
export { PRIMARY_TABS, SECONDARY_TABS, UTILITY_TABS, ALL_TABS };
