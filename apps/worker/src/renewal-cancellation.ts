import type { PrismaClient } from '@prisma/client';
import {
  PostgresRenewalStore,
  RenewalCancellationService,
  type RenewalProvider,
} from '@matiq/backend';

export async function processPendingRenewalCancellations(
  db: PrismaClient,
  provider?: RenewalProvider,
) {
  const store = new PostgresRenewalStore(db);
  const service = new RenewalCancellationService(store, provider);
  let confirmed = 0;
  let pending = 0;
  for (const id of await store.pending()) {
    try {
      if ((await service.process(id)) === 'CONFIRMED') confirmed++;
    } catch {
      pending++;
    }
  }
  await store.purgeCompleted();
  return { confirmed, pending, reviewRequired: await store.reviewRequired() };
}
