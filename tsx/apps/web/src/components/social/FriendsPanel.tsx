'use client';

import { useState, useEffect } from 'react';
import { useFriendsList } from '@aurastream/api-client/src/hooks/useFriends';
import { FriendsList } from './FriendsList';
import { FriendRequests } from './FriendRequests';
import { UserSearch } from './UserSearch';

interface FriendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (userId: string, displayName: string | null, avatarUrl: string | null) => void;
}

type Tab = 'friends' | 'requests' | 'search';

export function FriendsPanel({ isOpen, onClose, onOpenChat }: FriendsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const { data, isLoading, refetch } = useFriendsList();

  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const friends = data?.friends ?? [];
  const pendingRequests = data?.pendingRequests ?? [];
  const sentRequests = data?.sentRequests ?? [];
  const onlineCount = friends.filter(f => f.isOnline).length;

  const tabs = [
    { id: 'friends' as Tab, label: 'Friends', count: friends.length },
    { id: 'requests' as Tab, label: 'Requests', count: pendingRequests.length, hasNotification: pendingRequests.length > 0 },
    { id: 'search' as Tab, label: 'Add' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-background-surface border-l border-border-subtle transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Friends</h2>
              <p className="text-[10px] text-text-tertiary">{onlineCount} online</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-tertiary hover:text-text-primary rounded-md hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-0.5 bg-white/[0.02] rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-interactive-600/20 text-interactive-300'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1 py-0.5 text-[9px] bg-white/10 rounded-full">
                    {tab.count}
                  </span>
                )}
                {tab.hasNotification && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-5 h-5 border-2 border-interactive-600/30 border-t-interactive-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <FriendsList friends={friends} onOpenChat={onOpenChat} />
              )}
              {activeTab === 'requests' && (
                <FriendRequests pendingRequests={pendingRequests} sentRequests={sentRequests} />
              )}
              {activeTab === 'search' && <UserSearch />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
