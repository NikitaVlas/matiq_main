# MATIQ

Монорепозиторий платформы персонального развития спортсменов в BJJ Gi и
No-Gi Grappling.

## Структура

- `apps/web` — пользовательское веб-приложение;
- `apps/admin-web` — административное веб-приложение;
- `apps/api` — User API;
- `apps/admin-api` — изолированный Admin API;
- `apps/worker` — фоновые задания;
- `packages/backend` — общие серверные политики;
- `packages/contracts` — сгенерированные OpenAPI-клиенты;
- `packages/typescript-config` — общие настройки TypeScript.

## Локальный запуск

Требования: Node.js 22+, pnpm 10.12.1+ и Docker Desktop.

```powershell
Copy-Item .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm openapi:generate
pnpm openapi:clients
pnpm dev
```

Сервисы по умолчанию:

- Web: `http://localhost:3000`
- Admin Web: `http://localhost:3001`
- User API: `http://localhost:4000`
- Admin API: `http://localhost:4001`
- MinIO API: `http://localhost:9100`
- MinIO Console: `http://localhost:9101`

## Проверка

```powershell
pnpm verify
pnpm test:integration
```

Подробные требования и архитектурные решения находятся в каталоге `docs/`.
