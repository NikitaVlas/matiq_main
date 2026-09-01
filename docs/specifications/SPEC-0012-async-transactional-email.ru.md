# SPEC-0012: Асинхронные транзакционные письма

## Контекст

Identity API синхронно отправляет verification и password-reset письма через
локальный `EmailService`. Ошибка SMTP отменяет HTTP request после создания
токена, а доставка не использует outbox/retry/dead-letter foundation.

## Scope

- Событие `email.send.v1` создаётся в одной PostgreSQL-транзакции с auth token.
- Verification и password-reset письма обрабатываются Worker.
- Provider-neutral `EmailProvider` и безопасный console adapter.
- German templates остаются частью MATIQ, а не внешнего провайдера.
- Email address, link и raw token хранятся в outbox только в зашифрованном
  envelope и не копируются в logs/inbox/dead-letter.

Не входят production email provider, tracking pixels, campaigns, marketing
email и provider webhooks.

## Требования

- Публичные auth responses и срок действия токенов не меняются.
- В production обязателен общий для API/Worker `EMAIL_ENCRYPTION_KEY` размером
  32 bytes в base64; ключ не хранится в репозитории.
- Test/development используют детерминированный локальный ключ только для
  локального запуска.
- Outbox idempotency key уникален для конкретного созданного auth token.
- Worker строго валидирует decrypted message до вызова provider.
- Console provider журналирует только безопасный event и тип шаблона.
- Ошибки provider используют существующие bounded retry и dead-letter.

## Acceptance criteria

- Register, resend verification и forgot password атомарно сохраняют token и
  encrypted outbox event.
- HTTP request не зависит от доступности email provider.
- Worker расшифровывает и передаёт корректное немецкое письмо adapter-у.
- Повторная доставка не вызывает вторую логическую отправку.
- Невалидный envelope завершается retry/dead-letter без утечки payload.
- Unit, PostgreSQL/Redis integration и `pnpm verify` проходят.

## План реализации

1. Добавить общий email message/encryption contract.
2. Заменить синхронный EmailService на transactional outbox producer.
3. Добавить Worker EmailProvider, console adapter и handler.
4. Добавить unit/integration tests и обновить Identity docs/audit.
5. Выполнить OpenAPI drift check и полную verification.

## Verification results

- Shared encryption/template tests: 7 passed (включая существующие policies и metrics).
- Worker unit tests: 10 passed.
- API transactional email integration: 3 passed.
- Full API integration suite: 6 files / 9 tests passed; дополнительный resend
  case после этого прогона прошёл в целевом suite.
- Worker PostgreSQL/Redis integration: 5 passed, включая encrypted delivery и
  damaged-envelope dead-letter.
- Typecheck and full repository verification: `pnpm verify` passed.

## Known limitations

- Console provider не доставляет реальные письма.
- Production provider и его DPA/GDPR review требуют отдельного решения.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-09-01
- Related code: `packages/backend`, `apps/api`, `apps/worker`
