import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class RateLimitService {
  private readonly attempts = new Map<string, number[]>();

  check(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const recent = (this.attempts.get(key) ?? []).filter((time) => time > now - windowMs);
    if (recent.length >= limit)
      throw new HttpException('TOO_MANY_REQUESTS', HttpStatus.TOO_MANY_REQUESTS);
    recent.push(now);
    this.attempts.set(key, recent);
  }
}
