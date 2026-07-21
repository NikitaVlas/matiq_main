import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
@Module({ controllers: [ProfileController] })
export class AthleteProfileModule {}
