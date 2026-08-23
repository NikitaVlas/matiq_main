import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Database } from './database';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@Inject(Database) readonly database: Database) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'user-api' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.database.ping();
      return { status: 'ok', service: 'user-api' };
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable', service: 'user-api' });
    }
  }
}
