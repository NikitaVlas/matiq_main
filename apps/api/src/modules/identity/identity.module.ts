import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './infrastructure/auth.guard';
import { AuthService } from './application/auth.service';
import { EmailService } from './infrastructure/email.service';
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, EmailService],
  exports: [AuthService, AuthGuard],
})
export class IdentityModule {}
