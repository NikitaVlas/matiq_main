# SPEC-0002: Авторизация и восстановление доступа

## Ожидаемое поведение

После подтверждения email спортсмен может войти, повторно запросить письмо,
восстановить забытый пароль и завершить текущую либо все активные сессии.
API атомарно сохраняет зашифрованное email-событие вместе с verification/reset
token. Worker асинхронно обрабатывает немецкое письмо через provider-neutral
adapter; локальная разработка использует console-адаптер без реальной доставки.

## Безопасность

- ответы не раскрывают существование аккаунта;
- reset- и verification-token records одноразовые и хранят только SHA-256 hash;
- сброс пароля завершает все существующие сессии;
- login и email endpoints ограничены по частоте для нормализованного email;
- raw token и email message хранятся в outbox только в AES-256-GCM envelope;
- production encryption key поступает только из deployment environment.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-09-01
- Related code: `apps/api/src/modules/identity`, `apps/worker`, `packages/backend/src/email`
