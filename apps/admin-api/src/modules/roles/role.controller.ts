import { Body, Controller, Get, Inject, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RoleService } from './role.service';

@ApiTags('admin-roles')
@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class RoleController {
  constructor(@Inject(RoleService) private readonly roles: RoleService) {}

  @Get()
  users() {
    return this.roles.users();
  }

  @Patch(':id/role')
  changeRole(
    @Param('id') userId: string,
    @Body() body: { role: 'ATHLETE' | 'TRAINER' | 'EDITOR' | 'ADMIN' },
    @Req() request: { adminUserId: string },
  ) {
    return this.roles.changeRole(request.adminUserId, userId, body.role);
  }
}
