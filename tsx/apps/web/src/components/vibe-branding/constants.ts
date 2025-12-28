export const TERMINAL_MESSAGES = [
  "Initializing Gemini Vision...",
  "Extracting hex values...",
  "Identifying font weights...",
  "Analyzing lighting models...",
  "Detecting color harmonies...",
  "Cloning aesthetic DNA...",
  "Constructing Brand Kit...",
  "Finalizing extraction..."
];

export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const LIGHTING_MOOD_LABELS: Record<string, string> = {
  neon: '🌃 Neon',
  natural: '☀️ Natural',
  dramatic: '🎭 Dramatic',
  cozy: '☕ Cozy',
  'high-contrast': '⚡ High Contrast',
};

export const TONE_LABELS: Record<string, string> = {
  competitive: '🏆 Competitive',
  casual: '😎 Casual',
  educational: '📚 Educational',
  comedic: '😂 Comedic',
  professional: '💼 Professional',
};
