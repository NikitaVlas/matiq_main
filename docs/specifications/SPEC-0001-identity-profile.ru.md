# SPEC-0001: Регистрация, подтверждение email и Athlete profile

## Metadata

- Status: Verified
- Owner: Команда MATIQ
- Updated: 2026-07-20
- Related requirements: `FR-USER-002`, `FR-ASMT-001`, `FR-ASMT-002`
- Related ADR: ADR-0001, ADR-0002, ADR-0006

## Expected behavior

Пользователь регистрируется с email и сильным паролем, подтверждает
короткоживущий одноразовый token, получает HTTP-only session cookie и заполняет
первичный спортивный профиль на немецком языке.

## Security

- email нормализуется и уникален;
- пароль минимум 12 символов, upper/lowercase и digit, хранится bcrypt hash;
- verification/session tokens генерируются криптографически, в БД хранится
  только SHA-256 hash;
- verification token одноразовый и истекает через 24 часа;
- session cookie HTTP-only, SameSite=Lax, Secure в production;
- Athlete profile endpoints требуют подтверждённую session;
- development token возвращается только вне production.

## Acceptance criteria

- [x] Регистрация создаёт Athlete и verification token.
- [x] Слабый пароль отклоняется.
- [x] Повторный email отклоняется.
- [x] Подтверждение email создаёт session.
- [x] Invalid/expired token отклоняется.
- [x] Profile сохраняет Gi/No-Gi, пояс, опыт, частоту, соревнования и цели.
- [x] Complete profile получает `completedAt`.
- [x] Integration test проходит полный flow через HTTP и PostgreSQL.

## Known limitations

Console email adapter предназначен только для local development. Login,
password reset, session management, MFA и account deletion относятся к
следующим Identity slices.

## Document status

- Status: Verified
- Owner: Команда MATIQ
- Last reviewed: 2026-07-20
- Related code: `apps/api`, `apps/web`, `packages/backend`
