import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'arena_solar_organizer';
const SESSION_MESSAGE = 'arena-solar-organizer-session-v1';

function configuredHash() {
  const value = process.env.ORGANIZER_SETUP_HASH?.trim().toLowerCase();
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function sessionToken() {
  const hash = configuredHash();
  if (!hash) throw new Error('Área do organizador não configurada.');
  return createHmac('sha256', hash).update(SESSION_MESSAGE).digest('hex');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function organizerConfigured() {
  return configuredHash() !== null;
}

export function verifyOrganizerKey(key: string) {
  const expected = configuredHash();
  if (!expected) return false;
  const actual = createHash('sha256').update(key).digest('hex');
  return safeEqual(actual, expected);
}

export async function isOrganizer() {
  if (!organizerConfigured()) return false;
  const jar = await cookies();
  const current = jar.get(COOKIE_NAME)?.value;
  return !!current && safeEqual(current, sessionToken());
}

export function organizerCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${sessionToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure}`;
}
