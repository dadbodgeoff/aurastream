'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'emotes',
    title: 'Create Emotes',
    description: 'Generate custom Twitch emotes',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    href: '/dashboard/create?type=twitch_emote',
    gradient: 'from-primary-500/20 to-interactive-500/20',
  },
  {
    id: 'thumbnails',
    title: 'YouTube Thumbnails',
    description: 'Eye-catching video thumbnails',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <polygon points="10,8 16,12 10,16" fill="currentColor" />
      </svg>
    ),
    href: '/dashboard/create?type=youtube_thumbnail',
    gradient: 'from-red-500/20 to-orange-500/20',
  },
  {
    id: 'overlays',
    title: 'Stream Overlays',
    description: 'Professional stream graphics',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect x="7" y="7" width="10" height="10" rx="1" />
        <line x1="3" y1="9" x2="7" y2="9" />
        <line x1="17" y1="9" x2="21" y2="9" />
      </svg>
    ),
    href: '/dashboard/create?type=overlay',
    gradient: 'from-primary-500/20 to-cyan-500/20',
  },
  {
    id: 'vibe',
    title: 'Vibe Branding',
    description: 'Extract brand from any image',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    href: '/dashboard/vibe-branding',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
];

interface QuickActionCardsProps {
  className?: string;
}

export function QuickActionCards({ className }: QuickActionCardsProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4', className)}>
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className={cn(
            'group relative p-4 md:p-6 rounded-xl border border-border-subtle bg-background-surface overflow-hidden',
            'hover:border-interactive-500/50 hover:shadow-lg transition-all duration-200'
          )}
        >
          {/* Gradient Background */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity',
            action.gradient
          )} />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="text-interactive-500 mb-3 group-hover:scale-110 transition-transform">
              {action.icon}
            </div>
            <h3 className="font-semibold text-text-primary text-sm md:text-base mb-1">
              {action.title}
            </h3>
            <p className="text-xs text-text-muted hidden md:block">
              {action.description}
            </p>
          </div>

          {/* Arrow */}
          <div className="absolute top-4 right-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
