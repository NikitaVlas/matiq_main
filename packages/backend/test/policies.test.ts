import { describe, expect, it } from 'vitest';
import { profileIsComplete, validatePassword } from '../src/index.js';

describe('identity and profile policies', () => {
  it('requires a strong password', () => {
    expect(validatePassword('weak')).toContain('PASSWORD_TOO_SHORT');
    expect(validatePassword('StrongPassword1')).toEqual([]);
  });

  it('requires discipline, training frequency and goals', () => {
    expect(
      profileIsComplete({
        disciplines: ['BJJ_GI'],
        experienceYears: 1,
        trainingSessionsPerWeek: 3,
        goals: ['GENERAL_DEVELOPMENT'],
      }),
    ).toBe(true);
  });
});
