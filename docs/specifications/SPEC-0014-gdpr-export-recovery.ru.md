# SPEC-0014: Полный GDPR export, deletion status и защита restore

## Метаданные

- Status: Implemented; background export extension pending verification
- Owner: MATIQ team
- Created: 2026-09-03
- Updated: 2026-09-03
- Related requirements: NFR-PRIV-003, NFR-PRIV-006, NFR-PRIV-007
- Related architecture: `docs/architecture/privacy-data-lifecycle.ru.md`
- Figma: Not applicable

## Требования (EARS)

- Пока аккаунт активен, при запросе export система должна вернуть только данные
  этого пользователя из Identity, profile, assessment, Roadmap, viewing,
  playback и commerce, исключая secrets, hashes и внутренние audit payload.
- Когда пользователь подтверждает удаление, система должна вернуть один
  status-secret, отозвать sessions и позволить проверить состояние удаления без
  активной авторизации в течение 30 дней.
- Когда Worker завершает удаление, status endpoint должен вернуть `COMPLETED`,
  не раскрывая email, user ID или состав финансовых записей.
- После восстановления старого backup система должна повторно применить
  актуальный deletion ledger до допуска обычного трафика.

## Архитектура

### Frontend

- Settings после re-authentication запрашивает фоновую подготовку расширенного
  JSON export и скачивает его один раз после готовности.
- После запроса удаления status-secret сохраняется только в `sessionStorage`,
  затем пользователь переходит на `/account-deletion-status`.
- Страница статуса показывает loading, pending, completed и expired/error states
  на немецком и не помещает secret в URL.

### Backend

- `GET /auth/account/export` остаётся authenticated и возвращает versioned
  allowlisted JSON.
- `POST /auth/account/exports` создаёт фоновую задачу через transactional outbox;
  owner-scoped status и download endpoints не раскрывают данные других субъектов.
- Подготовленный export хранится как AES-256-GCM ciphertext не более 7 дней и
  очищается сразу после первого успешного скачивания.
- `DELETE /auth/account` расширяет response полями `requestId`, `statusToken` и
  `statusTokenExpiresAt`.
- `POST /auth/account-deletion/status` принимает request ID и secret в body.
- `User.privacySubjectId` связывает восстановленную запись с tombstone без email.
- `DeletionTombstone` хранится 35 дней и экспортируется отдельно от основного
  backup; recovery service повторно применяет удаление идемпотентно.

### Security

- Все account/export/delete операции проверяют authenticated owner; status
  проверяет SHA-256 hash случайного 256-bit secret и имеет rate limit.
- Export использует явный allowlist и не содержит password/token hashes, MFA
  secrets, provider payload или audit metadata.
- Status response не различает отсутствующий, просроченный и неверный secret.
- Ledger не содержит email и исходный `userId`; `privacySubjectId` случаен.
- Логи не содержат export body, status-secret или tombstone contents.

## Acceptance criteria

- [x] Export покрывает все локальные пользовательские категории и исключает secrets.
- [x] Status доступен после отзыва session только по корректному secret.
- [x] Неверный или просроченный secret возвращает одинаковую безопасную ошибку.
- [x] Worker сохраняет tombstone и очищает status hash после 30 дней.
- [x] Recovery test восстанавливает пользовательские данные и повторно удаляет
  их по отдельно сохранённому ledger.
- [ ] OpenAPI, unit/integration tests и `pnpm verify` проходят для фонового extension.

## Document status

- Status: Background export extension pending verification
- Owner: MATIQ team
- Last reviewed: 2026-09-07
- Related code: User API, User Web, Worker, Prisma schema
