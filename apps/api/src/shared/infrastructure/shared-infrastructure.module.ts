import { Global, Module } from '@nestjs/common';
import { Database } from './database';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({ providers: [Database, RateLimitService], exports: [Database, RateLimitService] })
export class SharedInfrastructureModule {}
