/**
 * Mock for @/lib/tokenStorage
 * Used in tests to simulate token storage behavior
 */

let mockAccessToken: string | null = null;
let mockRefreshToken: string | null = null;

export const TokenStorage = {
  getAccessToken: jest.fn(async () => mockAccessToken),
  setAccessToken: jest.fn(async (token: string) => {
    mockAccessToken = token;
  }),
  getRefreshToken: jest.fn(async () => mockRefreshToken),
  setRefreshToken: jest.fn(async (token: string) => {
    mockRefreshToken = token;
  }),
  setTokens: jest.fn(async (accessToken: string, refreshToken: string) => {
    mockAccessToken = accessToken;
    mockRefreshToken = refreshToken;
  }),
  clearTokens: jest.fn(async () => {
    mockAccessToken = null;
    mockRefreshToken = null;
  }),
  hasTokens: jest.fn(async () => mockAccessToken !== null),
};

// Helper to set mock token for tests
export const __setMockAccessToken = (token: string | null) => {
  mockAccessToken = token;
};

export const __setMockRefreshToken = (token: string | null) => {
  mockRefreshToken = token;
};

export const __resetMocks = () => {
  mockAccessToken = null;
  mockRefreshToken = null;
  TokenStorage.getAccessToken.mockClear();
  TokenStorage.setAccessToken.mockClear();
  TokenStorage.getRefreshToken.mockClear();
  TokenStorage.setRefreshToken.mockClear();
  TokenStorage.setTokens.mockClear();
  TokenStorage.clearTokens.mockClear();
  TokenStorage.hasTokens.mockClear();
};
