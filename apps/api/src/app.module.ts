import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { Database } from './database';
import { ProfileController } from './profile.controller';

@Module({
  controllers: [AuthController, ProfileController],
  providers: [Database, AuthService, AuthGuard],
})
export class AppModule {}
