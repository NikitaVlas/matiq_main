# Поэтапный implementation backlog MATIQ

## Правила выполнения

Backlog задаёт порядок, но не утверждает production providers, цены, налоги или
окончательное юридическое заключение по retention. Инженерные сроки утверждены
в privacy data lifecycle. Каждый epic до кода получает feature specification и
acceptance criteria. Этап завершается вместе с negative tests, observability и
актуальной документацией.

## Этап 0 — инженерная основа

- pnpm/Turborepo, общие TypeScript, lint и format configs;
- процессы `web`, `admin-web`, `api`, `admin-api`, `worker`;
- package общих backend-модулей без framework coupling;
- PostgreSQL, Redis и local object storage через Docker Compose;
- Prisma migrations/seed и правила module ownership;
- OpenAPI generation и clients для двух API;
- unit/integration/E2E, accessibility и visual harness;
- CI: format, lint, typecheck, tests, build;
- structured logs, correlation IDs, health/readiness и metrics;
- env validation, secret policy и EU deployment skeleton.

Выход: `verification.md` содержит проверенные команды, процессы собираются,
architecture tests запрещают неправильные imports.

## Этап 1 — Identity и Athlete profile

Регистрация email/password, подтверждение email, login/logout, password
reset/change, sessions и logout-all; Athlete profile с дисциплинами, поясом,
опытом, соревнованиями, частотой, целями и добровольными общими ограничениями;
settings; MFA foundation для Admin/Editor; permission/audit foundation;
orchestration export/delete.

Выход: Athlete безопасно управляет аккаунтом; его session не принимается Admin
API.

## Этап 2 — методология, контент и editorial workflow

Реализовать Discipline, GameArea, Position/Context, SkillGroup,
Technique/Variant, Movement, Drill, Flow/Step; Trainer profile;
Course/Module/Lesson; revisions и lifecycle draft/review/publish/archive;
Admin/Editor permissions; Admin-only video upload record/provider port;
primary/secondary topics; Admin UI и audit log.

Выход: Admin/Editor создают немецкий каталог, только Admin загружает и публикует.

## Этап 3 — Assessment engine

Versioned question bank, options, branching и публикация; resumable attempt для
каждой дисциплины; weighted signals, confidence и insufficient-data;
deterministic score 1–5; golden tests на экспертных профилях; редактирование
ответов и Admin preview.

Выход: одинаковые versioned inputs всегда дают одинаковый результат без AI.

## Этап 4 — Recommendations и Roadmap

Recommendation rules и dependency ordering; отдельные Gi/No-Gi Roadmap;
machine-readable reasons и versions; add/hide/reorder; независимые
TOP/BOTTOM/STANDING; preview до trial; Dashboard с Roadmap, видео, курсами и
тренерами; graceful state без AI.

Выход: объяснимая редактируемая Roadmap без custom methodology и «освоил».

## Этап 5 — Video, entitlement и история

Private provider adapter и processing states; Admin preview до 60 секунд;
signed playback sessions/tokens и watermark; public preview/locked modal;
immutable heartbeat; interval aggregation, deduplication и anti-abuse;
resume/history и `WATCHED` при 80%; scoped Admin/Trainer analytics.

Выход: full token невозможен без entitlement; redelivery не увеличивает время.

## Этап 6 — Trial

Eligibility после verified email и assessment; явная активация без карты;
server-side 7 × 24 часа; library entitlement; reminders; expired state с
доступным profile/Roadmap/catalog и locked playback; repeat-trial anti-abuse.

Выход: trial не создаёт payment method, subscription или auto-renewal.

## Этап 7 — Subscription и payments

Gate: утвердить PSP/DPA, EUR price, VAT/invoices, refund/cancellation и grace
period. Затем Product/Price, Checkout, Payment, Subscription, Entitlement;
немецкие disclosures и состояния; signed idempotent webhooks/reconciliation;
renewal/past-due; cancel-at-period-end, resume, invoices; audited Admin support.

Выход: redirect не открывает доступ, redelivery безопасна, отмена прозрачна.

## Этап 8 — Trainer finance

Gate: финансовый ориентир утверждён: фонд 30% после НДС, refunds, chargeback и
PSP fees; trial weight 0%; minimum payout 50 EUR с переносом остатка. До
production retention baseline требует юридической проверки. Затем versioned agreements/policies;
immutable monthly snapshot;
paid/trial split; reproducible allocation; anomaly review и adjustments;
report lifecycle/separation of duties; own-only Trainer reports; manual payment
reference и audit.

Выход: closing idempotent; MATIQ не переводит деньги автоматически.

## Этап 9 — GDPR и production readiness

Data/processor/location inventory; legal notices и consent decisions; retention
jobs; export/delete включая processors; backup restore и deleted-data
suppression; security controls/scanning; MFA/re-auth; incident/breach playbook;
recovery objectives; load/accessibility/E2E/security review; Germany launch
checklist.

Выход: production gates подтверждены, residual risks приняты владельцем.

## После MVP

- продажи Premium-курсов и course entitlement;
- доля тренера с net course sale;
- дополнительные дисциплины;
- физическая и ментальная подготовка, питание;
- усиленный DRM/anti-abuse только по измеренному риску.

## Сквозной Definition of Done

Approved specification и requirement IDs; migration compatibility; unit и
integration, для critical flow E2E/negative tests; OpenAPI drift check;
немецкие loading/empty/error/forbidden/expired states; keyboard/focus/responsive;
logs/metrics/audit без чувствительных данных; reviewed diff и Document status.

## Document status

- Status: Approved implementation sequence
- Owner: Команда MATIQ
- Last reviewed: 2026-09-02
- Related code: Весь репозиторий
