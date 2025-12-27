module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@aurastream/.*)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@aurastream/api-client$': '<rootDir>/__mocks__/@aurastream/api-client.ts',
    '^@aurastream/shared$': '<rootDir>/__mocks__/@aurastream/shared.ts',
    '^@aurastream/ui$': '<rootDir>/__mocks__/@aurastream/ui.ts',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^expo-clipboard$': '<rootDir>/__mocks__/expo-clipboard.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
