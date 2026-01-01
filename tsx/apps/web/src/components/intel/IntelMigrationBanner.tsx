'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntelMigrationBannerProps {
  fromPage: 'clip-radar' | 'trends' | 'playbook' | 'thumbnail-intel';
  className?: string;
}

const PAGE_NAMES: Record<string, string> = {
  'clip-radar': 'Clip Radar',
  'trends': 'Trends',
  'playbook': 'Playbook',
  'thumbnail-intel': 'Thumbnail Intel',
};

export function IntelMigrationBanner({ fromPage, className }: IntelMigrationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  
  // Check localStorage for permanent dismissal
  const storageKey = `intel-banner-dismissed-${fromPage}`;
  
  if (dismissed) return null;
  
  // Check if already dismissed in this session
  if (typeof window !== 'undefined') {
    const wasDismissed = sessionStorage.getItem(storageKey);
    if (wasDismissed) return null;
  }
  
  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, 'true');
    }
  };
  
  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'relative overflow-hidden rounded-xl mb-6',
            'bg-gradient-to-r from-interactive-600/20 via-interactive-500/10 to-accent-500/10',
            'border border-interactive-500/30',
            className
          )}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>
          
          <div className="relative flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 p-2 rounded-lg bg-interactive-500/20">
                <Sparkles className="w-5 h-5 text-interactive-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {PAGE_NAMES[fromPage]} is now part of Creator Intel
                </p>
                <p className="text-xs text-text-secondary mt-0.5 hidden sm:block">
                  All your intelligence tools in one unified dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/dashboard/intel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <span className="hidden sm:inline">Try Creator Intel</span>
                <span className="sm:hidden">Try it</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              
              <button
                onClick={handleDismiss}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
