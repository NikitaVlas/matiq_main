import { Prisma, type InboxJob, type PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';
import type { HandlerRegistry, WorkerEvent } from './types.js';

const safeError = (error: unknown) =>
  (error instanceof Error ? error.message : 'Unknown processing error').slice(0, 500);

export class IdempotentConsumer {
  constructor(
    private readonly db: PrismaClient,
    private readonly handlers: HandlerRegistry,
  ) {}

  async process(job: Job<WorkerEvent>) {
    const event = validateEvent(job.data);
    const existing = await this.db.inboxJob.findUnique({
      where: { outboxEventId: event.outboxEventId },
    });
    if (existing?.status === 'COMPLETED') {
      console.info(
        JSON.stringify({
          message: 'job_deduplicated',
          eventId: event.outboxEventId,
          topic: event.topic,
        }),
      );
      return;
    }

    const inbox = await this.startAttempt(existing, event);
    if (!inbox || inbox.status === 'COMPLETED') {
      console.info(
        JSON.stringify({
          message: 'job_deduplicated',
          eventId: event.outboxEventId,
          topic: event.topic,
        }),
      );
      return;
    }
    const handler = this.handlers.get(event.topic);
    try {
      if (!handler) throw new Error('UNSUPPORTED_WORKER_TOPIC');
      await handler(event.payload);
      await this.db.inboxJob.update({
        where: { id: inbox.id },
        data: { status: 'COMPLETED', completedAt: new Date(), lastError: null },
      });
      console.info(
        JSON.stringify({
          message: 'job_processed',
          eventId: event.outboxEventId,
          topic: event.topic,
        }),
      );
    } catch (error) {
      const message = safeError(error);
      if (isFinalAttempt(job)) {
        await this.db.$transaction(async (tx) => {
          await tx.inboxJob.update({
            where: { id: inbox.id },
            data: { status: 'DEAD_LETTER', lastError: message },
          });
          await tx.deadLetterJob.upsert({
            where: { inboxJobId: inbox.id },
            create: { inboxJobId: inbox.id, topic: event.topic, error: message },
            update: { error: message },
          });
        });
      } else {
        await this.db.inboxJob.update({
          where: { id: inbox.id },
          data: { status: 'FAILED', lastError: message },
        });
      }
      throw error;
    }
  }

  private async startAttempt(
    existing: InboxJob | null,
    event: WorkerEvent,
  ): Promise<InboxJob | null> {
    if (existing) {
      if (existing.status !== 'FAILED') return null;
      const claimed = await this.db.inboxJob.updateMany({
        where: { id: existing.id, status: 'FAILED' },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          startedAt: new Date(),
          completedAt: null,
          lastError: null,
        },
      });
      if (claimed.count === 0) return null;
      return this.db.inboxJob.findUniqueOrThrow({ where: { id: existing.id } });
    }
    try {
      return await this.db.inboxJob.create({
        data: {
          outboxEventId: event.outboxEventId,
          topic: event.topic,
          status: 'PROCESSING',
          attempts: 1,
          startedAt: new Date(),
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const raced = await this.db.inboxJob.findUniqueOrThrow({
        where: { outboxEventId: event.outboxEventId },
      });
      return this.startAttempt(raced, event);
    }
  }
}

function validateEvent(value: WorkerEvent) {
  if (
    !value ||
    typeof value.outboxEventId !== 'string' ||
    !value.outboxEventId ||
    typeof value.topic !== 'string' ||
    !value.topic
  ) {
    throw new Error('INVALID_WORKER_EVENT');
  }
  return value;
}

function isFinalAttempt(job: Job<WorkerEvent>) {
  const configuredAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;
  return job.attemptsMade + 1 >= configuredAttempts;
}
