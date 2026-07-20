import { describe, expect, it } from 'vitest';
import { validatePassword } from '@matiq/backend';

describe('registration password validation', () => {
  it('accepts the approved minimum policy', () => {
    expect(validatePassword('SicheresPasswort1')).toEqual([]);
  });
});
