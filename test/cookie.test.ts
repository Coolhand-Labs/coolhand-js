import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  generateUUID,
  isValidUUID,
  getCookie,
  setCookie,
  isCookieSupported,
  getOrCreateFingerprintId,
} from '../src/cookie';

describe('Cookie Utility', () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });

    it('should generate UUID v4 format (version 4 marker)', () => {
      const uuid = generateUUID();
      // UUID v4 has '4' at position 14 (0-indexed)
      expect(uuid[14]).toBe('4');
    });

    it('should generate UUID with correct variant bits', () => {
      const uuid = generateUUID();
      // Position 19 should be 8, 9, a, or b
      const variantChar = uuid[19].toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-41d4-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-31d4-a716-446655440000')).toBe(false); // Wrong version
      expect(isValidUUID('550e8400-e29b-41d4-0716-446655440000')).toBe(false); // Wrong variant
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false); // No dashes
    });

    it('should be case-insensitive', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
      expect(isValidUUID('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
    });
  });

  describe('getCookie', () => {
    it('should return null when cookie does not exist', () => {
      expect(getCookie('nonexistent')).toBeNull();
    });

    it('should return cookie value when it exists', () => {
      document.cookie = 'test_cookie=test_value; path=/';
      expect(getCookie('test_cookie')).toBe('test_value');
    });

    it('should handle URL-encoded values', () => {
      document.cookie = 'encoded_cookie=' + encodeURIComponent('hello world') + '; path=/';
      expect(getCookie('encoded_cookie')).toBe('hello world');
    });

    it('should handle multiple cookies', () => {
      document.cookie = 'cookie1=value1; path=/';
      document.cookie = 'cookie2=value2; path=/';
      document.cookie = 'cookie3=value3; path=/';

      expect(getCookie('cookie1')).toBe('value1');
      expect(getCookie('cookie2')).toBe('value2');
      expect(getCookie('cookie3')).toBe('value3');
    });
  });

  describe('setCookie', () => {
    it('should return false when not on HTTPS', () => {
      // jsdom defaults to http://localhost
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = setCookie('test', 'value', 365);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTPS')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isCookieSupported', () => {
    it('should return true when cookies are enabled', () => {
      // jsdom has cookies enabled by default
      expect(isCookieSupported()).toBe(true);
    });
  });

  describe('getOrCreateFingerprintId', () => {
    it('should return null when not on HTTPS', () => {
      // jsdom defaults to http://localhost
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = getOrCreateFingerprintId();

      // Should return null because setCookie fails on HTTP
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });
});

// Note: HTTPS-specific tests are skipped because jsdom doesn't allow
// mocking window.location.protocol. The HTTPS behavior is tested manually
// and through the integration tests that verify the overall flow.
