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

  it('creates a validated custom Roadmap topic in the shared field', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'topic-half-guard' });
    const db = {
      metadataField: { upsert: vi.fn().mockResolvedValue({ id: 'field-1' }) },
      metadataOption: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
    };
    const service = new RoadmapMetadataService(db as never);

    await service.createTopic({ key: 'half-guard', name: 'Half Guard' });

    expect(create).toHaveBeenCalledWith({
      data: { fieldId: 'field-1', key: 'half-guard', name: 'Half Guard' },
    });
  });

  it('rejects invalid or duplicate Roadmap topics', async () => {
    const db = {
      metadataField: { upsert: vi.fn().mockResolvedValue({ id: 'field-1' }) },
      metadataOption: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({ id: 'existing' }),
      },
    };
    const service = new RoadmapMetadataService(db as never);

    await expect(service.createTopic({ key: '???', name: 'Invalid' })).rejects.toThrow(
      'INVALID_ROADMAP_TOPIC',
    );
    await expect(service.createTopic({ key: 'half-guard', name: 'Half Guard' })).rejects.toThrow(
      'ROADMAP_TOPIC_ALREADY_EXISTS',
    );
  });
});
