'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Crown, 
  Trophy, 
  Users, 
  TrendingUp, 
  ExternalLink,
  Send,
  Sparkles,
  ChevronDown,
  Clock,
  DollarSign,
  Star,
  Shield,
  Zap
} from 'lucide-react';
import { usePromoMessages, usePinnedMessage, useLeaderboard } from '@aurastream/api-client';
import type { PromoMessage, LeaderboardEntry, UserBadges } from '@aurastream/api-client';
import { PromoComposeModal } from '@/components/promo/PromoComposeModal';

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Sub-Components
// ============================================================================

function Avatar({ 
  url, 
  name, 
  size = 'md',
  isKing = false,
  showRing = false 
}: { 
  url: string | null; 
  name: string; 
  size?: 'sm' | 'md' | 'lg';
  isKing?: boolean;
  showRing?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div className="relative">
      {url ? (
        <img 
          src={url} 
          alt={name} 
          className={`${sizeClasses[size]} rounded-full object-cover ${showRing ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-background-base' : ''}`} 
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-interactive-500 to-accent-500 flex items-center justify-center text-white font-semibold ${showRing ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-background-base' : ''}`}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {isKing && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full flex items-center justify-center shadow-lg">
          <Crown className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

function UserBadgeDisplay({ badges }: { badges: UserBadges }) {
  return (
    <div className="flex items-center gap-1">
      {badges.isKing && (
        <span className="px-1.5 py-0.5 bg-accent-500/20 text-accent-400 text-[10px] font-bold rounded flex items-center gap-0.5">
          <Crown className="w-2.5 h-2.5" /> KING
        </span>
      )}
      {badges.isTopTen && !badges.isKing && (
        <span className="px-1.5 py-0.5 bg-interactive-500/20 text-interactive-400 text-[10px] font-bold rounded flex items-center gap-0.5">
          <Trophy className="w-2.5 h-2.5" /> TOP 10
        </span>
      )}
      {badges.tier === 'studio' && (
        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5" /> STUDIO
        </span>
      )}
      {badges.tier === 'pro' && (
        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded flex items-center gap-0.5">
          <Zap className="w-2.5 h-2.5" /> PRO
        </span>
      )}
      {badges.isVerified && (
        <Shield className="w-3.5 h-3.5 text-interactive-400" />
      )}
    </div>
  );
}


function ChatMessage({ message, isKingMessage = false }: { message: PromoMessage; isKingMessage?: boolean }) {
  const { author, content, linkUrl, linkPreview, createdAt } = message;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative ${isKingMessage ? 'pl-4 border-l-2 border-accent-500' : ''}`}
    >
      <div className="flex gap-3">
        <Avatar 
          url={author.avatarUrl} 
          name={author.displayName} 
          isKing={author.badges.isKing}
          showRing={isKingMessage}
        />
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`font-semibold ${isKingMessage ? 'text-accent-400' : 'text-text-primary'}`}>
              {author.displayName}
            </span>
            <UserBadgeDisplay badges={author.badges} />
            <span className="text-xs text-text-tertiary flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(createdAt)}
            </span>
          </div>

          {/* Content */}
          <p className="text-text-secondary leading-relaxed break-words">
            {content}
          </p>

          {/* Link Preview */}
          {linkUrl && (
            <a 
              href={linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-3 block p-3 rounded-lg bg-background-elevated/50 border border-border-subtle hover:border-interactive-500/50 transition-colors group/link"
            >
              <div className="flex items-start gap-3">
                {linkPreview?.imageUrl && (
                  <img 
                    src={linkPreview.imageUrl} 
                    alt="" 
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-interactive-400 text-sm font-medium group-hover/link:text-interactive-300">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{linkPreview?.title || new URL(linkUrl).hostname}</span>
                  </div>
                  {linkPreview?.description && (
                    <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                      {linkPreview.description}
                    </p>
                  )}
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function KingOfTheHillBanner({ message }: { message: PromoMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-600/20 via-accent-500/10 to-accent-600/20 border border-accent-500/30 p-4"
    >
      {/* Animated background shimmer */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-400/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative">
        {/* Crown Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-accent-400">King of the Hill</h3>
            <p className="text-[10px] text-accent-500/70 uppercase tracking-wider">Current Top Donor</p>
          </div>
        </div>

        <ChatMessage message={message} isKingMessage />
      </div>
    </motion.div>
  );
}

function LeaderboardCard({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const rankColors = [
    'from-accent-500 to-yellow-500', // 1st - Gold
    'from-slate-400 to-slate-300',   // 2nd - Silver
    'from-amber-700 to-amber-600',   // 3rd - Bronze
  ];

  const isTopThree = index < 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
        isTopThree ? 'bg-background-elevated/50' : 'hover:bg-background-elevated/30'
      }`}
    >
      {/* Rank */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        isTopThree 
          ? `bg-gradient-to-br ${rankColors[index]} text-white shadow-lg` 
          : 'bg-background-elevated text-text-tertiary'
      }`}>
        {entry.rank}
      </div>

      {/* Avatar */}
      <Avatar 
        url={entry.avatarUrl} 
        name={entry.displayName} 
        size="sm"
        isKing={entry.isKing}
      />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${entry.isKing ? 'text-accent-400' : 'text-text-primary'}`}>
          {entry.displayName}
        </p>
        <p className="text-[10px] text-text-tertiary">
          {entry.messageCount} message{entry.messageCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className={`text-sm font-bold ${isTopThree ? 'text-accent-400' : 'text-text-secondary'}`}>
          {formatCurrency(entry.totalDonationsCents)}
        </p>
      </div>
    </motion.div>
  );
}


function StatsCard({ icon: Icon, label, value, trend }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  trend?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-background-elevated/30 border border-border-subtle">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-text-tertiary" />
        <span className="text-xs text-text-tertiary">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-text-primary">{value}</span>
        {trend && <span className="text-xs text-green-400">{trend}</span>}
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-background-elevated" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 bg-background-elevated rounded w-24" />
          <div className="h-3 bg-background-elevated rounded w-16" />
        </div>
        <div className="h-4 bg-background-elevated rounded w-full mb-1" />
        <div className="h-4 bg-background-elevated rounded w-3/4" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-interactive-500/20 to-accent-500/20 flex items-center justify-center mb-6">
        <MessageSquare className="w-10 h-10 text-interactive-400" />
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">No messages yet</h3>
      <p className="text-text-secondary text-center max-w-sm mb-6">
        Be the first to post on the Promo Board and claim the crown!
      </p>
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <DollarSign className="w-4 h-4" />
        <span>$1 per message • Support the community</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PromoPage() {
  const [showCompose, setShowCompose] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const { 
    data: messagesData, 
    isLoading: messagesLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = usePromoMessages();
  const { data: pinnedMessage, isLoading: pinnedLoading } = usePinnedMessage();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard();
  
  const allMessages = messagesData?.pages.flatMap((p) => p.messages) ?? [];
  const totalMessages = messagesData?.pages[0]?.totalCount ?? 0;
  const totalDonations = leaderboard?.entries.reduce((sum, e) => sum + e.totalDonationsCents, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background-base">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background-base/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-interactive-600 to-accent-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-text-primary">Promo Board</h1>
                <p className="text-xs text-text-tertiary">Community Spotlight • $1/message</p>
              </div>
            </div>

            {/* Quick Stats (Desktop) */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-text-secondary">{leaderboard?.entries.length ?? 0} donors</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-text-tertiary" />
                <span className="text-text-secondary">{totalMessages} messages</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">{formatCurrency(totalDonations)} raised</span>
              </div>
            </div>

            {/* Post Button */}
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-interactive-600 to-accent-600 hover:from-interactive-500 hover:to-accent-500 text-white font-semibold rounded-lg shadow-lg shadow-interactive-500/25 transition-all hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Post Message</span>
              <span className="sm:hidden">Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Chat Feed */}
          <div className="flex-1 min-w-0">
            {/* King of the Hill Banner */}
            <AnimatePresence>
              {!pinnedLoading && pinnedMessage && (
                <div className="mb-6">
                  <KingOfTheHillBanner message={pinnedMessage} />
                </div>
              )}
            </AnimatePresence>

            {/* Messages Container */}
            <div 
              ref={chatContainerRef}
              className="bg-background-surface/50 rounded-2xl border border-border-subtle overflow-hidden"
            >
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border-subtle bg-background-surface/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-text-secondary">Live Feed</span>
                </div>
                <span className="text-xs text-text-tertiary">
                  {totalMessages} message{totalMessages !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-6 min-h-[400px] max-h-[600px] overflow-y-auto">
                {messagesLoading ? (
                  <div className="space-y-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <MessageSkeleton key={i} />
                    ))}
                  </div>
                ) : allMessages.length === 0 ? (
                  <EmptyState />
                ) : (
                  <AnimatePresence>
                    {allMessages.map((msg) => (
                      <ChatMessage key={msg.id} message={msg} />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Load More */}
              {hasNextPage && (
                <div className="px-4 py-3 border-t border-border-subtle">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-text-tertiary/30 border-t-text-tertiary rounded-full"
                        />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Load older messages
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Stats */}
            <div className="grid grid-cols-3 gap-3 mt-6 lg:hidden">
              <StatsCard icon={Users} label="Donors" value={leaderboard?.entries.length ?? 0} />
              <StatsCard icon={MessageSquare} label="Messages" value={totalMessages} />
              <StatsCard icon={TrendingUp} label="Raised" value={formatCurrency(totalDonations)} />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Leaderboard */}
              <div className="rounded-2xl border border-border-subtle bg-background-surface/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle bg-background-surface/80">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent-400" />
                    <h2 className="font-semibold text-text-primary">Top Donors</h2>
                  </div>
                </div>

                <div className="p-3">
                  {leaderboardLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                          <div className="w-7 h-7 rounded-full bg-background-elevated" />
                          <div className="w-8 h-8 rounded-full bg-background-elevated" />
                          <div className="flex-1">
                            <div className="h-4 bg-background-elevated rounded w-20 mb-1" />
                            <div className="h-3 bg-background-elevated rounded w-12" />
                          </div>
                          <div className="h-4 bg-background-elevated rounded w-10" />
                        </div>
                      ))}
                    </div>
                  ) : leaderboard?.entries.length === 0 ? (
                    <div className="py-8 text-center">
                      <Trophy className="w-10 h-10 text-text-disabled mx-auto mb-3" />
                      <p className="text-sm text-text-tertiary">No donors yet</p>
                      <p className="text-xs text-text-disabled mt-1">Be the first!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {leaderboard?.entries.slice(0, 10).map((entry, index) => (
                        <LeaderboardCard key={entry.userId} entry={entry} index={index} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* How It Works */}
              <div className="rounded-2xl border border-border-subtle bg-background-surface/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-interactive-400" />
                  <h3 className="font-semibold text-text-primary">How It Works</h3>
                </div>
                <ul className="space-y-3 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-interactive-500/20 text-interactive-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Post a message for $1 to promote your content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-interactive-500/20 text-interactive-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Top donor becomes King of the Hill</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-interactive-500/20 text-interactive-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>King's message stays pinned at the top</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Compose Modal */}
      <PromoComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
      />
    </div>
  );
}
