import { describe, expect, it, vi } from 'vitest';
import { AssessmentService } from '../src/modules/assessment/application/assessment.service';

describe('assessment roadmap lesson matching', () => {
  it('rejects a manually assigned unpublished lesson', async () => {
    const db = { athleteProfile: { findUnique: vi.fn().mockResolvedValue({ id: 'profile-1' }) }, lesson: { findFirst: vi.fn().mockResolvedValue(null) } };
    const service = new AssessmentService(db as never, {} as never);
    await expect(service.addRoadmapItem('user-1', 'Lesson', undefined, 'lesson-1')).rejects.toThrow('LESSON_NOT_AVAILABLE');
  });

  it('attaches a matching lesson and preserves unmatched items', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const db = {
      roadmapItem: { deleteMany: vi.fn(), createMany },
      lesson: { findFirst: vi.fn().mockResolvedValueOnce({ id: 'lesson-1' }).mockResolvedValueOnce(null) },
    };
    const service = new AssessmentService(db as never, {} as never);
    await (service as unknown as { generateRoadmap: (id: string, scores: Map<string, number>) => Promise<void> }).generateRoadmap('profile-1', new Map([['standing', 1], ['unknown', 2]]));
    expect(createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([
      expect.objectContaining({ skillKey: 'standing', lessonId: 'lesson-1' }),
      expect.objectContaining({ skillKey: 'unknown', lessonId: undefined }),
    ]) });
  });
});