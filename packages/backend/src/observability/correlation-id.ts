import { randomUUID } from 'node:crypto';

const correlationIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function safeCorrelationId(
  candidate: string | undefined,
  generate: () => string = randomUUID,
): string {
  return candidate && correlationIdPattern.test(candidate) ? candidate : generate();
}
