import { describe, expect, it, vi } from 'vitest';
import {
  consolidateRoadmap,
  specializationFor,
} from '../src/modules/assessment/domain/roadmap-skills';
import { AssessmentService } from '../src/modules/assessment/application/assessment.service';

const row = (id: string, recommendationType: 'GAP' | 'CORE' | 'EXPLORE') => ({
  id,
  recommendationType,
  skillKey: 'open-guard',
  lessonId: null,
  discipline: 'BJJ_GI',
  position: 2,
  isHidden: false,
  completedAt: null,
});

describe('Roadmap skill targets', () => {
  it('consolidates reasons without merging disciplines or distinct lesson targets', () => {
    const result = consolidateRoadmap([
      row('goal', 'EXPLORE'),
      row('gap', 'GAP'),
      { ...row('nogi', 'GAP'), discipline: 'NO_GI_GRAPPLING' },
      { ...row('lesson', 'GAP'), lessonId: 'lesson-2' },
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 'gap',
      recommendationTypes: ['EXPLORE', 'GAP'],
      relatedItemIds: ['goal', 'gap'],
    });
  });

  it('keeps active targets visible despite hidden or completed duplicates', () => {
    const result = consolidateRoadmap([
      { ...row('hidden', 'GAP'), isHidden: true },
      { ...row('done', 'GAP'), completedAt: new Date() },
      row('active', 'EXPLORE'),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('active');
  });

  it('resolves editorial choices for the requested discipline', () => {
    const groups = [
      {
        parentKey: 'open-guard',
        title: 'Offene Guard',
        discipline: 'BJJ_GI',
        options: ['spider-guard', 'lasso-guard'].map((key) => ({
          key,
          title: key,
          publishedVideoCount: 1,
        })),
      },
    ];
    expect(
      specializationFor(groups, 'open-guard', 'BJJ_GI')?.options.map((option) => option.key),
    ).toEqual(['spider-guard', 'lasso-guard']);
    expect(specializationFor(groups, 'open-guard', 'NO_GI_GRAPPLING')).toBeUndefined();
  });

  it.each([['invented'], ['spider-guard', 'spider-guard']])(
    'rejects invalid selections %j before writing',
    async (...keys) => {
      const db = {
        metadataOption: {
          findMany: vi.fn().mockResolvedValue([
            {
              key: 'open-guard',
              name: 'Offene Guard',
              children: [{ key: 'spider-guard', name: 'Spider Guard', _count: { videos: 1 } }],
            },
          ]),
        },
        athleteProfile: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'profile' }) },
        roadmapItem: { findFirst: vi.fn().mockResolvedValue(row('parent', 'GAP')) },
        $transaction: vi.fn(),
      };
      const service = new AssessmentService(db as never);
      await expect(
        service.updateRoadmapItem('user', 'parent', { selectedSkillKeys: keys }),
      ).rejects.toThrow('INVALID_SKILL_SELECTION');
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects specialization on another user’s item', async () => {
    const db = {
      athleteProfile: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'own-profile' }) },
      roadmapItem: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    await expect(
      new AssessmentService(db as never).updateRoadmapItem('user', 'foreign', {
        selectedSkillKeys: ['spider-guard'],
      }),
    ).rejects.toThrow('ROADMAP_ITEM_NOT_FOUND');
    expect(db.roadmapItem.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', athleteProfileId: 'own-profile' },
    });
  });
});
