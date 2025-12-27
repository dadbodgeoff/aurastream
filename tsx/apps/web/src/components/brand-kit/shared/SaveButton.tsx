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
        "flex items-center gap-2 px-4 py-2",
        "bg-interactive-600 hover:bg-interactive-500 text-white",
        "text-sm font-medium rounded-lg transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed"
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
