import { Prisma, type PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { createAccountDeletionHandler } from '../src/privacy.js';
import { parseDeletionLedger, reapplyDeletionLedger } from '../src/deletion-ledger.js';

describe('restored deletion receipt retention', () => {
  it('rejects ambiguous ledger entries before touching the database', async () => {
    const entry = {
      subjectRef: 'subject',
      requestedAt: '2026-09-01T00:00:00Z',
      retainUntil: '2026-10-01T00:00:00Z',
      completedAt: null,
    };
    const valid = {
      version: 2 as const,
      exportedAt: '2026-09-13T00:00:00Z',
      tombstones: [entry],
      schedules: [],
    };
    for (const invalid of [
      { ...valid, tombstones: [entry, entry] },
      { ...valid, tombstones: [{ ...entry, requestedAt: null }] },
      { ...valid, tombstones: [{ ...entry, retainUntil: '2026-08-01T00:00:00Z' }] },
      {
        ...valid,
        schedules: [{ subjectRef: 'subject', executeAt: '2026-10-01', createdAt: '2026-09-13' }],
      },
    ]) {
      const db = { deletionTombstone: { upsert: vi.fn() } } as unknown as PrismaClient;
      await expect(reapplyDeletionLedger(db, invalid as never)).rejects.toThrow('INVALID_LEDGER');
      expect(db.deletionTombstone.upsert).not.toHaveBeenCalled();
    }
  });
  it('accepts legacy ledgers and validates schedule-aware ledgers', () => {
    expect(
      parseDeletionLedger({
        version: 1,
        exportedAt: '2026-09-06T00:00:00.000Z',
        tombstones: [],
      }),
    ).toMatchObject({ version: 1 });
    expect(
      parseDeletionLedger({
        version: 2,
        exportedAt: '2026-09-06T00:00:00.000Z',
        tombstones: [],
        schedules: [
          {
            subjectRef: 'subject-1',
            executeAt: '2026-10-01T00:00:00.000Z',
            createdAt: '2026-09-06T00:00:00.000Z',
          },
        ],
      }),
    ).toMatchObject({ version: 2 });
    expect(() =>
      parseDeletionLedger({
        version: 2,
        exportedAt: '2026-09-06T00:00:00.000Z',
        tombstones: [],
      }),
    ).toThrow('INVALID_LEDGER');
    expect(() =>
      parseDeletionLedger({
        version: 2,
        exportedAt: '2026-09-06T00:00:00.000Z',
        tombstones: [
          {
            subjectRef: 'subject-1',
            requestedAt: '2026-09-01T00:00:00.000Z',
            retainUntil: '2026-10-01T00:00:00.000Z',
          },
        ],
        schedules: [],
      }),
    ).toThrow('INVALID_LEDGER');
  });

  it.each([null, new Date('2025-12-31T23:59:59Z')])(
    'uses completion year and preserves an existing completion: %s',
    async (existingCompletion) => {
      const upsert = vi.fn();
      const auditUpdate = vi.fn();
      const repository = {
        count: vi.fn().mockResolvedValue(0),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      };
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        $executeRaw: vi.fn(),
        ...Object.fromEntries(
          [
            'verifiedWatchInterval',
            'playbackSession',
            'videoWatch',
            'assessmentAttempt',
            'assessment',
            'athleteProfile',
            'trainerProfile',
            'course',
            'video',
            'session',
            'emailVerificationToken',
            'passwordResetToken',
            'mfaRecoveryCode',
            'subscription',
            'user',
            'auditLog',
          ].map((name) => [name, repository]),
        ),
        accountDeletionRequest: {
          findUnique: vi
            .fn()
            .mockResolvedValue(existingCompletion ? { completedAt: existingCompletion } : null),
          upsert: upsert.mockResolvedValue({ id: 'receipt' }),
        },
        auditLog: { create: vi.fn(), updateMany: auditUpdate },
      };
      const db = {
        deletionTombstone: { upsert: vi.fn() },
        user: { findUnique: vi.fn().mockResolvedValue({ id: 'synthetic-user' }) },
        $transaction: vi.fn(async (callback) => callback(tx)),
      } as unknown as PrismaClient;
      const now = new Date('2026-01-01T00:00:00Z');
      await reapplyDeletionLedger(
        db,
        {
          version: 1,
          exportedAt: now.toISOString(),
          tombstones: [
            {
              subjectRef: 'synthetic-subject',
              requestedAt: '2025-12-30T00:00:00Z',
              retainUntil: '2026-02-03T00:00:00Z',
            },
          ],
        },
        now,
      );
      const completedAt = existingCompletion;
      expect(auditUpdate).toHaveBeenCalledExactlyOnceWith({
        where: {
          OR: [
            { actor: 'synthetic-user' },
            { entityId: 'synthetic-user' },
            { actor: 'subject:synthetic-subject' },
          ],
        },
        data: { actor: 'subject:synthetic-subject', entityId: null, metadata: Prisma.DbNull },
      });
      expect(tx.$executeRaw).toHaveBeenCalled();
      const retainUntil = new Date(
        existingCompletion ? '2029-01-01T00:00:00Z' : '2030-01-01T00:00:00Z',
      );
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ completedAt, retainUntil }),
          update: expect.objectContaining({ completedAt, retainUntil }),
        }),
      );
    },
  );
});

