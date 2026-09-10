import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';
import {
  publicVideoSelect,
  publicVideoSummary,
} from '../src/modules/content/application/public-video-catalog';

const area = { id: 'area', name: 'Boden' };
const position = { id: 'position', name: 'Guard', gameArea: area };
const technique = {
  id: 'technique',
  name: 'Sweep',
  skillGroup: { id: 'group', name: 'Sweeps', position },
};
const base = {
  id: 'video',
  title: 'Sweep lernen',
  description: null,
  durationSec: 120,
  createdAt: new Date(),
  position: null,
  technique: null,
  variant: null,
  movement: null,
  drill: null,
  trainer: null,
  Lesson: null,
  metadataValues: [],
};

describe('public video summaries', () => {
  it('queries all published videos directly and never selects playback secrets', async () => {
    const findMany = vi.fn().mockResolvedValue([base]);
    const service = new ContentService({ video: { findMany } } as never, {} as never, {} as never);
    const result = await service.publicVideos();
    expect(findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: publicVideoSelect,
    });
    expect(JSON.stringify(publicVideoSelect)).not.toMatch(
      /storageKey|password|email|mfaSecret|playbackToken/,
    );
    expect(result).toHaveLength(1);
  });
  it('resolves variant and drill taxonomy, including deduplication across relations', () => {
    const result = publicVideoSummary({
      ...base,
      position,
      technique,
      variant: { discipline: 'BJJ_GI', technique },
      drill: {
        id: 'drill',
        name: 'Sweep Drill',
        technique,
        movement: { id: 'movement', name: 'Hip escape' },
      },
    });
    expect(result.techniques).toEqual([{ id: 'technique', name: 'Sweep' }]);
    expect(result.positions).toHaveLength(1);
    expect(result.gameAreas).toEqual([area]);
    expect(result.skillGroups).toEqual([{ id: 'group', name: 'Sweeps' }]);
    expect(result.disciplines).toEqual(['BJJ_GI']);
    expect(result.movements[0]?.id).toBe('movement');
    expect(result.drills[0]?.id).toBe('drill');
  });
  it('excludes unpublished/deleted trainer identity and unpublished course discipline', () => {
    const result = publicVideoSummary({
      ...base,
      trainer: {
        role: 'TRAINER',
        deletedAt: new Date(),
        trainerProfile: { published: true, slug: 'secret', displayName: 'Private name' },
      },
      Lesson: { published: true, module: { course: { published: false, discipline: 'BJJ_GI' } } },
    });
    expect(result.trainer).toBeNull();
    expect(result.disciplines).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('Private name');
  });
});
