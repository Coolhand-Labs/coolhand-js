/**
 * Cookie utility module for CoolhandJS fingerprint tracking
 *
 * Handles generation and persistence of a unique fingerprint ID via cookies.
 * Uses SameSite=None; Secure for cross-site (iframe) support.
 */

// Cookie configuration
const COOKIE_NAME = 'coolhand_fingerprint';
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * UUID v4 validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a UUID v4 string
 *
 * Uses crypto.randomUUID() when available (modern browsers),
 * falls back to crypto.getRandomValues(), then Math.random() as last resort.
 */
export function generateUUID(): string {
  // Modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers using crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant (8, 9, a, or b) bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Final fallback (Math.random - less secure but functional)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate that a string is a valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex);
    if (key === name) {
      const value = trimmed.slice(equalsIndex + 1);
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

/**
 * Set a cookie with security best practices
 *
 * Uses SameSite=None; Secure for cross-site (iframe) support.
 * Requires HTTPS - returns false on HTTP.
 */
export function setCookie(name: string, value: string, days: number): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const maxAge = days * 24 * 60 * 60; // Convert to seconds
  const isSecure =
    typeof window !== 'undefined' && window.location?.protocol === 'https:';

  // SameSite=None requires Secure flag, which requires HTTPS
  if (!isSecure) {
    console.warn(
      '[CoolhandJS] Fingerprint cookie requires HTTPS for cross-site support'
    );
    return false;
  }

  let cookieString = `${name}=${encodeURIComponent(value)}`;
  cookieString += `; Max-Age=${maxAge}`;
  cookieString += '; Path=/';
  cookieString += '; SameSite=None'; // Required for third-party iframe support
  cookieString += '; Secure'; // Required when SameSite=None

  document.cookie = cookieString;
  return true;
}

/**
 * Check if cookies are supported and enabled
 */
export function isCookieSupported(): boolean {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return navigator.cookieEnabled;
}

/**
 * Get or create a fingerprint ID
 *
 * - If a valid fingerprint cookie exists, returns its value (and refreshes expiration)
 * - If no cookie exists, generates a new UUID and stores it
 * - Returns null if cookies are blocked or HTTPS is required but not available
 *
 * Note: Cookie is refreshed on every call to work around Safari ITP 7-day limit
 */
export function getOrCreateFingerprintId(): string | null {
  // Check if cookies are supported
  if (!isCookieSupported()) {
    return null;
  }

  // Try to get existing fingerprint
  const existing = getCookie(COOKIE_NAME);
  let fingerprintId: string;

  if (existing && isValidUUID(existing)) {
    // Use existing ID but refresh expiration (Safari ITP workaround)
    fingerprintId = existing;
  } else {
    // Generate new fingerprint
    fingerprintId = generateUUID();
  }

  // Always refresh the cookie to extend expiration (Safari ITP limits to 7 days)
  const cookieSet = setCookie(COOKIE_NAME, fingerprintId, COOKIE_MAX_AGE_DAYS);

  if (!cookieSet) {
    // HTTPS required - return null on HTTP
    return null;
  }

  // Verify cookie was set (some browsers may block)
  const verification = getCookie(COOKIE_NAME);
  if (verification === fingerprintId) {
    return fingerprintId;
  }

  // Cookie blocked - return null gracefully
  console.warn(
    '[CoolhandJS] Unable to set fingerprint cookie - cookies may be blocked'
  );
  return null;
}
