import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'arena_solar_organizer';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getPassword() {
  return process.env.ORGANIZER_PASSWORD?.trim() || '';
}

function getLegacyHash() {
  const value = process.env.ORGANIZER_SETUP_HASH?.trim().toLowerCase() || '';
  return /^[a-f0-9]{64}$/.test(value) ? value : '';
}

function getSessionSecret() {
  return getPassword() || getLegacyHash();
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function organizerConfigured() {
  return Boolean(getSessionSecret());
}

export function verifyOrganizerKey(password: string) {
  const candidate = password.trim();
  const plain = getPassword();
  if (plain && safeEqual(candidate, plain)) return true;

  const legacyHash = getLegacyHash();
  if (!legacyHash) return false;

  const candidateHash = createHash('sha256').update(candidate).digest('hex');
  return safeEqual(candidateHash, legacyHash);
}

export async function isOrganizer() {
  const secret = getSessionSecret();
  if (!secret) return false;

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expiresText, nonce, receivedSignature] = parts;
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000) || !nonce) {
    return false;
  }

  const expectedSignature = sign(`${expiresText}.${nonce}`, secret);
  return safeEqual(receivedSignature, expectedSignature);
}

export function clearOrganizerCookie() {
  const secure = process.env.NODE_ENV === 'development' ? '' : '; Secure';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function organizerCookie() {
  const secret = getSessionSecret();
  if (!secret) throw new Error('Senha do organizador não configurada.');

  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(18).toString('base64url');
  const payload = `${expires}.${nonce}`;
  const signature = sign(payload, secret);
  const token = `${payload}.${signature}`;
  const secure = process.env.NODE_ENV === 'development' ? '' : '; Secure';

  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}
