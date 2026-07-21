import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { IdentityModule } from '../identity';
@Module({ imports: [SharedInfrastructureModule, IdentityModule], controllers: [ProfileController] })
export class AthleteProfileModule {}
