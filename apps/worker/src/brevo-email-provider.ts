import type { TransactionalEmail } from '@matiq/backend';
import type { EmailProvider } from './email-provider.js';

export class BrevoEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly senderEmail: string,
    private readonly senderName: string,
    private readonly request: typeof fetch = fetch,
  ) {
    if (!apiKey.trim() || /\s/.test(apiKey)) throw new Error('BREVO_API_KEY_INVALID');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail))
      throw new Error('EMAIL_FROM_ADDRESS_INVALID');
    if (!senderName.trim() || /[\r\n]/.test(senderName)) throw new Error('EMAIL_FROM_NAME_INVALID');
  }

  async send(message: TransactionalEmail, idempotencyKey?: string): Promise<void> {
    if (!idempotencyKey) throw new Error('EMAIL_IDEMPOTENCY_KEY_REQUIRED');
    let response: Response;
    try {
      response = await this.request('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'api-key': this.apiKey,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
          headers: { idempotencyKey },
        }),
      });
    } catch {
      // Never propagate provider/network diagnostics containing credentials or message content.
      throw new Error('BREVO_REQUEST_FAILED');
    }
    if (response.status === 400) {
      const body = await response.json().catch(() => null);
      if (body?.code === 'duplicate_parameter') return;
    }
    if (response.status !== 201) throw new Error(`BREVO_HTTP_${response.status}`);
    const body = await response.json().catch(() => null);
    if (typeof body?.messageId !== 'string' || !body.messageId)
      throw new Error('BREVO_RESPONSE_INVALID');
  }
}
