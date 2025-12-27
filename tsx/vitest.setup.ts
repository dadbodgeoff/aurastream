/**
 * Vitest Setup File
 * Global test configuration and setup
 */

import { afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  // Reset any global state if needed
});

// Mock window.location for tests that need it
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    value: {
      href: '',
      pathname: '/',
      search: '',
      hash: '',
      origin: 'http://localhost',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      assign: () => {},
      replace: () => {},
      reload: () => {},
    },
    writable: true,
  });
}

// Mock localStorage for tests
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}
