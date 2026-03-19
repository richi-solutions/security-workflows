/**
 * @fileoverview Cookie-based storage adapter for Supabase Auth.
 *
 * Replaces localStorage with domain-scoped cookies so that the Supabase
 * session is shared across all *.richi.solutions subdomains. This enables
 * single sign-on: login on richi.solutions is instantly visible on
 * ventura.richi.solutions, media.richi.solutions, and any future service.
 *
 * Usage:
 *   import { cookieStorage } from '@/lib/cookie-storage';
 *   createClient(url, key, { auth: { storage: cookieStorage } });
 *
 * @module lib/cookie-storage
 */

const COOKIE_DOMAIN = import.meta.env.PROD ? '.richi.solutions' : undefined;
const MAX_AGE = 100 * 365 * 24 * 60 * 60; // ~100 years (Supabase controls actual token validity)
const CHUNK_SIZE = 3500; // Stay under 4KB browser cookie limit per chunk

function parseCookies(): Record<string, string> {
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .reduce((acc, pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return acc;
      const key = decodeURIComponent(pair.slice(0, idx));
      const value = decodeURIComponent(pair.slice(idx + 1));
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
}

function setCookie(name: string, value: string, maxAge: number): void {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=/`,
    `max-age=${maxAge}`,
    `SameSite=Lax`,
  ];
  if (COOKIE_DOMAIN) parts.push(`domain=${COOKIE_DOMAIN}`);
  if (import.meta.env.PROD) parts.push('Secure');
  document.cookie = parts.join('; ');
}

function deleteCookie(name: string): void {
  const parts = [
    `${encodeURIComponent(name)}=`,
    `path=/`,
    `max-age=0`,
  ];
  if (COOKIE_DOMAIN) parts.push(`domain=${COOKIE_DOMAIN}`);
  document.cookie = parts.join('; ');
}

/**
 * Supabase-compatible storage adapter using domain-scoped cookies.
 *
 * Implements chunking: values larger than CHUNK_SIZE are split across
 * multiple cookies (key.0, key.1, ...) to stay under the 4KB browser limit.
 */
export const cookieStorage = {
  getItem(key: string): string | null {
    const cookies = parseCookies();

    // Try single cookie first
    if (cookies[key] !== undefined) {
      return cookies[key];
    }

    // Try chunked cookies
    const chunks: string[] = [];
    let i = 0;
    while (cookies[`${key}.${i}`] !== undefined) {
      chunks.push(cookies[`${key}.${i}`]);
      i++;
    }
    return chunks.length > 0 ? chunks.join('') : null;
  },

  setItem(key: string, value: string): void {
    // Clean up any existing chunks first
    this.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      // Fits in a single cookie
      setCookie(key, value, MAX_AGE);
    } else {
      // Split into chunks
      let i = 0;
      for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
        setCookie(`${key}.${i}`, value.slice(offset, offset + CHUNK_SIZE), MAX_AGE);
        i++;
      }
    }
  },

  removeItem(key: string): void {
    // Delete single cookie
    deleteCookie(key);

    // Delete any chunks
    const cookies = parseCookies();
    let i = 0;
    while (cookies[`${key}.${i}`] !== undefined) {
      deleteCookie(`${key}.${i}`);
      i++;
    }
  },
};
