# Local content workflow

## Document status

- Status: Active
- Owner: MATIQ team
- Last reviewed: 2026-07-28
- Related code: `apps/api/src/scripts/seed-content.ts`, content and roadmap modules

MATIQ content is developed locally without AWS or an external domain.

## Start local dependencies

From the repository root:

```bash
docker compose up -d postgres minio
```

Ensure `DATABASE_URL` points to the local PostgreSQL instance, then apply Prisma migrations:

```bash
pnpm --filter @matiq/api prisma:deploy
```

## Seed sample learning path

```bash
pnpm --filter @matiq/api content:seed
```

The seed is idempotent and creates draft content only:

- `Top Game — Takedown to Submission`;
- one module and three atomic lessons;
- primary lesson continuations and conditional branches with DB-managed triggers;
- local draft video assets without external storage.

## Verify

- Admin builder: `http://localhost:3001/`
- Learner catalog: `http://localhost:3000/courses`
- Public API: `GET http://localhost:4000/content/courses`

Lessons remain drafts until an editor publishes both the lesson and its video.
