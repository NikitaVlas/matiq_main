import { Discipline } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AssessmentService } from '../src/modules/assessment/application/assessment.service';

describe('assessment roadmap lesson matching', () => {
  it('rejects access to a foreign Roadmap item', async () => {
    const db = { roadmapItem: { findFirst: vi.fn().mockResolvedValue(null) } };
    const service = new AssessmentService(db as never, {} as never);

    await expect(service.roadmapItemDetails('user-1', 'foreign-item')).rejects.toThrow(
      'ROADMAP_ITEM_NOT_FOUND',
    );
    expect(db.roadmapItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-item', athleteProfile: { userId: 'user-1' } },
      }),
    );
  });

  it('returns matching courses, lessons, and user progress', async () => {
    const db = {
      roadmapItem: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'item-1',
          title: 'Mount-Kontrolle',
          discipline: Discipline.BJJ_GI,
          skillKey: 'mount-top',
          completedAt: null,
        }),
      },
      video: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'video-1',
            title: 'Mount halten',
            description: null,
            durationSec: 100,
            watchEvents: [{ watchedSeconds: 80, completed: true }],
            Lesson: {
              id: 'lesson-1',
              title: 'Mount halten',
              published: true,
              module: {
                id: 'module-1',
                title: 'Mount',
                course: { id: 'course-1', title: 'Top Game', description: null, published: true },
              },
            },
          },
        ]),
      },
    };
    const service = new AssessmentService(db as never, {} as never);

    const result = await service.roadmapItemDetails('user-1', 'item-1');

    expect(result.progress).toEqual({ completedLessons: 1, totalLessons: 1, percent: 100 });
    expect(result.courses).toEqual([{ id: 'course-1', title: 'Top Game', description: null }]);
    expect(result.lessons[0]).toMatchObject({ videoId: 'video-1', completed: true });
    expect(db.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          published: true,
          OR: expect.arrayContaining([
            { metadataValues: { some: { option: { key: 'mount-top' } } } },
          ]),
        }),
      }),
    );
  });

  it('rejects a manually assigned unpublished lesson', async () => {
    const db = {
      athleteProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'profile-1',
          disciplines: [Discipline.BJJ_GI],
        }),
      },
      lesson: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new AssessmentService(db as never, {} as never);
    await expect(service.addRoadmapItem('user-1', 'Lesson', undefined, 'lesson-1')).rejects.toThrow(
      'LESSON_NOT_AVAILABLE',
    );
  });

  it('attaches matching lessons while preserving retained Roadmap state', async () => {
    const create = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue({});
    const db = {
      roadmapItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'existing',
            discipline: Discipline.BJJ_GI,
            skillKey: 'standing',
            recommendationType: 'GAP',
            position: 7,
            isHidden: true,
            completedAt: new Date(),
          },
        ]),
        delete: vi.fn(),
        create,
        update,
      },
      lesson: {
        findFirst: vi.fn().mockResolvedValueOnce({ id: 'lesson-1' }).mockResolvedValueOnce(null),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const service = new AssessmentService(db as never, {} as never);
    await (
      service as unknown as {
        generateRoadmap: (
          id: string,
          disciplines: Discipline[],
          scores: Map<string, number>,
        ) => Promise<void>;
      }
    ).generateRoadmap(
      'profile-1',
      [Discipline.BJJ_GI, Discipline.NO_GI_GRAPPLING],
      new Map([
        ['standing', 1],
        ['unknown', 2],
      ]),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: 'existing' },
      data: expect.objectContaining({ lessonId: 'lesson-1' }),
    });
    expect(update.mock.calls[0]?.[0].data).not.toHaveProperty('position');
    expect(update.mock.calls[0]?.[0].data).not.toHaveProperty('isHidden');
    expect(update.mock.calls[0]?.[0].data).not.toHaveProperty('completedAt');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ discipline: Discipline.NO_GI_GRAPPLING }),
    });
  });

  it('returns saved answers only for the authenticated user', async () => {
    const db = {
      assessment: {
        findUnique: vi.fn().mockResolvedValue({
          completedAt: new Date(),
          responses: [
            {
              optionKey: '__custom__',
              customText: 'Octopus Guard',
              mappingStatus: 'UNMAPPED',
              question: { key: 'preferred-game' },
            },
          ],
        }),
      },
    };
    const service = new AssessmentService(db as never, {} as never);

    await expect(service.currentAnswers('user-1')).resolves.toEqual({
      completed: true,
      answers: [
        {
          questionKey: 'preferred-game',
          optionKey: undefined,
          customText: 'Octopus Guard',
          mappingStatus: 'UNMAPPED',
        },
      ],
    });
    expect(db.assessment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });
});
