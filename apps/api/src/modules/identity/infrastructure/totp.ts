import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function createTotpSecret() {
  let bits = '';
  for (const byte of randomBytes(20)) bits += byte.toString(2).padStart(8, '0');
  return (bits.match(/.{1,5}/g) ?? [])
    .map((chunk) => alphabet[Number.parseInt(chunk.padEnd(5, '0'), 2)])
    .join('');
}

function decodeBase32(value: string) {
  let bits = '';
  for (const char of value.replace(/=|\s/g, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid TOTP secret');
    bits += index.toString(2).padStart(5, '0');
  }
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
}

export function verifyTotp(secret: string, code: string, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  for (const offset of [-1, 0, 1]) {
    const expected = createTotpCode(secret, timestamp + offset * 30_000);
    if (timingSafeEqual(Buffer.from(code), Buffer.from(expected))) return true;
  }
  return false;
}

export function createTotpCode(secret: string, timestamp = Date.now()) {
  const input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(Math.floor(timestamp / 30_000)));
  const digest = createHmac('sha1', decodeBase32(secret)).update(input).digest();
  const start = digest.at(-1)! & 15;
  return String((digest.readUInt32BE(start) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

function encryptionKey() {
  const value = process.env.MFA_ENCRYPTION_KEY;
  if (!value) throw new Error('MFA_ENCRYPTION_KEY is required for MFA enrollment');
  return createHash('sha256').update(value).digest();
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function decryptTotpSecret(value: string) {
  const data = Buffer.from(value, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}
