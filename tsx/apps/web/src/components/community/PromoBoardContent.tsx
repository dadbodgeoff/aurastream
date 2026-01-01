'use client';

/**
 * PromoBoardContent Component
 * 
 * Standalone promo board content extracted from the promo page.
 * Displays messages, leaderboard, and compose functionality.
 * Can be rendered inside a tab or as standalone content.
 * 
 * @module components/community/PromoBoardContent
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Crown, Trophy, Users, TrendingUp, ExternalLink,
  Send, Sparkles, ChevronDown, Clock, Zap
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePromoMessages, usePinnedMessage, useLeaderboard, promoKeys } from '@aurastream/api-client';
import type { PromoMessage, LeaderboardEntry, UserBadges } from '@aurastream/api-client';
import { useMobileDetection } from '@aurastream/shared';
import { PromoComposeModal } from '@/components/promo/PromoComposeModal';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { cn } from '@/lib/utils';

// =============================================================================
// Helper Functions
// =============================================================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface AvatarProps {
  url: string | null;
  name: string;
  size?: 'sm' | 'md';
  isKing?: boolean;
}

function Avatar({ url, name, size = 'md', isKing = false }: AvatarProps) {
  const sizeClasses = { sm: 'w-7 h-7 text-[10px]', md: 'w-8 h-8 text-xs' };
  return (
    <div className="relative">
      {url ? (
        <img 
          src={url} 
          alt={name} 
          className={cn(sizeClasses[size], 'rounded-full object-cover')}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={cn(sizeClasses[size], 'rounded-full bg-gradient-to-br from-interactive-500 to-accent-500 flex items-center justify-center text-white font-semibold')}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {isKing && (
        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-accent-500 rounded-full flex items-center justify-center">
          <Crown className="w-2 h-2 text-white" />
        </div>
      )}
    </div>
  );
}

function UserBadgeDisplay({ badges }: { badges: UserBadges }) {
  return (
    <div className="flex items-center gap-0.5">
      {badges.isKing && (
        <span className="px-1 py-px bg-accent-500/20 text-accent-400 text-[9px] font-bold rounded flex items-center gap-0.5">
          <Crown className="w-2 h-2" /> KING
        </span>
      )}
      {badges.isTopTen && !badges.isKing && (
        <span className="px-1 py-px bg-interactive-500/20 text-interactive-400 text-[9px] font-bold rounded">TOP 10</span>
      )}
      {badges.tier === 'pro' && (
        <span className="px-1 py-px bg-green-500/20 text-green-400 text-[9px] font-bold rounded flex items-center gap-0.5">
          <Zap className="w-2 h-2" /> PRO
        </span>
      )}
    </div>
  );
}

interface ChatMessageProps {
  message: PromoMessage;
  isKingMessage?: boolean;
}

function ChatMessage({ message, isKingMessage = false }: ChatMessageProps) {
  const { author, content, linkUrl, linkPreview, createdAt } = message;
  return (
    <div className={cn('flex gap-2', isKingMessage && 'pl-2 border-l-2 border-accent-500')}>
      <Avatar url={author.avatarUrl} name={author.displayName} isKing={author.badges.isKing} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className={cn('font-medium text-xs', isKingMessage ? 'text-accent-400' : 'text-text-primary')}>
            {author.displayName}
          </span>
          <UserBadgeDisplay badges={author.badges} />
          <span className="text-[10px] text-text-tertiary flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />{formatRelativeTime(createdAt)}
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed break-words">{content}</p>
        {linkUrl && (
          <a 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mt-2 block p-2 rounded-lg bg-background-elevated/50 border border-border-subtle hover:border-interactive-500/50 transition-colors"
          >
            <div className="flex items-start gap-2">
              {linkPreview?.imageUrl && (
                <img 
                  src={linkPreview.imageUrl} 
                  alt="" 
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-interactive-400 text-[11px] font-medium">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{linkPreview?.title || new URL(linkUrl).hostname}</span>
                </div>
                {linkPreview?.description && (
                  <p className="text-[10px] text-text-tertiary mt-0.5 line-clamp-1">{linkPreview.description}</p>
                )}
              </div>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}

function KingBanner({ message }: { message: PromoMessage }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-accent-600/10 via-accent-500/5 to-accent-600/10 border border-accent-500/20 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center">
          <Crown className="w-3 h-3 text-white" />
        </div>
        <div>
          <h3 className="text-[11px] font-bold text-accent-400">King of the Hill</h3>
        </div>
      </div>
      <ChatMessage message={message} isKingMessage />
    </div>
  );
}

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  index: number;
}

function LeaderboardCard({ entry, index }: LeaderboardCardProps) {
  const rankColors = ['from-accent-500 to-yellow-500', 'from-slate-400 to-slate-300', 'from-amber-700 to-amber-600'];
  const isTopThree = index < 3;
  return (
    <div className={cn(
      'flex items-center gap-2 p-1.5 rounded-lg transition-colors',
      isTopThree ? 'bg-background-elevated/50' : 'hover:bg-background-elevated/30'
    )}>
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
        isTopThree ? `bg-gradient-to-br ${rankColors[index]} text-white` : 'bg-background-elevated text-text-tertiary'
      )}>
        {entry.rank}
      </div>
      <Avatar url={entry.avatarUrl} name={entry.displayName} size="sm" isKing={entry.isKing} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-[11px] font-medium truncate', entry.isKing ? 'text-accent-400' : 'text-text-primary')}>
          {entry.displayName}
        </p>
      </div>
      <p className={cn('text-[11px] font-bold', isTopThree ? 'text-accent-400' : 'text-text-tertiary')}>
        {formatCurrency(entry.totalDonationsCents)}
      </p>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex gap-2 animate-pulse" role="status" aria-label="Loading message...">
      <div className="w-8 h-8 rounded-full bg-background-elevated" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 bg-background-elevated rounded w-20" />
          <div className="h-2 bg-background-elevated rounded w-12" />
        </div>
        <div className="h-3 bg-background-elevated rounded w-full mb-0.5" />
        <div className="h-3 bg-background-elevated rounded w-2/3" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="w-12 h-12 rounded-xl bg-interactive-500/10 flex items-center justify-center mb-3">
        <MessageSquare className="w-6 h-6 text-interactive-400" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">No messages yet</h3>
      <p className="text-xs text-text-tertiary text-center max-w-xs">Be the first to post and claim the crown!</p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface PromoBoardContentProps {
  /** Optional className for the container */
  className?: string;
}

