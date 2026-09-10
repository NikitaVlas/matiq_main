import { describe, expect, it } from 'vitest';
import { translate } from './index';
import { messages } from './messages';
describe('admin language dictionary', () => {
  it('covers both languages and preserves arbitrary editorial text', () => {
    for (const values of Object.values(messages)) {
      expect(values[0]?.trim()).toBeTruthy();
      expect(values[1]?.trim()).toBeTruthy();
    }
    expect(translate('Create course', 'de')).toBe('Kurs erstellen');
    expect(translate('Create course', 'ru')).toBe('Создать курс');
    expect(translate('Meine eigene Guard-Technik', 'ru')).toBe('Meine eigene Guard-Technik');
  });
  it('translates parameterized errors without revealing server details', () => {
    expect(translate('Save failed (HTTP 403): secret diagnostic', 'ru')).toBe(
      'Не удалось сохранить (HTTP 403).',
    );
    expect(translate('Video created: abc-123', 'ru')).toBe('Видео создано: abc-123');
    expect(translate('Anmeldung fehlgeschlagen (HTTP 401: diagnostic)', 'ru')).toBe(
      'Не удалось войти (HTTP 401)',
    );
  });
});
