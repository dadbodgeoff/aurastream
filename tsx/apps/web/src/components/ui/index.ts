/**
 * UI Components Index
 * @module ui
 * 
 * Re-exports all UI components for convenient importing.
 */

// Typography components
export {
  Text,
  Heading,
  Body,
  Caption,
  Label,
  Overline,
  Micro,
} from './Typography';

export type {
  TypographyProps,
  TypographyVariant,
  TypographyColor,
} from './Typography';

// Badge, Tag, Pill components
export {
  Badge,
  Tag,
  Pill,
  StatusDot,
} from './Badge';

export type {
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  TagProps,
  TagVariant,
  PillProps,
  PillVariant,
  StatusDotProps,
  StatusDotVariant,
} from './Badge';

// ButtonGroup component
export { ButtonGroup, ButtonGroupItem } from './ButtonGroup';
export type {
  ButtonGroupProps,
  ButtonGroupItemProps,
  ButtonGroupVariant,
  ButtonGroupSize,
  ButtonGroupOrientation,
} from './ButtonGroup';

// GlassCard component
export { GlassCard } from './GlassCard';
export type { GlassCardProps } from './GlassCard';

// Skeleton components
export {
  Skeleton,
  SkeletonCard,
  SkeletonText,
  AssetGridSkeleton,
  BrandKitCardSkeleton,
  DashboardStatsSkeleton,
  CoachMessageSkeleton,
  TableRowSkeleton,
  ProfileSkeleton,
  PageSkeleton,
} from './Skeleton';

export type {
  SkeletonProps,
  SkeletonCardProps,
  SkeletonTextProps,
} from './Skeleton';

// Toast notification system
export {
  Toast,
  ToastContainer,
  toast,
  useToasts,
} from './Toast';

export type {
  ToastVariant,
  ToastOptions,
  ToastAction,
  ToastData,
  ToastProps,
  ToastContainerProps,
} from './Toast';

// InputGroup component
export { InputGroup, InputAddon } from './InputGroup';
export type {
  InputGroupProps,
  InputGroupSize,
  InputAddonProps,
} from './InputGroup';

// ResponsiveModal component
export { ResponsiveModal } from './ResponsiveModal';
export type { ResponsiveModalProps } from './ResponsiveModal';

// PullToRefresh component
export { PullToRefresh } from './PullToRefresh';
export type { PullToRefreshProps } from './PullToRefresh';

// ContextMenu component
export { ContextMenu } from './ContextMenu';
export type {
  ContextMenuProps,
  ContextMenuItem,
} from './ContextMenu';
