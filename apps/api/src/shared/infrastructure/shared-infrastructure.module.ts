import { Global, Module } from '@nestjs/common';
import { Database } from './database';
import { RateLimitService } from './rate-limit.service';
import { HealthController } from './health.controller';

@Global()
@Module({
  controllers: [HealthController],
  providers: [Database, RateLimitService],
  exports: [Database, RateLimitService],
})
export class SharedInfrastructureModule {}
