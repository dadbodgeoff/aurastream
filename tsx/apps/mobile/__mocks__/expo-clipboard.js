/**
 * Mock for expo-clipboard
 */

module.exports = {
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue(''),
  hasStringAsync: jest.fn().mockResolvedValue(false),
};
