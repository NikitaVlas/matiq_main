import { describe, expect, it, vi } from 'vitest';
import { RoadmapMetadataService } from '../src/modules/content/roadmap-metadata.service';

describe('Roadmap metadata', () => {
  it('idempotently ensures the shared Roadmap topic field and options', async () => {
    const fieldUpsert = vi.fn().mockResolvedValue({ id: 'field-1' });
    const optionUpsert = vi.fn().mockResolvedValue({});
    const db = {
      metadataField: { upsert: fieldUpsert },
      metadataOption: { upsert: optionUpsert },
    };
    const service = new RoadmapMetadataService(db as never);

    await service.ensureField();

    expect(fieldUpsert).toHaveBeenCalledWith({
      where: { key: 'roadmap-topic' },
      create: { key: 'roadmap-topic', name: 'Roadmap-Thema' },
      update: { name: 'Roadmap-Thema' },
    });
    expect(optionUpsert).toHaveBeenCalledTimes(8);
    expect(optionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fieldId_key: { fieldId: 'field-1', key: 'closed-guard' } },
      }),
    );
  });

  it('reports published video coverage for every topic', async () => {
    const db = {
      metadataField: { upsert: vi.fn().mockResolvedValue({ id: 'field-1' }) },
      metadataOption: {
        upsert: vi.fn().mockResolvedValue({}),
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'topic-1', key: 'top-control', name: 'Kontrolle von oben' }]),
      },
      videoMetadataOption: { count: vi.fn().mockResolvedValue(2) },
    };
    const service = new RoadmapMetadataService(db as never);

    await expect(service.coverage()).resolves.toEqual([
      {
        id: 'topic-1',
        key: 'top-control',
        name: 'Kontrolle von oben',
        publishedVideoCount: 2,
      },
    ]);
    expect(db.videoMetadataOption.count).toHaveBeenCalledWith({
      where: { optionId: 'topic-1', video: { published: true } },
    });
  });
});
