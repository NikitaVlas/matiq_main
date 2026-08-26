# SPEC-0008: Подтверждённые интервалы просмотра и статистика авторов

## Metadata

- Status: Verified
- Owner: MATIQ team
- Created: 2026-08-26
- Updated: 2026-08-26
- Related requirements: FR-CONT-005–012, FR-PAY-001–003, NFR-SEC-006–007
- Related ADR: ADR-0004
- Figma: Not applicable

## Goal

Формировать неизменяемый ledger уникальных подтверждённых интервалов из принятых
playback heartbeat и показывать Admin агрегаты по тренерам, курсам и видео. Preview
должен оставаться отдельным режимом и не попадать в оплачиваемое время.

## Scope and constraints

- FULL heartbeat создаёт verified interval только для видимого активного просмотра.
- Пересекающиеся timeline-интервалы одного пользователя и видео не учитываются повторно.
- В ledger сохраняется автор видео на момент просмотра и класс доступа `PAID`/`TRIAL`.
- Admin видит агрегаты, но не сырые токены, email спортсменов или device/IP данные.
- Настройка preview уже хранится и валидируется Admin API. Публичная выдача preview media
  откладывается до provider с token, ограниченным диапазоном: текущий S3 URL открывает
  полный оригинал и противоречит ADR-0004.

## Three-perspective design

### Frontend

- Admin dashboard загружает отдельный отчёт с loading/error/empty states.
- Таблица показывает автора, paid/trial verified seconds и детализацию видео/курса.
- UI не принимает финансовых коэффициентов и не рассчитывает выплаты.

### Backend

- `VerifiedWatchInterval`: user, video, trainer snapshot, session/heartbeat, диапазон ms,
  access class и server timestamp.
- Heartbeat вычисляет непокрытые части принятого диапазона и записывает только их.
- `GET /admin/viewing-analytics` возвращает ограниченный агрегированный контракт.
- Prisma queries параметризованы; финансовая агрегация использует integer milliseconds.

### Security checkpoint

- Authentication: heartbeat защищён `ContentSessionGuard`, отчёт — `AdminAuthGuard`.
- Authorization: отчёт только `ADMIN`; FULL ledger только после entitlement check при
  создании session. Editor/admin playback не включается в remuneration ledger.
- Input: существующий DTO проверяет sequence, позиции, rate, activity и idempotency key;
  сервер ограничивает позиции длительностью видео.
- Output: отчёт не возвращает athlete userId/email, token hash или heartbeat payload.
- Abuse: duplicate heartbeat и перекрывающиеся интервалы не увеличивают итог.
- Logging: rejected heartbeat остаётся в immutable event stream; отчёт read-only.
- XSS: React выводит строки escaped; произвольный HTML отсутствует.

## Business rules

- BR-001: credited interval равен объединению уникальных принятых FULL диапазонов.
- BR-002: TRIAL хранится отдельно от PAID.
- BR-003: интервал без Trainer сохраняется для контроля, но не относится к автору.
- BR-004: смена автора не меняет historical trainer snapshot.
- BR-005: PREVIEW и административный просмотр не создают verified paid interval.

## API

- `GET /admin/viewing-analytics` → totals и trainers с video/course breakdown.
- Ответ использует целые milliseconds и производные seconds только для отображения.

## Acceptance criteria

- [x] AC-001: duplicate и overlap не увеличивают verified time.
- [x] AC-002: paid и trial агрегируются отдельно.
- [x] AC-003: автор фиксируется на момент просмотра.
- [x] AC-004: только Admin получает отчёт без данных спортсменов.
- [x] AC-005: Admin UI обрабатывает loading/error/empty/success.
- [x] AC-006: preview не попадает в verified paid time.
- [x] AC-007: migration, OpenAPI, unit/integration и full verification проходят.

## Implementation plan

1. Добавить ledger schema и миграцию.
2. Записывать непересекающиеся интервалы из heartbeat.
3. Добавить Admin aggregate endpoint и UI.
4. Добавить negative/overlap/integration tests и обновить contracts.
5. Выполнить verification и зафиксировать ограничения preview provider.

## Known limitations

Ledger строится синхронно в heartbeat path для MVP. Закрытие финансового периода,
agreement и payout остаются отдельным этапом. Публичный preview media не выдаётся через
неограниченный signed URL.

## Verification results

- `pnpm db:generate` и `pnpm openapi:generate` — passed.
- Все 28 миграций применены с нуля к disposable PostgreSQL — passed.
- `pnpm --filter @matiq/api test:integration` — 5 файлов, 7 тестов passed;
  overlap `0–5` + `2–7` записан как `0–5` + `5–7` с trial/author snapshot.
- User API unit — 14 файлов, 44 теста passed.
- Admin API unit — 9 файлов, 29 тестов passed.
- `pnpm verify` — format, architecture, lint, typecheck, unit и build passed.
- `git diff --check` — passed; предупреждения только о будущей нормализации CRLF.
- Browser E2E и ручная визуальная проверка не выполнялись.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-08-26
- Related code: `apps/api/src/modules/content`, `apps/admin-api/src/modules/dashboard`, `apps/admin-web`
