import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type TransactionalEmailKind = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

export type TransactionalEmail = {
  kind: TransactionalEmailKind;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EncryptedEmailEnvelope = {
  version: 1;
  iv: string;
  ciphertext: string;
  authTag: string;
};

export function validateEmailEncryptionConfiguration(
  encodedKey = process.env.EMAIL_ENCRYPTION_KEY,
) {
  encryptionKey(encodedKey);
}

export function createTransactionalEmail(
  kind: TransactionalEmailKind,
  to: string,
  token: string,
  webUrl = 'http://localhost:3000',
): TransactionalEmail {
  const reset = kind === 'RESET_PASSWORD';
  const url = `${webUrl}/${reset ? 'reset-password' : 'verify-email'}?token=${encodeURIComponent(token)}`;
  return {
    kind,
    to,
    subject: reset
      ? 'Setze dein MATIQ-Passwort zurück'
      : 'Bestätige deine E-Mail-Adresse bei MATIQ',
    text: reset
      ? `Setze dein Passwort zurück: ${url}\n\nDer Link ist 60 Minuten gültig.`
      : `Bestätige deine E-Mail-Adresse: ${url}\n\nDer Link ist 24 Stunden gültig.`,
    html: template(
      reset ? 'Passwort zurücksetzen' : 'E-Mail-Adresse bestätigen',
      reset
        ? 'Du hast eine Änderung deines MATIQ-Passworts angefordert.'
        : 'Bestätige deine E-Mail-Adresse, um dein MATIQ-Profil einzurichten.',
      reset ? 'Neues Passwort festlegen' : 'E-Mail bestätigen',
      url,
      reset
        ? 'Der Link ist 60 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail.'
        : 'Der Link ist 24 Stunden gültig.',
    ),
  };
}

export function encryptTransactionalEmail(
  message: TransactionalEmail,
  encodedKey = process.env.EMAIL_ENCRYPTION_KEY,
): EncryptedEmailEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(message), 'utf8'),
    cipher.final(),
  ]);
  return {
    version: 1,
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptTransactionalEmail(
  envelope: EncryptedEmailEnvelope,
  encodedKey = process.env.EMAIL_ENCRYPTION_KEY,
): TransactionalEmail {
  if (!isEnvelope(envelope)) throw new Error('INVALID_EMAIL_ENVELOPE');
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(encodedKey),
      Buffer.from(envelope.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
    const value = JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8'),
    );
    if (!isMessage(value)) throw new Error('INVALID_EMAIL_MESSAGE');
    return value;
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_ENCRYPTION_KEY_INVALID') throw error;
    throw new Error('INVALID_EMAIL_ENVELOPE');
  }
}

function encryptionKey(value?: string) {
  if (!value && process.env.NODE_ENV !== 'production') {
    return createHash('sha256').update('matiq-local-email-key').digest();
  }
  const key = value ? Buffer.from(value, 'base64') : Buffer.alloc(0);
  if (key.length !== 32) throw new Error('EMAIL_ENCRYPTION_KEY_INVALID');
  return key;
}

function isEnvelope(value: unknown): value is EncryptedEmailEnvelope {
  const item = value as Partial<EncryptedEmailEnvelope> | null;
  return Boolean(
    item &&
      item.version === 1 &&
      typeof item.iv === 'string' &&
      typeof item.ciphertext === 'string' &&
      typeof item.authTag === 'string',
  );
}

function isMessage(value: unknown): value is TransactionalEmail {
  const item = value as Partial<TransactionalEmail> | null;
  return Boolean(
    item &&
      (item.kind === 'VERIFY_EMAIL' || item.kind === 'RESET_PASSWORD') &&
      typeof item.to === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.to) &&
      typeof item.subject === 'string' &&
      item.subject.length <= 200 &&
      typeof item.text === 'string' &&
      typeof item.html === 'string',
  );
}

function template(title: string, intro: string, label: string, url: string, footer: string) {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#f3f1ec;font-family:Arial,sans-serif;color:#111418"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #d8d5ce;padding:40px"><strong style="font-size:20px">MATIQ</strong><h1 style="font-size:32px">${title}</h1><p>${intro}</p><p style="margin:32px 0"><a href="${url}" style="background:#111418;color:#fff;text-decoration:none;padding:14px 20px;font-weight:700">${label}</a></p><p style="color:#666;font-size:13px">${footer}</p></div></body></html>`;
}
