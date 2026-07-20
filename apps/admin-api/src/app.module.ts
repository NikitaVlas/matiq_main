import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
class HealthController {
  @Get()
  get() {
    return { status: 'ok', service: 'admin-api' };
  }
}

@Module({ controllers: [HealthController] })
export class AppModule {}
