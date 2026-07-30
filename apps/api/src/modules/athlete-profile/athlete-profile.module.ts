import { Module } from '@nestjs/common';
import { ProfileController } from './controllers/profile.controller';
import { SharedInfrastructureModule } from '../../shared/infrastructure';
import { IdentityModule } from '../identity';
import { FoundationRoadmapService } from './application/foundation-roadmap.service';
@Module({
  imports: [SharedInfrastructureModule, IdentityModule],
  controllers: [ProfileController],
  providers: [FoundationRoadmapService],
})
export class AthleteProfileModule {}
