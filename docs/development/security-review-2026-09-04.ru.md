# Ограниченная проверка browser/GDPR

## Проверено

- 2026-09-07: локальный `pnpm e2e` прошёл 13/13. Добавлены регистрация →
  подтверждение email → заполнение Athletenprofil, повтор регистрации после 409,
  одноразовая загрузка GDPR export и восстановление UI после сетевой ошибки.
- Accessibility baseline расширен на login и settings при ширине 390 px: `main`,
  единственный `h1`, подписи полей, уникальные `id`, отсутствие горизонтального
  overflow и достижимый keyboard focus. Исправлена иерархия заголовков login,
  register, check-email, verify-email и profile.
- Обнаружено и исправлено зависание GDPR export: исключение `fetch` теперь
  объявляется через `role=alert`, а busy-state всегда снимается.
- Browser: 6 сценариев Chromium с синтетическим API, включая assessment/lesson,
  beginner flow, settings/MFA/delete, network retry и недоступный status.
- Accessibility baseline: keyboard retry, main/h1 и отсутствие горизонтального
  overflow на 390 px для deletion status. Полный WCAG/contrast audit не выполнен.
- API integration на matiq_test: re-auth перед удалением, отзыв session,
  неверный/просроченный/отсутствующий secret, completed status без userId/hash.
- Исправлено: polling 14 запросов/минуту при лимите 20/час; зависание busy при
  ошибке сети. Теперь первоначальная загрузка и ручное обновление.
- Browser fixtures обновлены под profile/attempt и heartbeat API; прежние
  проверки завершения урока и Roadmap сохранены.

## Открытые риски

- Текущее состояние: audit metadata связанных записей очищается общим helper
  обычного удаления и restore, включая уже псевдонимизированный actor. Прогон
  `256c4923f199a1628b121d51` (31,4 с) больше не выявляет metadata-утечку;
  остаются `deleted_account_subscription_still_active` и
  `provider_identifiers_remain_linked`, итог FAILED. `pnpm verify` прошёл.
  E2E и остальные integration suites не повторялись. Предложенный порядок отмены
  и решения до реализации: [SPEC-0017](../specifications/SPEC-0017-deletion-billing.ru.md).
  Ниже сохранена история предыдущих проверок, а не перечень текущих исправлений.

- Расширенный прогон `6b7dd26ea4098632354b1e8b` (30,3 с) завершился FAILED на
  `remaining_privacy_review`. После двух применений ledger удалены playback
  sessions, heartbeats и verified intervals, контрольные записи сохранены.
  Но синтетические email/userId в audit metadata остались; Subscription сохранила
  ACTIVE, cancelAtPeriodEnd=false и providerCustomerId/providerSubscriptionId.
  Это локальное воспроизведение, не доказательство реальных списаний у провайдера.
- Финансовая проверка ограничена Subscription и просмотром модели: договоры
  TrainerAgreement связаны с User через обязательный trainerId (Restrict).
  Удалять эту связь без отдельной модели обязательного хранения нельзя.
  Расчёты, договоры, отчёты выплат и webhook payloads не проверены восстановлением.
- Рабочие обработчики в этом срезе не менялись. Требуется согласовать очистку
  идентификаторов metadata и порядок остановки подписки/подтверждения у провайдера
  до удаления его идентификаторов; обязательные финансовые документы сохраняются.
  Регрессия намеренно остаётся красной, gate восстановления не закрыт.
- Расширенный recovery-прогон `cf804f5a954e09907a76a229` завершился ошибкой
  `audit_pseudonymisation`: после restore audit-записи сохраняют исходный user ID
  в actor/entityId. После явного согласования исправлено: restore заменяет
  идентификаторы audit по правилу обычного удаления, в той же транзакции.
  Прогон `fff64e5c488bec9e91ed8668` прошёл за 32,7 с: проверены ссылки только
  в actor, только в entityId и в обоих полях, повторное применение и сохранность
  контрольных записей. Сессии, verification/reset tokens и история просмотров удалены.
- Исправлено в последующем срезе: `reapplyDeletionLedger` больше не переносит
  35-дневный срок tombstone в receipt. Срок вычисляется от года завершения,
  существующая дата завершения сохраняется. Добавлены регрессионные проверки
  границы года и проверка receipt в настоящем recovery drill.
- Recovery drill проверяет продуктовый профиль и контрольный аккаунт, но не
  доказывает полноту очистки audit/financial/provider данных после restore.
- Mocked E2E не доказывают реальную доставку email, обработку видео, платежи или
  регистрацию через все backend-границы.
- Не выполнены penetration test, dependency vulnerability scan, полный
  WCAG/contrast audit и удалённый запуск CI browser job. E2E используют
  синтетический API и не заменяют full-stack проверку email/video/provider.

Полный launch/security gate не закрыт. Дефект ссылок audit после restore исправлен.
В предыдущем срезе `pnpm verify` прошёл (неизменённые пакеты использовали локальный cache); browser E2E
и остальные integration suites повторно не запускались. Очистка audit metadata и
необратимость разрыва связей во всех сохраняемых данных пока не доказаны.
Graph discovery не нашёл restore-функцию; проверен непосредственно исходный код.

Для нового тестового расширения: worker lint и typecheck прошли (после исправления
TS7022 в тесте); git diff --check прошёл. Полный verify, E2E и остальные integration
повторно не запускались. Graph указал устаревшие строки AuthService; сверено с исходником.

## Document status

- Status: Partial review; production blockers open
- Owner: MATIQ team
- Last reviewed: 2026-09-07
- Related code: deletion-ledger.ts, AccountDeletionStatusPage.tsx, e2e
