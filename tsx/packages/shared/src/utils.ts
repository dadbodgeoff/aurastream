// Shared Utilities - Placeholder

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function generateId(): string {
  return crypto.randomUUID();
}
