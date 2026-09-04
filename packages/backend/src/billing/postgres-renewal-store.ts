import { randomUUID } from 'node:crypto';
import type { RenewalOperation, RenewalOperationStore } from './renewal-cancellation.js';

/** Compatible with a Prisma client/transaction, without coupling application code to Prisma. */
export interface RenewalSqlClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

export class PostgresRenewalStore implements RenewalOperationStore {
  constructor(private readonly db: RenewalSqlClient) {}

  /** Caller supplies an opaque, stable operation ID and authenticated owner. */
  async request(id: string, subscriptionId: string, userId: string): Promise<void> {
    if (![id, subscriptionId, userId].every((value) => value && value.length <= 200)) {
      throw new Error('INVALID_RENEWAL_OPERATION');
    }
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      INSERT INTO "RenewalCancellationOperation" ("id", "subscriptionId")
      SELECT ${id}, "id" FROM "Subscription" WHERE "id" = ${subscriptionId} AND "userId" = ${userId}
      ON CONFLICT ("id") DO UPDATE SET "id" = EXCLUDED."id"
      WHERE "RenewalCancellationOperation"."subscriptionId" = EXCLUDED."subscriptionId"
      RETURNING "id"`;
    if (!rows.length) throw new Error('RENEWAL_OPERATION_NOT_AVAILABLE');
  }

  async pending(): Promise<string[]> {
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "RenewalCancellationOperation"
      WHERE ("status" = 'PENDING' AND "availableAt" <= CURRENT_TIMESTAMP AND "attempts" < 12)
         OR ("status" = 'PROCESSING' AND "leaseUntil" <= CURRENT_TIMESTAMP)
      ORDER BY "availableAt", "id" LIMIT 25`;
    return rows.map(({ id }) => id);
  }

  async claim(id: string): Promise<RenewalOperation | null> {
    const token = randomUUID();
    const rows = await this.db.$queryRaw<RenewalOperation[]>`
      UPDATE "RenewalCancellationOperation" AS o
      SET "status" = 'PROCESSING', "leaseToken" = ${token},
          "leaseUntil" = CURRENT_TIMESTAMP + INTERVAL '2 minutes', "attempts" = "attempts" + 1
      FROM "Subscription" AS s
      WHERE o."id" = ${id} AND s."id" = o."subscriptionId"
        AND ((o."status" = 'PENDING' AND o."availableAt" <= CURRENT_TIMESTAMP AND o."attempts" < 12)
          OR (o."status" = 'PROCESSING' AND o."leaseUntil" <= CURRENT_TIMESTAMP))
      RETURNING o."id", o."subscriptionId", o."leaseToken", s."providerSubscriptionId"`;
    return rows[0] ?? null;
  }

  async confirm(operation: RenewalOperation): Promise<boolean> {
    const rows = await this.db.$queryRaw<{ id: string }[]>`
      WITH target AS MATERIALIZED (
        SELECT "id" FROM "Subscription" WHERE "id" = ${operation.subscriptionId}
          AND "providerSubscriptionId" IS NOT DISTINCT FROM ${operation.providerSubscriptionId}
        FOR UPDATE
      ), confirmed AS (
        UPDATE "RenewalCancellationOperation" AS o SET "status" = 'CONFIRMED',
          "confirmedAt" = CURRENT_TIMESTAMP, "leaseToken" = NULL, "leaseUntil" = NULL, "lastError" = NULL
        WHERE o."id" = ${operation.id} AND o."status" = 'PROCESSING'
          AND o."leaseToken" = ${operation.leaseToken} AND o."leaseUntil" > CURRENT_TIMESTAMP
          AND EXISTS (SELECT 1 FROM target s WHERE s."id" = o."subscriptionId")
        RETURNING o."id", o."subscriptionId"
      ), updated AS (
        UPDATE "Subscription" AS s SET "cancelAtPeriodEnd" = TRUE, "updatedAt" = CURRENT_TIMESTAMP
        FROM confirmed c WHERE s."id" = c."subscriptionId" RETURNING s."id"
      ) SELECT "id" FROM confirmed`;
    return rows.length === 1;
  }

  async retry(operation: RenewalOperation): Promise<void> {
    await this.db.$executeRaw`
      UPDATE "RenewalCancellationOperation" SET "status" = 'PENDING', "leaseToken" = NULL,
        "leaseUntil" = NULL, "availableAt" = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
        "lastError" = CASE WHEN "attempts" >= 12 THEN 'RENEWAL_REVIEW_REQUIRED' ELSE 'RENEWAL_RECONCILIATION_PENDING' END
      WHERE "id" = ${operation.id} AND "status" = 'PROCESSING' AND "leaseToken" = ${operation.leaseToken}`;
  }

  async purgeCompleted(): Promise<number> {
    return this.db.$executeRaw`DELETE FROM "RenewalCancellationOperation"
      WHERE "status" = 'CONFIRMED' AND "confirmedAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'`;
  }

  async reviewRequired(): Promise<number> {
    const rows = await this.db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "RenewalCancellationOperation" o
      WHERE o."status" <> 'CONFIRMED' AND (o."attempts" >= 12
        OR NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."id" = o."subscriptionId"))`;
    return Number(rows[0]?.count ?? 0);
  }
}
