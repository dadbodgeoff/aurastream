import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts'],
    },
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
  },
  resolve: {
    alias: {
      '@aurastream/ui': path.resolve(__dirname, 'packages/ui/src'),
      '@aurastream/api-client': path.resolve(__dirname, 'packages/api-client/src'),
      '@aurastream/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@': path.resolve(__dirname, 'apps/web/src'),
    },
  },
});
