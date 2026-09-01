import { Global, Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './infrastructure/auth.guard';
import { AuthService } from './application/auth.service';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { AdminSessionGuard, ContentSessionGuard } from './infrastructure/admin-session.guard';
@Global()
@Module({
  imports: [SharedInfrastructureModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminSessionGuard, ContentSessionGuard],
  exports: [AuthService, AuthGuard, AdminSessionGuard, ContentSessionGuard],
})
export class IdentityModule {}
