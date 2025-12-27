/**
 * useViewTransition - Hook for View Transitions API
 * 
 * Provides smooth, hardware-accelerated page transitions using the
 * native View Transitions API. Falls back gracefully in unsupported browsers.
 * 
 * @example
 * const { navigateWithTransition, isTransitioning } = useViewTransition();
 * 
 * <button onClick={() => navigateWithTransition('/dashboard')}>
 *   Go to Dashboard
 * </button>
 */

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

interface ViewTransitionOptions {
  /** Custom transition name for CSS targeting */
  transitionName?: string;
  /** Callback before transition starts */
  onTransitionStart?: () => void;
  /** Callback after transition completes */
  onTransitionEnd?: () => void;
}

interface UseViewTransitionReturn {
  /** Navigate to a URL with a view transition */
  navigateWithTransition: (href: string, options?: ViewTransitionOptions) => void;
  /** Whether a transition is currently in progress */
  isTransitioning: boolean;
  /** Whether the browser supports View Transitions API */
  isSupported: boolean;
}

/**
 * Check if View Transitions API is supported
 */
function supportsViewTransitions(): boolean {
  if (typeof document === 'undefined') return false;
  return 'startViewTransition' in document;
}

export function useViewTransition(): UseViewTransitionReturn {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isSupported = supportsViewTransitions();

  const navigateWithTransition = useCallback(
    (href: string, options?: ViewTransitionOptions) => {
      const { onTransitionStart, onTransitionEnd, transitionName } = options ?? {};

      // If View Transitions not supported, fall back to normal navigation
      if (!isSupported || typeof document === 'undefined') {
        startTransition(() => {
          router.push(href);
        });
        return;
      }

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (prefersReducedMotion) {
        startTransition(() => {
          router.push(href);
        });
        return;
      }

      setIsTransitioning(true);
      onTransitionStart?.();

      // Set custom transition name if provided
      if (transitionName) {
        document.documentElement.style.setProperty(
          '--view-transition-name',
          transitionName
        );
      }

      // Start the view transition
      const transition = (document as any).startViewTransition(() => {
        startTransition(() => {
          router.push(href);
        });
      });

      // Handle transition completion
      transition.finished
        .then(() => {
          setIsTransitioning(false);
          onTransitionEnd?.();
          
          // Clean up custom transition name
          if (transitionName) {
            document.documentElement.style.removeProperty('--view-transition-name');
          }
        })
        .catch(() => {
          setIsTransitioning(false);
        });
    },
    [router, isSupported, startTransition]
  );

  return {
    navigateWithTransition,
    isTransitioning: isTransitioning || isPending,
    isSupported,
  };
}

/**
 * ViewTransitionLink - A link component with view transitions
 */
export interface ViewTransitionLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  transitionName?: string;
  children: React.ReactNode;
}

export function ViewTransitionLink({
  href,
  transitionName,
  children,
  onClick,
  ...props
}: ViewTransitionLinkProps) {
  const { navigateWithTransition } = useViewTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.(e);
    navigateWithTransition(href, { transitionName });
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
