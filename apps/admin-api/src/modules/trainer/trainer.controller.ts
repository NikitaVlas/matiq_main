import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('admin-trainers')
@Controller('admin')
@UseGuards(AdminAuthGuard)
export class TrainerController {
  constructor(private readonly db: AdminDatabaseService) {}

  @Get('trainers')
  trainers() {
    return this.db.user.findMany({
      where: { role: 'TRAINER' },
      select: { id: true, email: true, createdAt: true },
    });
  }
}
