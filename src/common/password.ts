import * as crypto from 'crypto';

const ITERATIONS = 120_000;
const KEYLEN = 32;
const DIGEST = 'sha256';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString('hex');

  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;

    const [algo, iterStr, salt, hash] = parts;
    if (algo !== 'pbkdf2') return false;

    const iters = Number(iterStr);
    if (!Number.isFinite(iters) || iters <= 0) return false;

    const calc = crypto
      .pbkdf2Sync(password, salt, iters, KEYLEN, DIGEST)
      .toString('hex');

    return crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}
