# SPEC-0007: Спортивные профили тренеров и авторство контента

## Metadata

- Status: Verified
- Owner: MATIQ team
- Created: 2026-08-24
- Updated: 2026-08-24
- Related requirements: FR-CONT-003, FR-CONT-004, FR-CONT-013–016, FR-ADMIN-003, FR-ADMIN-005
- Related issues: не указаны
- Related ADR: не требуется
- Figma: Not applicable

## Problem

Trainer сейчас является только пользователем с ролью `TRAINER`; Admin API возвращает
лишь email и дату создания. Курсы и видео не имеют автора, публичных страниц тренеров нет.

## Goal

Представлять автора как спортсмена: показывать путь в BJJ, соревновательный опыт,
достижения, принципы подготовки и принадлежность к немецкоязычной локальной среде,
а также связывать профиль с опубликованными курсами и видео.

## Non-goals

- самостоятельная загрузка или публикация тренером;
- trainer finance, agreements и отчёты;
- хранение/обработка изображения отдельным media pipeline;
- автоматический импорт достижений или социальных профилей.

## Current behavior

`GET /admin/trainers` выбирает пользователей с ролью `TRAINER` и возвращает
`id`, `email`, `createdAt`. В `Course` и `Video` нет ссылки на автора.

## Expected behavior

Admin/Editor создаёт и редактирует черновик профиля существующего Trainer и назначает
его автором курса или standalone-видео. Только Admin публикует профиль. Публичный API
возвращает только опубликованные профили и опубликованные материалы.

## Actors and permissions

- Visitor/Athlete: читает опубликованные профили и материалы.
- Trainer: в этом срезе не редактирует профиль или контент.
- Editor: редактирует существующий draft профиля и назначает авторство.
- Admin: создаёт курс, проверяет и загружает материалы, а также публикует/снимает
  профиль с публикации.

## Scenarios

### Successful scenario

Given пользователь с ролью Trainer
When Editor заполняет профиль, назначает его курсу, а Admin публикует профиль
Then `/trainers/:slug` показывает путь спортсмена и опубликованный курс.

### Alternative scenario

Given standalone-видео без курса
When Editor назначает автора видео
Then видео появляется среди опубликованных материалов профиля.

### Failure scenario

Given неполный профиль или пользователь не является Trainer
When профиль пытаются опубликовать
Then API отклоняет операцию и не раскрывает профиль публично.

## Functional requirements

- SPEC-FR-001: Профиль поддерживает имя, slug, фото, биографию, путь, дисциплины,
  пояс, квалификацию, достижения и соревновательный опыт.
- SPEC-FR-002: Профиль поддерживает принципы подготовки, город, языки, локальную
  доступность и социальные ссылки.
- SPEC-FR-003: Course и Video поддерживают необязательного автора Trainer.
- SPEC-FR-004: Публичный список и detail возвращают только published profile/content.
- SPEC-FR-005: Trainer не получает upload/edit/publish permissions.

## Business rules

- BR-001: Один пользователь Trainer имеет не более одного профиля.
- BR-002: Slug уникален и состоит из латиницы, цифр и дефисов.
- BR-003: Для публикации обязательны display name, biography, athlete journey,
  training principles, хотя бы одна discipline и локализация.
- BR-004: Автором может быть только пользователь с ролью `TRAINER`.

## Inputs and outputs

Admin API принимает типизированный профиль и `trainerId` при обновлении курса/видео.
Публичный API возвращает профиль без email и внутренних идентификаторов пользователя.

## Validation

Текстовые поля ограничены по длине; URL валидируются; country code — две буквы;
списки имеют ограниченный размер; пустые строки нормализуются клиентом.

## Data changes

Добавляется `TrainerProfile` one-to-one с User. В `Course` и `Video` добавляется
nullable `trainerId` с `onDelete: SetNull` и индексами.

## API or contract changes

