'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, Image, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { analytics } from '@aurastream/shared';
import { useProfileCreatorAccess, useProfileCreatorGallery, profileCreatorKeys } from '@aurastream/api-client';
import { PageHeader } from '@/components/navigation';
import { ProfileCreatorCore } from '@/components/profile-creator/ProfileCreatorCore';
import { ProfileGallery } from '@/components/profile-creator/ProfileGallery';
import { UsageIndicator } from '@/components/usage/UsageIndicator';

type TabType = 'create' | 'gallery';

/**
 * Profile Creator Page - Create profile pictures and logos with AI assistance.
 * 
 * Features:
 * - AI-guided creation flow (reuses Coach infrastructure)
 * - Style presets for quick starts
 * - Gallery of created profile pics/logos
 * - Usage tracking (1 free / 5 pro / 10 studio per month)
 */
export default function ProfileCreatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const queryClient = useQueryClient();

  // Fetch access/quota info
  const { data: access, isLoading: isLoadingAccess } = useProfileCreatorAccess();
  const { data: gallery, isLoading: isLoadingGallery } = useProfileCreatorGallery();

  // Track page view
  useEffect(() => {
    analytics.page('profile_creator', { tab: activeTab });
  }, [activeTab]);

  const handleCreationComplete = () => {
    // Refresh gallery and access after creation
    queryClient.invalidateQueries({ queryKey: profileCreatorKeys.gallery() });
    queryClient.invalidateQueries({ queryKey: profileCreatorKeys.access() });
    // Switch to gallery tab
    setActiveTab('gallery');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Header */}
      <PageHeader
        title="Profile Creator"
        subtitle="Create stunning profile pictures and logos with AI"
        icon={<User className="w-6 h-6 text-pink-400" />}
      />

      {/* Usage Indicator */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Tab Switcher */}
          <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
            <button
              onClick={() => setActiveTab('create')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${activeTab === 'create'
                  ? 'bg-pink-500/20 text-pink-400 shadow-lg shadow-pink-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${activeTab === 'gallery'
                  ? 'bg-pink-500/20 text-pink-400 shadow-lg shadow-pink-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              `}
            >
              <Image className="w-4 h-4" />
              Gallery
              {gallery?.total ? (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 rounded-full">
                  {gallery.total}
                </span>
              ) : null}
            </button>
          </div>

          {/* Usage Display */}
          {access && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400">
                <span className="text-pink-400 font-medium">{access.remaining}</span>
                <span className="mx-1">/</span>
                <span>{access.limit}</span>
                <span className="ml-1">remaining</span>
              </div>
              {!access.canUse && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400">Limit reached</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
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
    </div>
  );
}
