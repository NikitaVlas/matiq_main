export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 12) errors.push('PASSWORD_TOO_SHORT');
  if (!/[a-z]/.test(password)) errors.push('PASSWORD_LOWERCASE_REQUIRED');
  if (!/[A-Z]/.test(password)) errors.push('PASSWORD_UPPERCASE_REQUIRED');
  if (!/\d/.test(password)) errors.push('PASSWORD_NUMBER_REQUIRED');
  return errors;
}
