import type { Prisma } from '@prisma/client';

export type WorkerEvent = {
  outboxEventId: string;
  topic: string;
  payload: Prisma.JsonValue;
};

export type EventHandler = (payload: Prisma.JsonValue) => Promise<void>;
export type HandlerRegistry = ReadonlyMap<string, EventHandler>;
