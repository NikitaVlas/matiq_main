import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

type Message = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class EmailService {
  async sendVerification(to: string, token: string) {
    const url = `${process.env.WEB_URL ?? 'http://localhost:3000'}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Bestätige deine E-Mail-Adresse bei MATIQ',
      text: `Bestätige deine E-Mail-Adresse: ${url}\n\nDer Link ist 24 Stunden gültig.`,
      html: this.template(
        'E-Mail-Adresse bestätigen',
        'Bestätige deine E-Mail-Adresse, um dein MATIQ-Profil einzurichten.',
        'E-Mail bestätigen',
        url,
        'Der Link ist 24 Stunden gültig.',
      ),
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const url = `${process.env.WEB_URL ?? 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: 'Setze dein MATIQ-Passwort zurück',
      text: `Setze dein Passwort zurück: ${url}\n\nDer Link ist 60 Minuten gültig.`,
      html: this.template(
        'Passwort zurücksetzen',
        'Du hast eine Änderung deines MATIQ-Passworts angefordert.',
        'Neues Passwort festlegen',
        url,
        'Der Link ist 60 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail.',
      ),
    });
  }

  private async send(message: Message) {
    const provider = process.env.EMAIL_PROVIDER ?? 'console';
    if (provider === 'console') {
      console.info(`[email:${message.to}] ${message.subject}\n${message.text}`);
      return;
    }
    if (provider !== 'gmail') throw new ServiceUnavailableException('EMAIL_PROVIDER_INVALID');
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) throw new ServiceUnavailableException('EMAIL_NOT_CONFIGURED');
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transport.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME ?? 'MATIQ'}" <${process.env.EMAIL_FROM_ADDRESS ?? user}>`,
      ...message,
    });
  }

  private template(title: string, intro: string, label: string, url: string, footer: string) {
    return `<!doctype html><html lang="de"><body style="margin:0;background:#f3f1ec;font-family:Arial,sans-serif;color:#111418"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #d8d5ce;padding:40px"><strong style="font-size:20px">MATIQ</strong><h1 style="font-size:32px">${title}</h1><p>${intro}</p><p style="margin:32px 0"><a href="${url}" style="background:#111418;color:#fff;text-decoration:none;padding:14px 20px;font-weight:700">${label}</a></p><p style="color:#666;font-size:13px">${footer}</p></div></body></html>`;
  }
}
