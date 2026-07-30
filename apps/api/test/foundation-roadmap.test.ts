import { Belt, Discipline } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { FoundationRoadmapService } from '../src/modules/athlete-profile/application/foundation-roadmap.service';

describe('beginner Foundation Roadmap', () => {
  it('assigns every active template step idempotently to an eligible beginner', async () => {
    const upsert = vi.fn();
    const db = {
      foundationTemplate: {
        findMany: vi.fn().mockResolvedValue([
          {
            discipline: Discipline.BJJ_GI,
            steps: [
              { id: 'step-1', title: 'Grundbewegungen', skillKey: 'movement-basics', position: 0 },
              { id: 'step-2', title: 'Escapes', skillKey: 'bottom-escape', position: 1 },
            ],
          },
        ]),
      },
      roadmapItem: { upsert },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const service = new FoundationRoadmapService(db as never);

    await expect(
      service.assignIfEligible({
        id: 'profile-1',
        belt: Belt.WHITE,
        experienceYears: 0,
        experienceMonths: 4,
        disciplines: [Discipline.BJJ_GI],
      }),
    ).resolves.toEqual({ assigned: true });

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          athleteProfileId_foundationStepId: {
            athleteProfileId: 'profile-1',
            foundationStepId: 'step-1',
          },
        },
        create: expect.objectContaining({ source: 'FOUNDATION', position: -1000 }),
      }),
    );
  });

  it('does not assign Foundation to an experienced athlete', async () => {
    const findMany = vi.fn();
    const service = new FoundationRoadmapService({ foundationTemplate: { findMany } } as never);

    await expect(
      service.assignIfEligible({
        id: 'profile-1',
        belt: Belt.WHITE,
        experienceYears: 1,
        experienceMonths: 12,
        disciplines: [Discipline.BJJ_GI],
      }),
    ).resolves.toEqual({ assigned: false });
    expect(findMany).not.toHaveBeenCalled();
  });
});
