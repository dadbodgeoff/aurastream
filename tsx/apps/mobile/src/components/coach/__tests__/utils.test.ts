/**
 * Tests for Prompt Coach utility functions.
 * @module coach/__tests__/utils.test
 */

import {
  generateId,
  extractPromptFromContent,
  parseValidationResult,
  getAccessToken,
} from '../utils';
import type { StreamChunkMetadata } from '../types';

// Mock the tokenStorage module
jest.mock('@/lib/tokenStorage', () => ({
  TokenStorage: {
    getAccessToken: jest.fn(),
  },
}));

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should start with msg_ prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^msg_/);
  });

  it('should contain timestamp and random string', () => {
    const id = generateId();
    expect(id).toMatch(/^msg_\d+_[a-z0-9]+$/);
  });
});

describe('extractPromptFromContent', () => {
  it('should extract prompt from markdown code block', () => {
    const content = `Here's my suggestion:

\`\`\`prompt
A happy cat emote with vibrant colors
\`\`\`

Let me know if you want changes.`;

    const result = extractPromptFromContent(content);
    expect(result).toBe('A happy cat emote with vibrant colors');
  });

  it('should handle prompt block with newline after opening', () => {
    const content = `\`\`\`prompt
Multi-line prompt
with multiple lines
\`\`\``;

    const result = extractPromptFromContent(content);
    expect(result).toBe('Multi-line prompt\nwith multiple lines');
  });

  it('should return null when no prompt block exists', () => {
    const content = 'Just some regular text without a prompt block';
    const result = extractPromptFromContent(content);
    expect(result).toBeNull();
  });

  it('should return null for empty content', () => {
    const result = extractPromptFromContent('');
    expect(result).toBeNull();
  });

  it('should handle prompt block without newline', () => {
    const content = '```prompt\nSimple prompt```';
    const result = extractPromptFromContent(content);
    expect(result).toBe('Simple prompt');
  });
});

describe('parseValidationResult', () => {
  it('should parse complete validation metadata', () => {
    const metadata: StreamChunkMetadata = {
      is_valid: true,
      is_generation_ready: true,
      quality_score: 0.85,
      issues: [
        {
          severity: 'warning',
          code: 'MISSING_DETAIL',
          message: 'Consider adding more detail',
          suggestion: 'Add specific colors or style',
        },
      ],
      prompt_version: 2,
    };

    const result = parseValidationResult(metadata);

    expect(result.isValid).toBe(true);
    expect(result.isGenerationReady).toBe(true);
    expect(result.qualityScore).toBe(0.85);
    expect(result.promptVersion).toBe(2);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toEqual({
      severity: 'warning',
      code: 'MISSING_DETAIL',
      message: 'Consider adding more detail',
      suggestion: 'Add specific colors or style',
    });
  });

  it('should handle missing fields with defaults', () => {
    const metadata: StreamChunkMetadata = {};

    const result = parseValidationResult(metadata);

    expect(result.isValid).toBe(false);
    expect(result.isGenerationReady).toBe(false);
    expect(result.qualityScore).toBe(0);
    expect(result.issues).toEqual([]);
    expect(result.promptVersion).toBeUndefined();
  });

  it('should handle issues without suggestions', () => {
    const metadata: StreamChunkMetadata = {
      is_valid: false,
      issues: [
        {
          severity: 'error',
          code: 'INVALID_PROMPT',
          message: 'Prompt is invalid',
        },
      ],
    };

    const result = parseValidationResult(metadata);

    expect(result.issues[0].suggestion).toBeUndefined();
  });
});

describe('getAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return token from TokenStorage when available', async () => {
    const { TokenStorage } = require('@/lib/tokenStorage');
    TokenStorage.getAccessToken.mockResolvedValue('test-access-token');

    const token = await getAccessToken();

    expect(token).toBe('test-access-token');
    expect(TokenStorage.getAccessToken).toHaveBeenCalled();
  });

  it('should return null when no token is stored', async () => {
    const { TokenStorage } = require('@/lib/tokenStorage');
    TokenStorage.getAccessToken.mockResolvedValue(null);

    const token = await getAccessToken();

    expect(token).toBeNull();
  });

  it('should return null and log warning when TokenStorage fails', async () => {
    const { TokenStorage } = require('@/lib/tokenStorage');
    TokenStorage.getAccessToken.mockRejectedValue(new Error('Storage error'));
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const token = await getAccessToken();

    expect(token).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});
