'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Image, 
  LayoutGrid, 
  Globe,
  Sparkles,
  FlaskConical,
  FolderOpen,
  UserCircle,
  Palette,
  Library,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type IntelTab = 'brief' | 'thumbnails' | 'panels' | 'observatory' | 'create' | 'aura-lab' | 'assets' | 'media-library' | 'logos' | 'brand-kits';

interface IntelTabsProps {
  activeTab?: IntelTab;
  onTabChange?: (tab: IntelTab) => void;
}

const TABS: { id: IntelTab; label: string; icon: React.ElementType; href: string }[] = [
  { id: 'brief', label: 'Daily Brief', icon: FileText, href: '/intel' },
  { id: 'thumbnails', label: 'Thumbnails', icon: Image, href: '/intel/thumbnails' },
  { id: 'panels', label: 'My Panels', icon: LayoutGrid, href: '/intel/panels' },
  { id: 'observatory', label: 'Observatory', icon: Globe, href: '/intel/observatory' },
  { id: 'create', label: 'Create', icon: Sparkles, href: '/intel/create' },
  { id: 'aura-lab', label: 'Aura Lab', icon: FlaskConical, href: '/intel/aura-lab' },
  { id: 'assets', label: 'Assets', icon: FolderOpen, href: '/intel/assets' },
  { id: 'media-library', label: 'Media Library', icon: Library, href: '/intel/media-library' },
  { id: 'brand-kits', label: 'Brand Kits', icon: Palette, href: '/intel/brand-kits' },
  { id: 'logos', label: 'Logos & PFP', icon: UserCircle, href: '/intel/logos' },
];

export function IntelTabs({ activeTab, onTabChange }: IntelTabsProps) {
  const pathname = usePathname();
  
  // Determine active tab from pathname
  const getActiveTab = (): IntelTab => {
    if (activeTab) return activeTab;
    if (pathname === '/intel' || pathname === '/intel/brief') return 'brief';
    if (pathname.startsWith('/intel/thumbnails')) return 'thumbnails';
    if (pathname.startsWith('/intel/panels')) return 'panels';
    if (pathname.startsWith('/intel/observatory')) return 'observatory';
    if (pathname.startsWith('/intel/create')) return 'create';
    if (pathname.startsWith('/intel/aura-lab')) return 'aura-lab';
    if (pathname.startsWith('/intel/assets')) return 'assets';
    if (pathname.startsWith('/intel/media-library')) return 'media-library';
    if (pathname.startsWith('/intel/brand-kits')) return 'brand-kits';
    if (pathname.startsWith('/intel/logos')) return 'logos';
    return 'brief';
  };

  const currentTab = getActiveTab();

  return (
    <div className="flex items-center justify-center gap-0.5 py-2.5 overflow-x-auto scrollbar-none">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        
        return (
          <Link
            key={tab.id}
            href={tab.href}
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0',
              'hover:bg-white/5',
              isActive
                ? 'bg-interactive-600 text-white shadow-lg shadow-interactive-600/20'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Icon className={cn(
              'w-4 h-4 transition-colors',
              isActive ? 'text-white' : 'text-text-muted'
            )} />
            <span className="hidden sm:inline">{tab.label}</span>
            
            {/* Active indicator dot for mobile */}
            {isActive && (
              <span className="sm:hidden absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-interactive-400" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
