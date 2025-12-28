'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

// Route configuration for breadcrumb labels and hierarchy
const ROUTE_CONFIG: Record<string, { label: string; parent?: string }> = {
  // Dashboard routes
  '/dashboard': { label: 'Dashboard' },
  '/dashboard/assets': { label: 'Assets', parent: '/dashboard' },
  '/dashboard/brand-kits': { label: 'Brand Kits', parent: '/dashboard' },
  '/dashboard/create': { label: 'Create', parent: '/dashboard' },
  '/dashboard/generate': { label: 'Generate', parent: '/dashboard' },
  '/dashboard/coach': { label: 'Coach', parent: '/dashboard' },
  '/dashboard/settings': { label: 'Settings', parent: '/dashboard' },
  '/dashboard/templates': { label: 'Templates', parent: '/dashboard' },
  '/dashboard/twitch': { label: 'Twitch Pack', parent: '/dashboard' },
  '/dashboard/quick-create': { label: 'Quick Create', parent: '/dashboard' },
  '/dashboard/aura-lab': { label: 'Aura Lab', parent: '/dashboard' },
  
  // Community routes
  '/community': { label: 'Community', parent: '/dashboard' },
  '/community/share': { label: 'Share Asset', parent: '/community' },
  '/community/creators': { label: 'Creators', parent: '/community' },
  
  // Promo routes
  '/promo': { label: 'Promo Chat', parent: '/dashboard' },
  
  // Admin routes
  '/admin': { label: 'Admin' },
  '/admin/analytics': { label: 'Analytics', parent: '/admin' },
  
  // Analytics
  '/analytics': { label: 'Analytics' },
  
  // Auth routes (usually don't need breadcrumbs)
  '/login': { label: 'Login' },
  '/signup': { label: 'Sign Up' },
  '/forgot-password': { label: 'Forgot Password' },
  '/reset-password': { label: 'Reset Password' },
  
  // Legal
  '/privacy': { label: 'Privacy Policy' },
  '/terms': { label: 'Terms of Service' },
};

// Dynamic route patterns
const DYNAMIC_ROUTES: Array<{
  pattern: RegExp;
  getLabel: (match: RegExpMatchArray) => string;
  parent: string;
}> = [
  {
    pattern: /^\/community\/([a-f0-9-]+)$/,
    getLabel: () => 'Post Details',
    parent: '/community',
  },
  {
    pattern: /^\/community\/creators\/([a-f0-9-]+)$/,
    getLabel: () => 'Creator Profile',
    parent: '/community',
  },
  {
    pattern: /^\/dashboard\/generate\/([a-f0-9-]+)$/,
    getLabel: () => 'Job Details',
    parent: '/dashboard/generate',
  },
  {
    pattern: /^\/dashboard\/brand-kits\/([a-f0-9-]+)$/,
    getLabel: () => 'Brand Kit Details',
    parent: '/dashboard/brand-kits',
  },
  {
    pattern: /^\/dashboard\/assets\/([a-f0-9-]+)$/,
    getLabel: () => 'Asset Details',
    parent: '/dashboard/assets',
  },
];

function getRouteInfo(pathname: string): { label: string; parent?: string } | null {
  // Check static routes first
  if (ROUTE_CONFIG[pathname]) {
    return ROUTE_CONFIG[pathname];
  }
  
  // Check dynamic routes
  for (const route of DYNAMIC_ROUTES) {
    const match = pathname.match(route.pattern);
    if (match) {
      return {
        label: route.getLabel(match),
        parent: route.parent,
      };
    }
  }
  
  // Fallback: generate label from path segment
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    // Convert kebab-case to Title Case
    const label = lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Determine parent
    const parentPath = '/' + segments.slice(0, -1).join('/');
    return {
      label,
      parent: parentPath || undefined,
    };
  }
  
  return null;
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = pathname;
  
  // Build breadcrumbs by walking up the route hierarchy
  while (currentPath) {
    const routeInfo = getRouteInfo(currentPath);
    if (routeInfo) {
      breadcrumbs.unshift({
        label: routeInfo.label,
        href: currentPath,
      });
      currentPath = routeInfo.parent || '';
    } else {
      break;
    }
  }
  
  return breadcrumbs;
}

export interface UseBreadcrumbsResult {
  /** Array of breadcrumb items from root to current page */
  breadcrumbs: BreadcrumbItem[];
  /** Whether there's a parent route to go back to */
  canGoBack: boolean;
  /** URL of the parent route */
  parentUrl: string | null;
  /** Current page title */
  pageTitle: string;
  /** Current pathname */
  pathname: string;
}

export function useBreadcrumbs(): UseBreadcrumbsResult {
  const pathname = usePathname();
  
  return useMemo(() => {
    const breadcrumbs = buildBreadcrumbs(pathname);
    const routeInfo = getRouteInfo(pathname);
    
    return {
      breadcrumbs,
      canGoBack: breadcrumbs.length > 1,
      parentUrl: routeInfo?.parent || (breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].href : null),
      pageTitle: routeInfo?.label || 'Page',
      pathname,
    };
  }, [pathname]);
}

/**
 * Get breadcrumb label for a specific route
 */
export function getRouteLabel(pathname: string): string {
  const info = getRouteInfo(pathname);
  return info?.label || 'Page';
}

/**
 * Check if a route is a child of another route
 */
export function isChildRoute(childPath: string, parentPath: string): boolean {
  return childPath.startsWith(parentPath) && childPath !== parentPath;
}
