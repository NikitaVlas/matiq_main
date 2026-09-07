# Launch/security readiness

Чек-лист не является подтверждением безопасности или разрешением production.

## Gates и требуемые доказательства

- [ ] Identity: негативные API-тесты own-only доступа, разделение Admin/User
  sessions, MFA и re-authentication; приложить результаты к release revision.
- [ ] Контент: недоступность оригинальных видео без entitlement; проверка upload,
  signed URL expiry и запрещённых Admin-действий.
- [ ] Billing: подпись и replay webhooks, reconciliation, VAT/refunds — после
  утверждения PSP и коммерческих правил.
- [ ] Secrets: dependency/security scan и проверка журналов/артефактов на секреты.
- [ ] Browser: сквозной путь регистрации, assessment, просмотра и удаления;
  keyboard/focus, mobile, accessibility и ошибки сети. Синтетические Chromium
  сценарии (13/13) покрывают эти пути, включая экспорт данных; для закрытия gate
  остаются полный WCAG/contrast audit и запуск CI browser job.
- [ ] Recovery: приложить synthetic recovery evidence; отдельно подтвердить
  production restore, независимый ledger, EU storage и цели RPO/RTO.
- [ ] Observability: dashboards/alerts, ответственный и тест доставки alert.
- [ ] Providers/legal: DPA, subprocessors, export/delete, privacy notice и terms.
- [ ] Incident response: ответственные, канал escalation, процедура breach.
- [ ] Владелец принимает residual risks и разрешает запуск.

Следующая инженерная работа: Identity/Content negative security coverage,
dependency/security scan и полный accessibility audit. Пустые пункты не считать
выполненными.

## Document status

Частичная проверка и открытые риски:
[отчёт 2026-09-04](security-review-2026-09-04.ru.md).

- Status: Active checklist; review not completed
- Owner: MATIQ team
- Last reviewed: 2026-09-07
- Related code: Repository-wide
