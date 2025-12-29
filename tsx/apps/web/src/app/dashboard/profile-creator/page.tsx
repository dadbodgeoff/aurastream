'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Image, AlertCircle, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { analytics } from '@aurastream/shared';
import { useProfileCreatorAccess, useProfileCreatorGallery, profileCreatorKeys } from '@aurastream/api-client';
import { PageHeader } from '@/components/navigation';
import { ProfileCreatorCore } from '@/components/profile-creator/ProfileCreatorCore';
import { ProfileGallery } from '@/components/profile-creator/ProfileGallery';

type TabType = 'create' | 'gallery';

export default function ProfileCreatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const queryClient = useQueryClient();

  const { data: access, isLoading: isLoadingAccess } = useProfileCreatorAccess();
  const { data: gallery, isLoading: isLoadingGallery } = useProfileCreatorGallery();

  useEffect(() => {
    analytics.page('profile_creator', { tab: activeTab });
  }, [activeTab]);

  const handleCreationComplete = () => {
    queryClient.invalidateQueries({ queryKey: profileCreatorKeys.gallery() });
    queryClient.invalidateQueries({ queryKey: profileCreatorKeys.access() });
    setActiveTab('gallery');
  };

  return (
    <div className="min-h-screen bg-background-base">
      {/* Compact Header */}
      <div className="border-b border-border-subtle bg-background-surface/50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-interactive-600 to-accent-600 flex items-center justify-center shadow-md shadow-interactive-600/25">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-text-primary">Profile Creator</h1>
                <p className="text-xs text-text-secondary">AI-powered avatars & logos</p>
              </div>
            </div>

            {/* Usage Badge */}
            {access && (
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 bg-background-elevated rounded-lg border border-border-subtle">
                  <span className="text-xs text-text-secondary">
                    <span className="text-interactive-400 font-semibold">{access.remaining}</span>
                    <span className="mx-1">/</span>
                    <span>{access.limit}</span>
                    <span className="ml-1 text-text-tertiary">left</span>
                  </span>
                </div>
                {!access.canUse && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-warning-muted/10 border border-warning-muted/20 rounded-lg">
                    <AlertCircle className="w-3 h-3 text-warning-muted" />
                    <span className="text-[10px] text-warning-muted font-medium">Limit reached</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex gap-1 p-0.5 bg-background-elevated rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('create')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${activeTab === 'create'
                ? 'bg-interactive-600/20 text-interactive-400'
                : 'text-text-tertiary hover:text-text-secondary'
              }
            `}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Create
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${activeTab === 'gallery'
                ? 'bg-interactive-600/20 text-interactive-400'
                : 'text-text-tertiary hover:text-text-secondary'
              }
            `}
          >
            <Image className="w-3.5 h-3.5" />
            Gallery
            {gallery?.total ? (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-background-surface rounded-full text-text-tertiary">
                {gallery.total}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ProfileCreatorCore
                canCreate={access?.canUse ?? true}
                onComplete={handleCreationComplete}
              />
            </motion.div>
          ) : (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
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
    </div>
  );
}
