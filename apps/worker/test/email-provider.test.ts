import { createTransactionalEmail, encryptTransactionalEmail } from '@matiq/backend';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configuredEmailProvider,
  createEmailHandler,
  type EmailProvider,
} from '../src/email-provider.js';
import { BrevoEmailProvider } from '../src/brevo-email-provider.js';

describe('email.send.v1 handler', () => {
  it('decrypts and validates a German verification message', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const provider: EmailProvider = { send };
    const message = createTransactionalEmail(
      'VERIFY_EMAIL',
      'athlete@example.de',
      'secret-token',
      'https://matiq.example',
    );

    await createEmailHandler(provider)(encryptTransactionalEmail(message));

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'VERIFY_EMAIL',
        to: 'athlete@example.de',
        subject: 'Bestätige deine E-Mail-Adresse bei MATIQ',
      }),
      expect.stringMatching(/^[a-f0-9]{32}$/),
    );
  });

  it('rejects a tampered envelope before calling the provider', async () => {
    const send = vi.fn();
    const provider: EmailProvider = { send };
    const envelope = encryptTransactionalEmail(
      createTransactionalEmail('RESET_PASSWORD', 'athlete@example.de', 'secret-token'),
    );

    await expect(
      createEmailHandler(provider)({ ...envelope, ciphertext: `${envelope.ciphertext}tampered` }),
    ).rejects.toThrow('INVALID_EMAIL_ENVELOPE');
    expect(send).not.toHaveBeenCalled();
  });
});

describe('Brevo transactional delivery', () => {
  afterEach(() => vi.unstubAllEnvs());
  const message = createTransactionalEmail('VERIFY_EMAIL', 'athlete@example.de', 'private-token');
  const provider = (request: typeof fetch) =>
    new BrevoEmailProvider('test-api-key', 'sender@example.de', 'MATIQ', request);

  it('sends the existing template to the fixed HTTPS endpoint with credentials and timeout', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ messageId: 'accepted' }), { status: 201 }));
    await provider(request).send(message, 'stable-key');
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options).toMatchObject({
      method: 'POST',
      redirect: 'error',
      headers: { 'api-key': 'test-api-key' },
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options?.body as string)).toEqual({
      sender: { name: 'MATIQ', email: 'sender@example.de' },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      headers: { idempotencyKey: 'stable-key' },
    });
  });

  it('uses the same opaque key for retries and a different key for a new envelope', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const handler = createEmailHandler({ send });
    const envelope = encryptTransactionalEmail(message);
    await handler(envelope);
    await handler(envelope);
    await handler(encryptTransactionalEmail(message));
    expect(send.mock.calls[0]![1]).toBe(send.mock.calls[1]![1]);
    expect(send.mock.calls[0]![1]).not.toBe(send.mock.calls[2]![1]);
  });

  it.each([400, 401, 403, 429, 500])(
    'returns only a safe error code for HTTP %s',
    async (status) => {
      const request = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ message: 'private-token test-api-key athlete@example.de' }),
            { status },
          ),
        );
      await expect(provider(request).send(message, 'stable-key')).rejects.toThrow(
        `BREVO_HTTP_${status}`,
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it('accepts an acknowledged duplicate without another send', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 'duplicate_parameter' }), { status: 400 }),
      );
    await expect(provider(request).send(message, 'stable-key')).resolves.toBeUndefined();
  });

  it('sanitizes network/timeout errors', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('test-api-key private-token'));
    await expect(provider(request).send(message, 'stable-key')).rejects.toThrow(
      'BREVO_REQUEST_FAILED',
    );
  });

  it.each(['{}', 'not-json'])('rejects malformed success responses: %s', async (body) => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 201 }));
    await expect(provider(request).send(message, 'stable-key')).rejects.toThrow(
      'BREVO_RESPONSE_INVALID',
    );
  });

  it('fails before sending when configuration or the idempotency key is missing', async () => {
    vi.stubEnv('EMAIL_PROVIDER', 'brevo');
    vi.stubEnv('BREVO_API_KEY', '');
    expect(() => configuredEmailProvider()).toThrow('BREVO_API_KEY_INVALID');
    expect(() => new BrevoEmailProvider('key', 'invalid', 'MATIQ')).toThrow(
      'EMAIL_FROM_ADDRESS_INVALID',
    );
    const request = vi.fn<typeof fetch>();
    await expect(provider(request).send(message)).rejects.toThrow('EMAIL_IDEMPOTENCY_KEY_REQUIRED');
    expect(request).not.toHaveBeenCalled();
    vi.stubEnv('BREVO_API_KEY', 'key');
    vi.stubEnv('EMAIL_FROM_ADDRESS', 'sender@example.de');
    expect(configuredEmailProvider()).toBeInstanceOf(BrevoEmailProvider);
  });
});