export function PromoBoardContent({ className }: PromoBoardContentProps) {
  const [showCompose, setShowCompose] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { isMobile } = useMobileDetection();
  
  // Data fetching hooks
  const { 
    data: messagesData, 
    isLoading: messagesLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = usePromoMessages();
  const { data: pinnedMessage, isLoading: pinnedLoading } = usePinnedMessage();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard();
  
  // Derived data
  const allMessages = messagesData?.pages.flatMap((p) => p.messages) ?? [];
  const totalMessages = messagesData?.pages[0]?.totalCount ?? 0;
  const totalDonations = leaderboard?.entries.reduce((sum, e) => sum + e.totalDonationsCents, 0) ?? 0;

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: promoKeys.messages() }),
      queryClient.invalidateQueries({ queryKey: promoKeys.pinned() }),
      queryClient.invalidateQueries({ queryKey: promoKeys.leaderboard() }),
    ]);
  }, [queryClient]);

  return (
    <div className={cn('', className)}>
      <PullToRefresh onRefresh={handleRefresh} disabled={!isMobile}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-interactive-600 to-accent-600 flex items-center justify-center shadow-md shadow-interactive-600/25">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Promo Board</h2>
              <p className="text-[11px] text-text-secondary">Community Spotlight • $1/message</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Stats */}
            <div className="hidden md:flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1 text-text-tertiary">
                <Users className="w-3.5 h-3.5" />
                <span>{leaderboard?.entries.length ?? 0} donors</span>
              </div>
              <div className="flex items-center gap-1 text-text-tertiary">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{totalMessages} messages</span>
              </div>
              <div className="flex items-center gap-1 text-success-muted">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="font-medium">{formatCurrency(totalDonations)} raised</span>
              </div>
            </div>

            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-interactive-600 to-accent-600 hover:from-interactive-500 hover:to-accent-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-interactive-500/25 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Post Message
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-4">
          {/* Chat Feed */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* King Banner */}
            {!pinnedLoading && pinnedMessage && <KingBanner message={pinnedMessage} />}

            {/* Messages */}
            <div 
              ref={chatContainerRef} 
              className="bg-background-surface/50 rounded-lg border border-border-subtle overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-border-subtle bg-background-surface/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success-muted animate-pulse" />
                  <span className="text-[11px] font-medium text-text-secondary">Live Feed</span>
                </div>
                <span className="text-[10px] text-text-tertiary">
                  {totalMessages} message{totalMessages !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="p-3 space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => <MessageSkeleton key={i} />)}
                  </div>
                ) : allMessages.length === 0 ? (
                  <EmptyState />
                ) : (
                  <AnimatePresence>
                    {allMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <ChatMessage message={msg} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {hasNextPage && (
                <div className="px-3 py-2 border-t border-border-subtle">
                  <button 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage} 
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    {isFetchingNextPage ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Stats */}
            <div className="grid grid-cols-3 gap-2 lg:hidden">
              <div className="p-2 rounded-lg bg-background-surface border border-border-subtle text-center">
                <p className="text-sm font-bold text-text-primary">{leaderboard?.entries.length ?? 0}</p>
                <p className="text-[10px] text-text-tertiary">Donors</p>
              </div>
              <div className="p-2 rounded-lg bg-background-surface border border-border-subtle text-center">
                <p className="text-sm font-bold text-text-primary">{totalMessages}</p>
                <p className="text-[10px] text-text-tertiary">Messages</p>
              </div>
              <div className="p-2 rounded-lg bg-background-surface border border-border-subtle text-center">
                <p className="text-sm font-bold text-success-muted">{formatCurrency(totalDonations)}</p>
                <p className="text-[10px] text-text-tertiary">Raised</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0 space-y-3">
            {/* Leaderboard */}
            <div className="rounded-lg border border-border-subtle bg-background-surface/50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border-subtle bg-background-surface/80 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-accent-400" />
                <h3 className="text-xs font-semibold text-text-primary">Top Donors</h3>
              </div>
              <div className="p-2">
                {leaderboardLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-8 bg-background-elevated rounded animate-pulse" />
                    ))}
                  </div>
                ) : leaderboard?.entries.length === 0 ? (
                  <div className="py-6 text-center">
                    <Trophy className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                    <p className="text-[11px] text-text-tertiary">No donors yet</p>
                    <p className="text-[10px] text-text-disabled">Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {leaderboard?.entries.slice(0, 10).map((entry, index) => (
                      <LeaderboardCard key={entry.userId} entry={entry} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* How It Works */}
            <div className="rounded-lg border border-border-subtle bg-background-surface/50 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-interactive-400" />
                <h3 className="text-xs font-semibold text-text-primary">How It Works</h3>
              </div>
              <ul className="space-y-2 text-[11px] text-text-secondary">
                <li className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-interactive-500/20 text-interactive-400 text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Post a message for $1 to promote your content</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-interactive-500/20 text-interactive-400 text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Top donor becomes King of the Hill</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-interactive-500/20 text-interactive-400 text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>King's message stays pinned at the top</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </PullToRefresh>

      {/* Compose Modal */}
      <PromoComposeModal isOpen={showCompose} onClose={() => setShowCompose(false)} />
    </div>
  );
}

export default PromoBoardContent;