describe('account deletion handler', () => {
  function fixture(linked = false, pending = false) {
    const request = { id: 'r', userId: 'u', subjectRef: 's', completedAt: null };
    const repo = { deleteMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() };
    const tx = {
      ...Object.fromEntries(
        [
          'verifiedWatchInterval',
          'playbackSession',
          'videoWatch',
          'assessmentAttempt',
          'assessment',
          'athleteProfile',
          'trainerProfile',
          'course',
          'video',
          'auditLog',
        ].map((key) => [key, repo]),
      ),
      $queryRaw: vi
        .fn()
        .mockImplementation(async (sql: TemplateStringsArray) =>
          sql.join('').includes('FROM "User"') ? [{ deletedAt: new Date() }] : [],
        ),
      $executeRaw: vi.fn(),
      subscription: { count: vi.fn().mockResolvedValue(linked ? 1 : 0) },
      accountDeletionRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const db = {
      accountDeletionRequest: { findUnique: vi.fn().mockResolvedValue(request) },
      subscription: {
        findMany: vi.fn().mockResolvedValue(linked ? [{ providerCustomerId: 'customer' }] : []),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ pending }]),
      $transaction: vi.fn(async (fn) => fn(tx)),
    } as unknown as PrismaClient;
    return { db, tx, repo, payload: { requestId: 'r', userId: 'u' } };
  }

  it('completes local-only erasure once and cleans audit before completion', async () => {
    const { db, tx, repo, payload } = fixture();
    await createAccountDeletionHandler(db)(payload);
    expect(tx.accountDeletionRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: null, completedAt: expect.any(Date) },
      }),
    );
    expect(repo.create).toHaveBeenCalledOnce();
    tx.accountDeletionRequest.updateMany.mockResolvedValue({ count: 0 });
    await createAccountDeletionHandler(db)(payload);
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('erases local data but waits for renewal before calling processors', async () => {
    const { db, tx, repo, payload } = fixture(true, true);
    const eraseAccount = vi.fn();
    await expect(
      createAccountDeletionHandler(db, [{ name: 'fake', eraseAccount }])(payload),
    ).rejects.toThrow('RENEWAL_RECONCILIATION_PENDING');
    expect(repo.deleteMany).toHaveBeenCalled();
    expect(eraseAccount).not.toHaveBeenCalled();
    expect(tx.accountDeletionRequest.updateMany).not.toHaveBeenCalled();
  });

  it('never exposes processor diagnostics in a retryable error', async () => {
    const { db, payload } = fixture(true);
    await expect(
      createAccountDeletionHandler(db, [
        {
          name: 'fake',
          eraseAccount: async () => {
            throw new Error('private@example.invalid secret provider payload');
          },
        },
      ])(payload),
    ).rejects.toThrow('EXTERNAL_DELETION_CONFIRMATION_REQUIRED');
  });

  it('refuses to erase an active account or a newly linked subscription', async () => {
    const { db, tx, repo, payload } = fixture();
    tx.$queryRaw.mockResolvedValueOnce([{ deletedAt: null }]);
    await expect(createAccountDeletionHandler(db)(payload)).rejects.toThrow(
      'ACCOUNT_DELETION_NOT_STARTED',
    );
    expect(repo.deleteMany).not.toHaveBeenCalled();
    tx.subscription.count.mockResolvedValueOnce(1);
    await expect(createAccountDeletionHandler(db)(payload)).rejects.toThrow(
      'EXTERNAL_DELETION_CONFIRMATION_REQUIRED',
    );
    expect(tx.accountDeletionRequest.updateMany).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'requires external confirmation before completion: %s',
    async (configured) => {
      const request = {
        id: 'request-1',
        userId: 'user-1',
        subjectRef: 'subject-1',
        requestedAt: new Date(),
        completedAt: null,
        retainUntil: new Date('2030-01-01'),
      };
      const repositories = {
        $queryRaw: vi
          .fn()
          .mockImplementation(async (sql: TemplateStringsArray) =>
            sql.join('').includes('FROM "User"') ? [{ deletedAt: new Date() }] : [],
          ),
        $executeRaw: vi.fn(),
        subscription: { count: vi.fn().mockResolvedValue(0) },
        verifiedWatchInterval: { deleteMany: vi.fn() },
        playbackSession: { deleteMany: vi.fn() },
        videoWatch: { deleteMany: vi.fn() },
        assessmentAttempt: { deleteMany: vi.fn() },
        assessment: { deleteMany: vi.fn() },
        athleteProfile: { deleteMany: vi.fn() },
        trainerProfile: { deleteMany: vi.fn() },
        course: { updateMany: vi.fn() },
        video: { updateMany: vi.fn() },
        auditLog: { create: vi.fn(), updateMany: vi.fn() },
        accountDeletionRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      };
      const db = {
        $queryRaw: vi.fn().mockResolvedValue([{ pending: false }]),
        accountDeletionRequest: { findUnique: vi.fn().mockResolvedValue(request) },
        subscription: { findMany: vi.fn().mockResolvedValue([{ providerCustomerId: 'cus_1' }]) },
        $transaction: vi.fn(async (value) =>
          typeof value === 'function' ? value(repositories) : Promise.all(value),
        ),
      } as unknown as PrismaClient;
      const processor = {
        name: 'test-provider',
        eraseAccount: vi.fn().mockResolvedValue(undefined),
      };

      const result = createAccountDeletionHandler(
        db,
        configured ? [processor] : [],
      )({
        requestId: request.id,
        userId: request.userId,
      });
      if (!configured) {
        await expect(result).rejects.toThrow('EXTERNAL_DELETION_CONFIRMATION_REQUIRED');
        expect(repositories.accountDeletionRequest.updateMany).not.toHaveBeenCalled();
        expect(processor.eraseAccount).not.toHaveBeenCalled();
        return;
      }
      await expect(result).rejects.toThrow('PROVIDER_LINK_RETENTION_REVIEW_REQUIRED');

      expect(repositories.playbackSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: request.userId },
      });
      expect(repositories.auditLog.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { actor: request.userId },
            { entityId: request.userId },
            { actor: `subject:${request.subjectRef}` },
          ],
        },
        data: { actor: `subject:${request.subjectRef}`, entityId: null, metadata: Prisma.DbNull },
      });
      expect(repositories.course.updateMany).toHaveBeenCalledWith({
        where: { trainerId: request.userId },
        data: { trainerId: null },
      });
      expect(processor.eraseAccount).toHaveBeenCalledWith({
        subjectRef: request.subjectRef,
        providerCustomerIds: ['cus_1'],
      });
      expect(repositories.accountDeletionRequest.updateMany).not.toHaveBeenCalled();
    },
  );

  it('is idempotent after completion', async () => {
    const db = {
      accountDeletionRequest: {
        findUnique: vi.fn().mockResolvedValue({ completedAt: new Date() }),
      },
      subscription: { findMany: vi.fn() },
    } as unknown as PrismaClient;
    await expect(
      createAccountDeletionHandler(db)({ requestId: 'request-1', userId: 'user-1' }),
    ).resolves.toBeUndefined();
  });
});
