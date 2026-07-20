# SPEC-0003: Локальное администрирование и контент

Локальный Admin API отделён от User API и защищён заголовком `x-admin-key`.
Он предоставляет статистику dashboard, список тренеров, список видео и
регистрацию видео только администратором. Видео остаётся неопубликованным,
пока администратор явно не установит `published`.

## Document status

- Status: Implemented locally
- Owner: Команда MATIQ
- Last reviewed: 2026-07-20
- Related code: `apps/admin-api`, `apps/admin-web`
