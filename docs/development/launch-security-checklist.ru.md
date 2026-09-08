# Launch/security readiness

Чек-лист не является подтверждением безопасности или разрешением production.

## Gates и требуемые доказательства

- [x] Identity: негативные API-тесты подтверждают own-only sessions/export,
      разделение Admin/User cookies, MFA, re-authentication и отказ для
      expired/deleted/unverified privileged sessions. Локальные результаты
      2026-09-07: User API integration 6 файлов/10 тестов, Admin API integration
      4 файла/9 тестов.
- [ ] Контент: недоступность оригинальных видео без entitlement; проверка upload,
      signed URL expiry и запрещённых Admin-действий.
- [ ] Billing: подпись и replay webhooks, reconciliation, VAT/refunds — после
      утверждения PSP и коммерческих правил.
- [x] Secrets/dependencies: сигнатуры известных секретов в tracked-файлах не
      найдены. После обновления Next.js, AWS SDK, NestJS, Multer и закрепления
      исправленных транзитивных версий `pnpm audit --prod --audit-level high`
      завершён 2026-09-07 с результатом `No known vulnerabilities found`.
- [ ] Browser: сквозной путь регистрации, assessment, просмотра и удаления;
      keyboard/focus, mobile, accessibility и ошибки сети. Синтетические Chromium
      сценарии покрывают эти пути, включая экспорт данных. Автоматический WCAG 2.1
      A/AA и contrast scan проходит на ключевых состояниях User Web и Admin Web;
      оба набора включены в CI. Для закрытия gate остаются успешный удалённый CI run
      и ручная проверка screen reader/zoom/high contrast.
- [ ] Recovery: local dump/restore и повторное применение ledger подтверждены;
      ориентиры RPO 15 минут/RTO 4 часа зафиксированы. До закрытия gate остаются
      production-like restore, независимое EU-хранилище ledger и подтверждение
      удаления provider identifiers.
- [ ] Observability: dashboards/alerts, ответственный и тест доставки alert.
- [ ] Providers/legal: DPA, subprocessors, export/delete, privacy notice и terms.
- [ ] Incident response: ответственные, канал escalation, процедура breach.
- [ ] Владелец принимает residual risks и разрешает запуск.

Следующая инженерная работа: production video-provider validation, полный
accessibility audit и recovery/observability evidence. Пустые пункты не считать
выполненными.

## Document status

Частичная проверка и открытые риски:
[отчёт 2026-09-04](security-review-2026-09-04.ru.md).

- Status: Active checklist; review not completed
- Owner: MATIQ team
- Last reviewed: 2026-09-08
- Related code: Repository-wide
