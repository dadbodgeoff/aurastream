// Shared Utilities - Placeholder

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function generateId(): string {
  return crypto.randomUUID();
}

// Dev Logger - Feature-flagged development logging
export { devLog, createDevLogger, isDevMode } from './utils/devLogger';
