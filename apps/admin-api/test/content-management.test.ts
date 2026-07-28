import { describe, expect, it, vi } from 'vitest';
import { ContentController } from '../src/modules/content/content.controller';

const controllerWith = (db: object) => new ContentController(db as never);

describe('ContentController management operations', () => {
  it('reorders every module atomically', async () => {
    const update = vi.fn().mockResolvedValue({});
    const transaction = vi.fn().mockResolvedValue([]);
    const controller = controllerWith({
      courseModule: {
        findMany: vi.fn().mockResolvedValue([{ id: 'module-a' }, { id: 'module-b' }]),
        update,
      },
      $transaction: transaction,
    });

    await expect(
      controller.reorderModules('course-1', { moduleIds: ['module-b', 'module-a'] }),
    ).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 'module-b' },
      data: { position: 0 },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 'module-a' },
      data: { position: 1 },
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it('rejects an incomplete or duplicated reorder request', async () => {
    const controller = controllerWith({
      lesson: {
        findMany: vi.fn().mockResolvedValue([{ id: 'lesson-a' }, { id: 'lesson-b' }]),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    });

    await expect(
      controller.reorderLessons('module-1', { lessonIds: ['lesson-a', 'lesson-a'] }),
    ).rejects.toThrow('lessonIds must contain every item exactly once');
  });

  it('publishes one lesson without publishing the whole course', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'lesson-1', published: true });
    const controller = controllerWith({ lesson: { update } });

    await expect(controller.publishLesson('lesson-1')).resolves.toEqual({
      id: 'lesson-1',
      published: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'lesson-1' },
      data: { published: true },
    });
  });

  it('deletes a lesson without deleting its video directly', async () => {
    const deleteLesson = vi.fn().mockResolvedValue({ id: 'lesson-1' });
    const controller = controllerWith({ lesson: { delete: deleteLesson } });

    await controller.deleteLesson('lesson-1');
    expect(deleteLesson).toHaveBeenCalledWith({ where: { id: 'lesson-1' } });
  });
});
