import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RoleService {
  constructor(
    @Inject(AdminDatabaseService) private readonly db: AdminDatabaseService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async users() {
    return this.db.user.findMany({
      select: { id: true, email: true, role: true, emailVerifiedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async changeRole(actorId: string, userId: string, role: UserRole) {
    if (!Object.values(UserRole).includes(role)) throw new BadRequestException('INVALID_ROLE');
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.role === role) return { id: user.id, role: user.role };
    if (user.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await this.db.user.count({ where: { role: 'ADMIN', deletedAt: null } });
      if (adminCount <= 1) throw new BadRequestException('LAST_ADMIN_ROLE_REQUIRED');
    }
    const updated = await this.db.user.update({ where: { id: userId }, data: { role } });
    await this.audit.record('USER_ROLE_CHANGED', 'User', userId, actorId, {
      from: user.role,
      to: role,
    });
    return { id: updated.id, role: updated.role };
  }
}
