import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class Database extends PrismaClient implements OnModuleDestroy {
  async ping(): Promise<void> {
    await this.$queryRaw(Prisma.sql`SELECT 1`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
