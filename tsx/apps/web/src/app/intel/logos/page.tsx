'use client';

/**
 * Intel Logos & PFP Page
 * 
 * Profile Creator within the Intel layout - no sidebar, embedded directly.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Image, AlertCircle, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useProfileCreatorAccess, useProfileCreatorGallery, profileCreatorKeys } from '@aurastream/api-client';
import { ProfileCreatorCore } from '@/components/profile-creator/ProfileCreatorCore';
import { ProfileGallery } from '@/components/profile-creator/ProfileGallery';
import { cn } from '@/lib/utils';

type TabType = 'create' | 'gallery';

export default function IntelLogosPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const queryClient = useQueryClient();

  const { data: access } = useProfileCreatorAccess();
  const { data: gallery, isLoading: isLoadingGallery } = useProfileCreatorGallery();

  const handleCreationComplete = () => {
    queryClient.invalidateQueries({ queryKey: profileCreatorKeys.gallery() });
    queryClient.invalidateQueries({ queryKey: profileCreatorKeys.access() });
    setActiveTab('gallery');
  };

  return (
    <div className="space-y-6">
      {/* Header - Refined */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/25 ring-1 ring-white/10">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Logos & PFP</h1>
            <p className="text-sm text-text-secondary mt-0.5">AI-powered avatars & logos</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Usage Badge */}
          {access && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm text-text-secondary">
                  <span className="text-violet-400 font-bold">{access.remaining}</span>
                  <span className="mx-1 text-text-tertiary">/</span>
                  <span className="text-text-tertiary">{access.limit}</span>
                  <span className="ml-2 text-text-tertiary text-xs">remaining</span>
                </span>
              </div>
              {!access.canUse && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Limit reached</span>
                </div>
              )}
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('create')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === 'create'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              <Sparkles className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === 'gallery'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              )}
            >
              <Image className="w-4 h-4" />
              Gallery
              {gallery?.total ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-text-secondary">
                  {gallery.total}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'create' ? (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ProfileCreatorCore
              canCreate={access?.canUse ?? true}
              onComplete={handleCreationComplete}
            />
          </motion.div>
        ) : (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ProfileGallery
              items={gallery?.items ?? []}
              isLoading={isLoadingGallery}
              onCreateNew={() => setActiveTab('create')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