- Admin: `GET /admin/trainers`, `PUT /admin/trainers/:id/profile`,
  `POST /admin/trainers/:id/publish`, `POST /admin/trainers/:id/unpublish`.
- Admin content course/video update принимает `trainerId`.
- Public: `GET /content/trainers`, `GET /content/trainers/:slug`.

## UI behavior

Admin получает форму профиля и управления публикацией. Public web получает каталог
`/trainers`, страницу `/trainers/[slug]` и ссылки на автора из курса.

## Security

Email и внутренние данные Trainer не попадают в публичный контракт. Admin guard и
role metadata защищают mutation endpoints. Публикация записывается в audit log.

## Failure behavior

Неизвестный/не-TRAINER пользователь возвращает controlled 404/400. Неопубликованный
slug публично возвращает 404. Ошибка обновления не меняет публикационный статус.

## Edge cases

- EC-001: Один материал, связанный и через Course, и напрямую, не дублируется в UI.
- EC-002: Удаление Trainer оставляет Course/Video без автора.
- EC-003: Снятие профиля с публикации скрывает страницу, но не снимает Course с публикации.

## Compatibility

Все связи nullable; существующие курсы и видео продолжают работать без автора.

## Observability

Публикация, снятие с публикации и обновление профиля записываются в AuditLog.

## Acceptance criteria

- [x] AC-001: Editor может сохранить draft, но не опубликовать профиль.
- [x] AC-002: Admin не может опубликовать неполный профиль.
- [x] AC-003: Public API не раскрывает draft и email.
- [x] AC-004: Опубликованные курсы/видео отображаются в профиле автора.
- [x] AC-005: Course detail содержит ссылку на опубликованного автора.
- [x] AC-006: Trainer не получает права загрузки или публикации.
- [x] AC-007: Миграция, contract, tests и verification проходят.

## Test scenarios

### Unit

Role validation, completeness, public filtering и author assignment.

### Integration

Draft → publish → public detail; unpublished content filtering.

### Contract

OpenAPI обоих API и generated clients обновлены.

### E2E

Public trainers list/detail и переход из Course при доступном browser environment.

### Visual

Not applicable.

### Manual

Проверка адаптивной страницы с длинными biography/achievements.

## Constraints

Trainer только снимает видеоматериалы вне платформы и передаёт их MATIQ. Он не
создаёт курс в системе, не загружает и не публикует контент. Admin просматривает
материалы, создаёт и структурирует курс, загружает видео и публикует контент.

## Open questions

- [ ] Media pipeline для фото и правила image moderation.
- [ ] Несколько соавторов одного курса после MVP.

## Implementation plan

1. Добавить schema/migration.
2. Реализовать Admin API, permissions и audit.
3. Добавить author assignment в content workflow.
4. Реализовать public API и web pages.
5. Добавить tests, contracts и verification.

## Verification results

- `pnpm openapi:generate` — passed.
- Все 27 миграций применены с нуля к одноразовой PostgreSQL — passed.
- `pnpm --filter @matiq/api test:integration` — 5 файлов, 7 тестов passed.
- `pnpm --filter @matiq/admin-api test` — 8 файлов, 27 тестов passed.
- `pnpm --filter @matiq/api test` — 13 файлов, 41 тест passed.
- `pnpm verify` — format, architecture, lint, typecheck, unit tests и build passed.
- Первый параллельный запуск unit tests имел два инфраструктурных timeout; отдельный
  повтор и полный повторный verify прошли.
- `git diff --check` — passed; только предупреждения Git о будущей нормализации CRLF.
- Browser E2E и ручная визуальная проверка не выполнялись: browser environment не был
  частью текущего запуска.

## Known limitations

В MVP поддерживается один основной автор на Course/Video; фото задаётся URL.

## Document status

- Status: Verified
- Owner: MATIQ team
- Last reviewed: 2026-08-24
- Related code: `apps/admin-api/src/modules/trainer`, `apps/api/src/modules/content`, `apps/web`
