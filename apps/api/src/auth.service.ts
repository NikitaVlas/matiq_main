import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { validatePassword } from '@matiq/backend';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { Database } from './database';

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async register(emailInput: string, password: string) {
    const errors = validatePassword(password);
    if (errors.length) throw new BadRequestException({ code: 'INVALID_PASSWORD', errors });
    const email = emailInput.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } }))
      throw new ConflictException('EMAIL_EXISTS');
    const rawToken = randomBytes(32).toString('base64url');
    const user = await this.db.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        emailVerificationTokens: {
          create: {
            tokenHash: tokenHash(rawToken),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    if (process.env.EMAIL_PROVIDER === 'console') {
      console.info(
        `[email:verification] ${process.env.WEB_URL ?? 'http://localhost:3000'}/verify-email?token=${rawToken}`,
      );
    }
    return {
      userId: user.id,
      verificationRequired: true,
      developmentToken: process.env.NODE_ENV === 'production' ? undefined : rawToken,
    };
  }

  async verifyEmail(rawToken: string) {
    const record = await this.db.emailVerificationToken.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date())
      throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    const sessionToken = randomBytes(32).toString('base64url');
    const [, session] = await this.db.$transaction([
      this.db.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date(), user: { update: { emailVerifiedAt: new Date() } } },
      }),
      this.db.session.create({
        data: {
          userId: record.userId,
          tokenHash: tokenHash(sessionToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    return { sessionToken, sessionId: session.id };
  }

  async userForToken(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException();
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
      include: { user: { include: { athleteProfile: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.emailVerifiedAt)
      throw new UnauthorizedException();
    return session.user;
  }
}
