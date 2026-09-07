import type { PrismaClient } from '@prisma/client';
import {
  accountExportExpiresAt,
  buildAccountExport,
  encryptAccountExport,
  type AccountExportDatabase,
} from '@matiq/backend';
import type { EventHandler } from './types.js';

type ExportPayload = { requestId: string; userId: string };

function parsePayload(value: unknown): ExportPayload {
  if (!value || typeof value !== 'object') throw new Error('ACCOUNT_EXPORT_PAYLOAD_INVALID');
  const payload = value as Record<string, unknown>;
  if (typeof payload.requestId !== 'string' || typeof payload.userId !== 'string')
    throw new Error('ACCOUNT_EXPORT_PAYLOAD_INVALID');
  return { requestId: payload.requestId, userId: payload.userId };
}

export function createAccountExportHandler(db: PrismaClient): EventHandler {
  return async (rawPayload) => {
    const payload = parsePayload(rawPayload);
    const request = await db.accountExportRequest.findUnique({ where: { id: payload.requestId } });
    if (!request || request.status !== 'PENDING') return;
    if (request.userId !== payload.userId) throw new Error('ACCOUNT_EXPORT_SUBJECT_MISMATCH');
    const document = await buildAccountExport(
      db as unknown as AccountExportDatabase,
      payload.userId,
    );
    const encrypted = encryptAccountExport(document);
    const completedAt = new Date();
    const result = await db.accountExportRequest.updateMany({
      where: { id: request.id, userId: payload.userId, status: 'PENDING' },
      data: {
        ...encrypted,
        status: 'READY',
        completedAt,
        expiresAt: accountExportExpiresAt(completedAt),
        failureCode: null,
      },
    });
    if (result.count) {
      await db.auditLog.create({
        data: {
          actor: payload.userId,
          action: 'ACCOUNT_EXPORT_READY',
          entity: 'AccountExportRequest',
          entityId: request.id,
        },
      });
    }
  };
}
