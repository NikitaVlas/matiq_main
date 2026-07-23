import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { AdminRoles } from '../admin-auth/admin-roles.decorator';

@ApiTags('admin-content')
@Controller('admin/content')
@UseGuards(AdminAuthGuard)
@AdminRoles('ADMIN', 'EDITOR')
export class ContentController {
  constructor(private readonly db: AdminDatabaseService) {}
  @Get() catalog() {
    return Promise.all([
      this.db.gameArea.findMany({ include: { positions: true } }),
      this.db.position.findMany({ include: { skillGroups: true } }),
      this.db.skillGroup.findMany({ include: { techniques: true } }),
      this.db.technique.findMany({ include: { variants: true } }),
      this.db.movement.findMany(),
      this.db.drill.findMany(),
      this.db.flow.findMany(),
    ]).then(([gameAreas, positions, skillGroups, techniques, movements, drills, flows]) => ({
      gameAreas,
      positions,
      skillGroups,
      techniques,
      movements,
      drills,
      flows,
    }));
  }
  @Post('game-areas') createGameArea(
    @Body() body: { key: string; name: string; discipline: 'BJJ_GI' | 'NO_GI_GRAPPLING' },
  ) {
    return this.db.gameArea.create({ data: body });
  }
  @Post('positions') createPosition(
    @Body()
    body: {
      gameAreaId: string;
      key: string;
      name: string;
      context: 'STANDING' | 'TOP' | 'BOTTOM';
    },
  ) {
    return this.db.position.create({ data: body });
  }
  @Post('skill-groups') createSkillGroup(
    @Body() body: { positionId: string; key: string; name: string },
  ) {
    return this.db.skillGroup.create({ data: body });
  }
  @Post('techniques') createTechnique(
    @Body() body: { skillGroupId: string; key: string; name: string },
  ) {
    return this.db.technique.create({ data: body });
  }
  @Post('movements') createMovement(
    @Body() body: { key: string; name: string; description?: string },
  ) {
    return this.db.movement.create({ data: body });
  }
  @Post('drills') createDrill(
    @Body()
    body: {
      key: string;
      name: string;
      description?: string;
      techniqueId?: string;
      movementId?: string;
    },
  ) {
    return this.db.drill.create({ data: body });
  }
}
