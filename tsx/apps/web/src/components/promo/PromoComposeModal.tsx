'use client';

/**
 * PromoComposeModal Component
 * 
 * Modal for composing and purchasing a promo message ($1.00).
 * Uses Stripe checkout for payment processing.
 * 
 * @module components/promo/PromoComposeModal
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Link2, Crown, CreditCard, Sparkles } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
import { usePromoCheckout } from '@aurastream/api-client';

const MAX_CONTENT_LENGTH = 280;

interface PromoComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
  if (!url) return true; // Empty is valid (optional field)
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function PromoComposeModal({ isOpen, onClose, onSuccess }: PromoComposeModalProps) {
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const checkoutMutation = usePromoCheckout();
  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;
  const urlError = linkUrl && !isValidUrl(linkUrl) ? 'Please enter a valid URL' : null;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !urlError && !checkoutMutation.isPending;

  // Character count color
  const charCountColor = isOverLimit 
    ? 'text-red-500' 
    : remainingChars <= 20 
    ? 'text-accent-500' 
    : 'text-text-tertiary';

  // Progress bar percentage
  const progressPercent = Math.min((content.length / MAX_CONTENT_LENGTH) * 100, 100);
  const progressColor = isOverLimit 
    ? 'bg-red-500' 
    : remainingChars <= 20 
    ? 'bg-accent-500' 
    : 'bg-interactive-500';

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setLinkUrl('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    
    setError(null);
    
    try {
      const result = await checkoutMutation.mutateAsync({
        content: content.trim(),
        linkUrl: linkUrl.trim() || undefined,
        successUrl: `${window.location.origin}/promo?success=true`,
        cancelUrl: `${window.location.origin}/promo?canceled=true`,
      });
      
      // Redirect to Stripe checkout
      window.location.href = result.checkoutUrl;
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    }
  }, [canSubmit, content, linkUrl, checkoutMutation, onSuccess]);

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Post to Promo Board"
      description="Share your content with the AuraStream community"
    >
      <div className="space-y-5">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-interactive-500/10 border border-interactive-500/20">
          <Crown className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-text-primary font-medium">Become King of the Hill!</p>
            <p className="text-text-secondary mt-0.5">Top donor gets their message pinned at the top.</p>
          </div>
        </div>

        {/* Content textarea */}
        <div>
          <label htmlFor="promo-content" className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
            <Send className="w-4 h-4 text-text-tertiary" />
            Your Message
          </label>
          <div className="relative">
            <textarea
              id="promo-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share with the community?"
              rows={4}
              className="w-full px-4 py-3 bg-background-elevated border border-border-subtle rounded-xl text-text-primary placeholder:text-text-disabled resize-none focus:outline-none focus:ring-2 focus:ring-interactive-500/50 focus:border-interactive-500 transition-colors"
              disabled={checkoutMutation.isPending}
            />
            {/* Character Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-background-base rounded-b-xl overflow-hidden">
              <motion.div 
                className={`h-full ${progressColor} transition-colors`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-text-tertiary">
              Make it count — your message will be seen by the community
            </span>
            <span className={`text-xs font-medium ${charCountColor}`}>
              {remainingChars}
            </span>
          </div>
        </div>

        {/* Link URL input */}
        <div>
          <label htmlFor="promo-link" className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
            <Link2 className="w-4 h-4 text-text-tertiary" />
            Link
            <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          <input
            id="promo-link"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://your-channel.com"
            className="w-full px-4 py-3 bg-background-elevated border border-border-subtle rounded-xl text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-interactive-500/50 focus:border-interactive-500 transition-colors"
            disabled={checkoutMutation.isPending}
          />
          {urlError && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {urlError}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Price and submit */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">$1.00</p>
              <p className="text-xs text-text-tertiary">One-time payment</p>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-interactive-600 to-accent-600 hover:from-interactive-500 hover:to-accent-500 disabled:from-background-elevated disabled:to-background-elevated disabled:text-text-disabled disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-interactive-500/25 transition-all hover:scale-105 disabled:hover:scale-100 disabled:shadow-none"
          >
            {checkoutMutation.isPending ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Post Message
              </>
            )}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

export default PromoComposeModal;
