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
import { Database } from '../../../shared/infrastructure/database';
import { EmailService } from '../infrastructure/email.service';
import { RateLimitService } from '../../../shared/infrastructure/rate-limit.service';

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const reauthenticationWindowMs = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  async register(emailInput: string, password: string) {
    const errors = validatePassword(password);
    if (errors.length) throw new BadRequestException({ code: 'INVALID_PASSWORD', errors });
    const email = emailInput.trim().toLowerCase();
    this.rateLimit.check(`register:${email}`, 5, 60 * 60 * 1000);
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
    await this.email.sendVerification(email, rawToken);
    return {
      userId: user.id,
      verificationRequired: true,
      developmentToken: process.env.NODE_ENV === 'production' ? undefined : rawToken,
    };
  }

  async resendVerification(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    this.rateLimit.check(`resend:${email}`, 3, 60 * 60 * 1000);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) return { accepted: true };
    const rawToken = randomBytes(32).toString('base64url');
    await this.db.$transaction([
      this.db.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.db.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(rawToken),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    await this.email.sendVerification(email, rawToken);
    return {
      accepted: true,
      developmentToken: process.env.NODE_ENV === 'production' ? undefined : rawToken,
    };
  }

  async login(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();
    this.rateLimit.check(`login:${email}`, 10, 15 * 60 * 1000);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    if (!user.emailVerifiedAt) throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
    return this.createSession(user.id);
  }

  async requestPasswordReset(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    this.rateLimit.check(`reset:${email}`, 3, 60 * 60 * 1000);
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) return { accepted: true };
    const rawToken = randomBytes(32).toString('base64url');
    await this.db.$transaction([
      this.db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);
    await this.email.sendPasswordReset(email, rawToken);
    return {
      accepted: true,
      developmentToken: process.env.NODE_ENV === 'production' ? undefined : rawToken,
    };
  }

  async resetPassword(rawToken: string, password: string) {
    const errors = validatePassword(password);
    if (errors.length) throw new BadRequestException({ code: 'INVALID_PASSWORD', errors });
    const record = await this.db.passwordResetToken.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date())
      throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    await this.db.$transaction([
      this.db.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      }),
      this.db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.db.session.deleteMany({ where: { userId: record.userId } }),
    ]);
    return { changed: true };
  }

  async logout(rawToken?: string) {
    if (rawToken) await this.db.session.deleteMany({ where: { tokenHash: tokenHash(rawToken) } });
    return { loggedOut: true };
  }

  async logoutAll(userId: string) {
    await this.db.session.deleteMany({ where: { userId } });
    return { loggedOut: true };
  }

  async sessions(userId: string, currentSessionId: string) {
    const sessions = await this.db.session.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, createdAt: true, lastSeenAt: true, reauthenticatedAt: true },
    });
    return sessions.map((session) => ({ ...session, current: session.id === currentSessionId }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.db.session.deleteMany({ where: { id: sessionId, userId } });
    if (!result.count) throw new BadRequestException('SESSION_NOT_FOUND');
    return { revoked: true };
  }

  async reauthenticate(userId: string, sessionId: string, password: string) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    await this.db.session.update({
      where: { id: sessionId },
      data: { reauthenticatedAt: new Date() },
    });
    return { reauthenticated: true };
  }

  async changePassword(userId: string, currentPassword: string, password: string) {
    const errors = validatePassword(password);
    if (errors.length) throw new BadRequestException({ code: 'INVALID_PASSWORD', errors });
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      }),
      this.db.session.deleteMany({ where: { userId } }),
    ]);
    return this.createSession(userId);
  }

  async exportAccount(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        athleteProfile: { include: { roadmapItems: true } },
        assessment: { include: { responses: true, scores: true } },
        subscriptions: true,
        videoWatches: true,
      },
    });
    return {
      exportedAt: new Date().toISOString(),
      account: { email: user.email, role: user.role, createdAt: user.createdAt },
      athleteProfile: user.athleteProfile,
      assessment: user.assessment,
      subscriptions: user.subscriptions,
      videoWatches: user.videoWatches,
    };
  }

  async requestAccountDeletion(userId: string, reauthenticatedAt: Date | null) {
    if (!reauthenticatedAt || reauthenticatedAt.getTime() < Date.now() - reauthenticationWindowMs)
      throw new UnauthorizedException('REAUTHENTICATION_REQUIRED');
    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.accountDeletionRequest.upsert({ where: { userId }, create: { userId }, update: {} });
      await tx.auditLog.create({
        data: { actor: userId, action: 'ACCOUNT_DELETE', entity: 'User', entityId: userId },
      });
      await tx.session.deleteMany({ where: { userId } });
      await tx.videoWatch.deleteMany({ where: { userId } });
      await tx.assessment.deleteMany({ where: { userId } });
      await tx.athleteProfile.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          passwordHash: await bcrypt.hash(randomBytes(32).toString('base64url'), 12),
          emailVerifiedAt: null,
          deletionRequestedAt: now,
          deletedAt: now,
        },
      });
      await tx.accountDeletionRequest.update({ where: { userId }, data: { completedAt: now } });
    });
    return { accepted: true };
  }

  async verifyEmail(rawToken: string) {
    const record = await this.db.emailVerificationToken.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date())
      throw new BadRequestException('INVALID_OR_EXPIRED_TOKEN');
    const [, result] = await this.db.$transaction([
      this.db.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date(), user: { update: { emailVerifiedAt: new Date() } } },
      }),
      this.db.user.findUniqueOrThrow({ where: { id: record.userId } }),
    ]);
    return this.createSession(result.id);
  }

  private async createSession(userId: string) {
    const sessionToken = randomBytes(32).toString('base64url');
    const session = await this.db.session.create({
      data: {
        userId,
        tokenHash: tokenHash(sessionToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { sessionToken, sessionId: session.id };
  }

  async sessionForToken(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException();
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
      include: { user: { include: { athleteProfile: true } } },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.emailVerifiedAt || session.user.deletedAt)
      throw new UnauthorizedException();
    await this.db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    return session;
  }

  async userForToken(rawToken?: string) {
    return (await this.sessionForToken(rawToken)).user;
  }
}
