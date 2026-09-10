'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { messages } from './messages';

export type AdminLanguage = 'de' | 'ru';
let language: AdminLanguage = 'de';
const listeners = new Set<() => void>();
const key = 'matiq-admin-language';
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setAdminLanguage(value: AdminLanguage) {
  language = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Switching still works when storage is unavailable. */
  }
  document.documentElement.lang = value;
  listeners.forEach((listener) => listener());
}
export function useAdminLanguage() {
  return useSyncExternalStore(
    subscribe,
    () => language,
    () => 'de' as AdminLanguage,
  );
}
export function adminLocale() {
  return language === 'ru' ? 'ru-RU' : 'de-DE';
}
const patterns = Object.entries(messages)
  .filter(([source]) => source.includes('{0}'))
  .map(([source, translations]) => ({
    pattern: new RegExp(
      '^' +
        source
          .split(/\{\d+\}/)
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('([\\s\\S]*?)') +
        '$',
    ),
    translations,
  }));
export function translate(source: string, selected: AdminLanguage): string {
  const index = selected === 'ru' ? 1 : 0;
  if (messages[source]) return messages[source][index];
  const httpError = source.match(/^(.*?) \(HTTP (\d+)(?:: [\s\S]*)?\)$/);
  if (httpError && messages[httpError[1]!])
    return `${messages[httpError[1]!]![index]} (HTTP ${httpError[2]})`;
  for (const { pattern, translations } of patterns) {
    const match = source.match(pattern);
    if (match)
      return translations[index].replace(/\{(\d+)\}/g, (_, n) => match[Number(n) + 1] ?? '');
  }
  return source;
}
export function t(source: string) {
  return translate(source, language);
}

export function AdminLanguageBar() {
  const selected = useAdminLanguage();
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === 'ru' || saved === 'de') setAdminLanguage(saved);
    } catch {
      /* Optional persistence. */
    }
  }, []);
  return (
    <header className="admin-language-bar">
      <a className="admin-brand" href="/">
        MATIQ <span>ADMIN</span>
      </a>
      <nav aria-label={selected === 'ru' ? 'Разделы админки' : 'Admin-Navigation'}>
        <a href="/">{t('Courses')}</a>
        <a href="/videos">{t('Videos')}</a>
        <a href="/assessment">{t('Assessment')}</a>
        <a href="/foundation">{t('Foundation Roadmap')}</a>
        <a href="/trainers">{t('Trainer')}</a>
        <a href="/mfa">{selected === 'ru' ? 'Вход и операции' : 'Anmeldung und Betrieb'}</a>
      </nav>
      <label>
        {selected === 'ru' ? 'Язык интерфейса' : 'Oberflächensprache'}
        <select
          aria-label="Sprache / Язык"
          value={selected}
          onChange={(event) => setAdminLanguage(event.target.value === 'ru' ? 'ru' : 'de')}
        >
          <option value="de">Deutsch</option>
          <option value="ru">Русский</option>
        </select>
      </label>
      <p>
        {selected === 'ru'
          ? 'Материалы для спортсменов заполняются на немецком языке.'
          : 'Inhalte für Athleten werden auf Deutsch gepflegt.'}
      </p>
    </header>
  );
}
