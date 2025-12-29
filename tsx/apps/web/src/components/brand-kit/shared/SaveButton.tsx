'use client';

import { cn } from '@/lib/utils';
import { SaveIcon } from '../icons';

interface SaveButtonProps {
  onClick: () => void;
  isSaving: boolean;
  disabled?: boolean;
  label?: string;
}

export function SaveButton({ onClick, isSaving, disabled, label = 'Save' }: SaveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaving || disabled}
      className={cn(
        "flex items-center gap-2 px-4 py-2 min-h-[44px]",
        "bg-interactive-600 hover:bg-interactive-500 active:bg-interactive-700 text-white",
        "text-sm font-medium rounded-lg transition-all",
        "active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      )}
    >
      {isSaving ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <SaveIcon />
      )}
      {isSaving ? 'Saving...' : label}
    </button>
  );
}
