import { describe, expect, it, vi } from 'vitest';
import { AssessmentController } from '../src/modules/assessment/assessment.controller';

describe('admin assessment management', () => {
  it('rejects malformed question options before database access', async () => {
    const db = { assessmentQuestion: { create: vi.fn() } };
    const controller = new AssessmentController(db as never, { record: vi.fn() } as never);

    await expect(
      controller.createQuestion(
        {
          key: 'favorite-game',
          text: 'Favorite?',
          context: 'TOP' as never,
          skillKey: 'favorite-game',
          kind: 'PREFERENCE' as never,
          multiple: true,
          allowCustom: true,
          options: [{ key: 'Invalid Key', label: 'Bad', value: 3 }],
        },
        { adminUserId: 'admin-1' },
      ),
    ).rejects.toThrow('ASSESSMENT_OPTION_1_KEY_INVALID');
    expect(db.assessmentQuestion.create).not.toHaveBeenCalled();
  });

  it('maps a custom answer and records an audit event', async () => {
    const db = {
      metadataOption: { findMany: vi.fn().mockResolvedValue([{ key: 'octopus-guard' }]) },
      assessmentResponse: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'answer-1',
          customText: 'Octopus Guard',
          mappingStatus: 'UNMAPPED',
          question: { kind: 'PREFERENCE' },
          assessment: { user: { athleteProfile: null } },
        }),
        update: vi.fn().mockResolvedValue({ id: 'answer-1' }),
      },
    };
    const audit = { record: vi.fn() };
    const controller = new AssessmentController(db as never, audit as never);

    await controller.mapAnswer(
      'answer-1',
      { skillKey: 'octopus-guard' },
      { adminUserId: 'admin-1' },
    );

    expect(db.assessmentResponse.update).toHaveBeenCalledWith({
      where: { id: 'answer-1' },
      data: { mappedSkillKey: 'octopus-guard', mappingStatus: 'MAPPED' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      'ASSESSMENT_ANSWER_MAPPED',
      'AssessmentResponse',
      'answer-1',
      'admin-1',
      { skillKey: 'octopus-guard' },
    );
  });
});
