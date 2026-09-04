# SPEC-0016: Browser и security regression coverage

## Scope

Следующий одобренный срез: браузерная проверка существующих критических сценариев,
базовые keyboard/mobile accessibility проверки и негативные тесты GDPR status.
Production и правила авторизации не меняются; новых зависимостей нет.

## План и критерии

1. Воспроизвести сетевую ошибку и чрезмерный polling статуса удаления.
2. Сделать первоначальную проверку и явное ручное обновление; сетевые ошибки
   объявляются через alert, кнопка всегда разблокируется после ответа/ошибки.
3. Проверить keyboard retry, mobile overflow, heading/main, отсутствие секрета
   в URL/localStorage; обновить fixture полного settings flow.
4. Дополнить API integration случаями завершённого и просроченного запроса.
5. Выполнить весь существующий browser suite и документировать ограничения.

Mocked browser API не доказывает full-stack интеграцию. Это не WCAG audit и не
полный penetration test; production checklist остаётся открытым.

## Document status

- Status: Implemented; browser/API verified locally
- Owner: MATIQ team
- Last reviewed: 2026-09-04
- Related code: e2e, deletion status page, account deletion integration tests

## Результаты

6 browser tests passed; GDPR API integration passed. Первый API-прогон завершился
таймаутом startup hook при параллельном browser run; отдельный повтор прошёл без
увеличения таймаута. Начальные browser failures воспроизвели два дефекта и выявили
устаревшие fixtures. CI ещё не запускался удалённо. См. security review 2026-09-04.
