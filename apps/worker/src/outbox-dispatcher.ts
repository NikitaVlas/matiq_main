import type { OutboxEvent, PrismaClient } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { WorkerEvent } from './types.js';

const safeError = (error: unknown) =>
  (error instanceof Error ? error.message : 'Unknown publish error').slice(0, 500);

export class OutboxDispatcher {
  constructor(
    private readonly db: PrismaClient,
    private readonly queue: Pick<Queue<WorkerEvent>, 'add'>,
    private readonly batchSize = 25,
  ) {}

  async dispatchBatch() {
    const events = await this.db.$transaction(
      (tx) =>
        tx.$queryRaw<OutboxEvent[]>`
        SELECT * FROM "OutboxEvent"
        WHERE "status" = 'PENDING' AND "availableAt" <= NOW()
        ORDER BY "createdAt" ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      `,
    );
    for (const event of events) await this.publish(event);
    return events.length;
  }

  private async publish(event: OutboxEvent) {
    try {
      await this.queue.add(
        event.topic,
        { outboxEventId: event.id, topic: event.topic, payload: event.payload },
        {
          jobId: event.id,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: { age: 86_400 },
          removeOnFail: false,
        },
      );
      await this.db.outboxEvent.updateMany({
        where: { id: event.id, status: 'PENDING' },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishAttempts: { increment: 1 },
          lastError: null,
        },
      });
      console.info(
        JSON.stringify({ message: 'outbox_published', eventId: event.id, topic: event.topic }),
      );
    } catch (error) {
      await this.db.outboxEvent.updateMany({
        where: { id: event.id, status: 'PENDING' },
        data: {
          publishAttempts: { increment: 1 },
          lastError: safeError(error),
          availableAt: new Date(Date.now() + 30_000),
        },
      });
      console.error(
        JSON.stringify({ message: 'outbox_publish_failed', eventId: event.id, topic: event.topic }),
      );
    }
  }
}
