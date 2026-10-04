# Brevo: локальная отправка писем

## Область применения

Brevo выбран пользователем для локальной проверки подтверждения email и сброса
пароля 2026-10-04. Это дополнение к SPEC-0012: production rollout не утверждён.
Адаптер использует существующие шаблоны, encrypted outbox и Worker retries.
Публичные auth contracts и сроки токенов не меняются; новых зависимостей нет.

## Настройка

1. В Brevo подтвердить sender и создать обычный API key (не SMTP/MCP).
2. В `apps/worker/.env` задать `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`,
   `EMAIL_FROM_ADDRESS` и `EMAIL_FROM_NAME=MATIQ`. Файл исключён из Git.
3. Указать там же локальные `DATABASE_URL` и `REDIS_URL`. Если API использует
   `EMAIL_ENCRYPTION_KEY`, Worker должен использовать тот же ключ.
4. Запустить один Worker через `pnpm --filter @matiq/worker dev` из корня.
   Остановить прежний console Worker, чтобы он не забирал реальные письма.
5. В API `WEB_URL` должен соответствовать локальному frontend. Ссылку localhost
   открывать на том же компьютере при работающем приложении.
6. Запросить новое письмо через форму повторного подтверждения. Уже обработанные
   console adapter события не переотправляются автоматически.

Не помещать ключ в frontend, исходники, скриншоты или журналы. Локальные тесты
адаптера подменяют fetch и не отправляют реальные письма.

## Поведение и ограничения

- Фиксированный HTTPS endpoint Brevo, запрет redirect, timeout 10 секунд.
- Ошибки содержат только безопасный код, без ответа провайдера или payload.
- HTTP 201 с messageId означает принятие провайдером, а не доставку в ящик.
- HTTP 401/403: проверить ключ, разрешение transactional sending и IP в Brevo.
- HTTP 429: лимит; существующая очередь выполняет ограниченные retry.
- Одинаковый encrypted envelope даёт одинаковый idempotency key. Защита Brevo
  ограничена его временным окном; exactly-once при произвольно позднем retry
  не гарантируется. Завершённые задания дополнительно отсеивает локальный inbox.
- Console остаётся значением по умолчанию. Отсутствующий ключ при явном выборе
  Brevo вызывает ошибку; автоматического перехода на console нет.
- До production нужны собственный аутентифицированный домен, DPA/subprocessor
  review, политика хранения провайдера и проверка настроек tracking. Адаптер
  не добавляет собственные tracking pixels, но настройки Brevo проверяются отдельно.

## Источники

- [API отправки](https://developers.brevo.com/reference/send-transac-email)
- [Idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails)

## Document status

- Status: Verified locally; Brevo reported delivered on 2026-10-04
- Owner: MATIQ team
- Last reviewed: 2026-10-04
- Related code: `apps/worker/src/brevo-email-provider.ts`, `apps/worker/src/email-provider.ts`
