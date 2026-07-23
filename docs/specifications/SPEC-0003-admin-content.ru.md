# SPEC-0003: Локальное администрирование и контент

Admin API отделён от User API и защищён MFA-сессиями Admin или Editor с явными правами на маршруты.
Он предоставляет статистику dashboard, список тренеров, список видео и
регистрацию видео только администратором. Видео остаётся неопубликованным,
пока администратор явно не установит `published`.

## Document status

- Status: Implemented locally
- Owner: Команда MATIQ
- Last reviewed: 2026-07-20
- Related code: `apps/admin-api`, `apps/admin-web`
