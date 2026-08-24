import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TrainerController } from '../src/modules/trainer/trainer.controller';
import { ADMIN_ROLES_KEY } from '../src/modules/admin-auth/admin-roles.decorator';

const validProfile = {
  slug: 'anna-muster',
  displayName: 'Anna Muster',
  biography: 'BJJ-Athletin und Trainerin aus Berlin.',
  athleteJourney: 'Vom ersten lokalen Open bis zur internationalen Wettkampfsaison.',
  disciplines: ['BJJ_GI'] as const,
  qualifications: ['Black Belt'],
  achievements: ['Deutsche Meisterin'],
  trainingPrinciples: 'Positionsverständnis vor isolierten Techniken.',
  city: 'Berlin',
  countryCode: 'DE',
  languages: ['Deutsch'],
  socialLinks: [{ label: 'Instagram', url: 'https://example.com/anna' }],
};

describe('TrainerController profiles', () => {
  it('reserves profile publication for Admin', () => {
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, TrainerController.prototype.publish)).toEqual([
      'ADMIN',
    ]);
  });
  it('saves a draft only for a Trainer and audits the change', async () => {
    const profile = { id: 'profile-1', userId: 'trainer-1', ...validProfile };
    const db = {
      user: { findFirst: vi.fn().mockResolvedValue({ id: 'trainer-1' }) },
      trainerProfile: { upsert: vi.fn().mockResolvedValue(profile) },
    };
    const audit = { record: vi.fn() };
    const controller = new TrainerController(db as never, audit as never);

    await expect(
      controller.saveProfile('trainer-1', validProfile as never, { adminUserId: 'editor-1' }),
    ).resolves.toEqual(profile);
    expect(db.trainerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'trainer-1' } }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      'TRAINER_PROFILE_UPDATED',
      'TrainerProfile',
      'profile-1',
      'editor-1',
      expect.any(Object),
    );
  });

  it('rejects a profile for a non-Trainer user', async () => {
    const controller = new TrainerController(
      { user: { findFirst: vi.fn().mockResolvedValue(null) } } as never,
      {} as never,
    );
    await expect(
      controller.saveProfile('athlete-1', validProfile as never, { adminUserId: 'editor-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not publish an incomplete profile', async () => {
    const db = {
      user: { findFirst: vi.fn().mockResolvedValue({ id: 'trainer-1' }) },
      trainerProfile: {
        findUnique: vi.fn().mockResolvedValue({
          ...validProfile,
          biography: '',
        }),
        update: vi.fn(),
      },
    };
    const controller = new TrainerController(db as never, {} as never);
    await expect(
      controller.publish('trainer-1', { adminUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.trainerProfile.update).not.toHaveBeenCalled();
  });
});
