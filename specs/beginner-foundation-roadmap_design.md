# Feature: Beginner Foundation Roadmap

## Requirements

- While an athlete completes onboarding, when the athlete selects a white belt and no more than six
  months of experience, the system shall assign an active Foundation Roadmap for every selected
  discipline.
- While a beginner has an active Foundation Roadmap, the system shall recommend continuing the
  fundamentals before taking the personal Assessment.
- While the recommendation is visible, the athlete may still start the Assessment manually.
- When a beginner submits the Assessment, personal recommendations shall be added without deleting,
  replacing, or reprioritising retained Foundation progress.
- Foundation shall cover movements, standing, guard, sweeps, passing, top control, and escapes with
  expert-selected Roadmap topics and published content.
- Foundation templates and ordered steps shall be stored in the database and editable only through
  the existing MFA-backed Admin boundary.

## Architecture

### Frontend

- Onboarding collects experience in months while retaining the existing years value for backward
  compatibility.
- Dashboard presents `Grundlagen starten` as the primary action and `Assessment trotzdem starten`
  as a secondary action for eligible beginners.
- Roadmap uses the existing focused presentation, detail pages, content matching, and progress.

### Backend

- Add a Roadmap source distinguishing `FOUNDATION`, `ASSESSMENT`, and `MANUAL` items.
- Add DB-driven Foundation templates and ordered steps per discipline.
- Assign templates idempotently after the authenticated athlete saves an eligible profile.
- Assessment reconciliation operates only on `ASSESSMENT` items.
- Existing metadata-topic matching attaches published lessons to Foundation steps.

### Security

- Athlete profile and Roadmap operations remain protected by the authenticated user guard and
  scoped to the session user.
- Eligibility is calculated server-side from validated belt and experience values.
- Foundation administration uses the existing MFA-backed Admin session and `ADMIN` role.
- DTO limits apply to template names, stable keys, topic keys, positions, and experience ranges.
- Responses expose curriculum fields only and no unrelated user or security data.

## Implementation plan

- [x] Add additive Prisma models, Roadmap source, experience months, and seed templates.
- [x] Implement idempotent Foundation assignment during onboarding.
- [x] Preserve Foundation items during Assessment reconciliation.
- [x] Add beginner recommendation and manual Assessment entry to Dashboard.
- [x] Add Admin API and UI for Foundation template steps.
- [x] Add unit coverage and apply the migration to the local integration database.
- [x] Generate Prisma and OpenAPI clients and run required verification.

## Acceptance criteria

- [x] A white belt with 0–6 months receives Foundation steps once per selected discipline.
- [x] A non-beginner does not receive the template automatically.
- [x] Re-saving the profile does not duplicate Foundation steps.
- [x] Manual Assessment leaves Foundation items and progress unchanged.
- [x] Foundation is recommended but Assessment remains directly accessible.
- [x] Admin can reorder, add, edit, activate, and deactivate template steps.

## Verification

- Prisma Client generation and the local additive migration completed successfully.
- Workspace typecheck, lint, tests, production build, and changed-file formatting passed.
- API unit coverage includes eligible, ineligible, and idempotent assignment behavior.
- Browser E2E for the complete onboarding flow remains a manual follow-up check.
- Repository-wide formatting remains blocked by seven pre-existing files outside this change.

## Document status

- Status: Implemented; manual browser verification pending
- Owner: MATIQ team
- Last reviewed: 2026-07-30
- Related code: `apps/api/src/modules/athlete-profile`, `apps/api/src/modules/assessment`, `apps/admin-api`, `apps/web`, `apps/admin-web`
