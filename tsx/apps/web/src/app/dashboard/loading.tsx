/**
 * Dashboard Loading State
 * 
 * This file is automatically used by Next.js as the loading UI
 * while the dashboard page is being loaded/streamed.
 */

import { DashboardSkeleton } from '@/components/skeletons';

export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
