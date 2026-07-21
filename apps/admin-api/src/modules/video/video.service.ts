import { Injectable } from '@nestjs/common';
import { AdminDatabaseService } from '../../shared/infrastructure/admin-database.service';
import { StorageService } from '../../shared/infrastructure/storage.service';

@Injectable()
export class VideoService {
  constructor(
    private readonly db: AdminDatabaseService,
    private readonly storage: StorageService,
  ) {}

  list() {
    return this.db.video.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(data: { title: string; storageKey: string; description?: string; published?: boolean }) {
    return this.db.video.create({ data: { ...data, published: data.published ?? false } });
  }

  upload(file: { buffer: Buffer; mimetype: string; originalname: string }) {
    return this.storage.upload(file);
  }

  playback(storageKey: string) {
    return this.storage.playbackUrl(storageKey);
  }

  update(id: string, data: { title?: string; description?: string; published?: boolean }) {
    return this.db.video.update({ where: { id }, data });
  }
}
