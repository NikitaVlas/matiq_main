import { describe, expect, it, vi } from 'vitest';
import { ContentService } from '../src/modules/content/application/content.service';

describe('ContentService courses', () => {
  it('returns only published courses with published lessons and reaction branches', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'course-1', published: true }]);
    const service = new ContentService(
      { course: { findMany } } as never,
      {} as never,
      {} as never,
    );

    await expect(service.courses()).resolves.toEqual([{ id: 'course-1', published: true }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { published: true },
      include: expect.objectContaining({ modules: expect.any(Object) }),
    }));
  });
});