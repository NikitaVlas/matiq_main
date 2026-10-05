# Roadmap skill specialization

## Document status

- Status: Active — user-requested implementation
- Owner: MATIQ team
- Last reviewed: 2026-10-05

## Behaviour and scope

Editors manage a two-level hierarchy in Admin → Videos → Roadmap coverage.
They create a named skill under a root topic, or change an existing skill's parent.
Only root Roadmap topics can be parents; self-links, cycles and deeper nesting are rejected.
The names Spider Guard and Lasso Guard are examples, not hardcoded application data.

A published video tagged with a child topic and a discipline makes that skill
available inside its parent on that discipline's Roadmap. Draft videos and videos
for another discipline do not enable new selections. Parent material includes its
children's published videos; a selected child only includes its own matching material.
No duplicate parent video tag is needed. Parent coverage counts distinct videos.

The athlete can select one or more available skills. Selection is saved as manual
Roadmap targets while broad parent recommendations are hidden. Clearing selection
restores the broad topic. Reassessment preserves the selection. An already selected
skill remains visible if its last video is unpublished, with an honest empty state.
A custom root still needs an assessment mapping or manual plan entry to occur in
an athlete's plan; creating taxonomy does not automatically assign every topic.

Multiple recommendation reasons for the same discipline, skill and lesson target
produce one visible node, retaining all reasons. Different lessons stay distinct.
The map keeps Now / Next / Later, and child lists are collapsed by default with
explicit expand/collapse controls. Hover uses borders/text without movement or red fill.

## Implementation and security

- Add nullable MetadataOption.parentId with a self-reference and index. Migration
  20261005130000_roadmap_topic_hierarchy is additive; it deletes no existing data.
- Keep existing admin roles/session and athlete ownership checks. Admin hierarchy
  writes serialize on the taxonomy field; athlete selections serialize on the profile.
- Validate selected keys against server-owned, discipline-scoped editorial choices.
- Add compatible selectedSkillKeys to Roadmap PATCH and skillChoices to results.
- Record admin creation/relink actions in the existing audit log.
- Do not add dependencies or introduce a new service boundary.

## Verification

`node scripts/check-roadmap-skills.mjs` runs after building both API packages.
It creates, migrates and removes its own UUID-named local PostgreSQL database,
without loading application secrets or modifying the development database. It checks
hierarchy validation, publication/discipline filtering, parent coverage, consolidation,
selection persistence, ownership, reassessment and reset.

Unit tests cover consolidation and invalid selections. Browser tests cover collapsed
defaults, selected-only persistence, failed-save retry, admin linking and accessibility.
Standard checks follow docs/development/verification.md.

### Verification results — 2026-10-05

- `pnpm db:generate`: passed after restarting local API/worker runtimes to release
  the Windows engine DLL. Development services were confirmed running afterward.
- Migration: passed on a new disposable PostgreSQL database and the local
  development database; no existing data was removed.
- `pnpm openapi:generate`: passed; explicit request schemas are generated.
- `pnpm verify`: passed (format, architecture, lint, types, 193 unit tests, build).
- `pnpm e2e`: 41 passed; one existing login test had an ambiguous password locator.
  After making the locator exact, the affected accessibility and Roadmap suites
  passed: 9/9. Other user suites were not unnecessarily repeated.
- `pnpm e2e:admin`: 14 passed; the new skill test exposed an ambiguous parent label.
  Explicit accessible names were added; the new test then passed 1/1.
- `node scripts/check-roadmap-skills.mjs`: passed against the final compiled APIs,
  including real authenticated HTTP, invalid payload, forbidden role and audit checks.
- Desktop expanded/collapsed screenshots were inspected; mobile behavior and
  automated accessibility are covered by browser checks.
- The unrelated full identity/payment integration suite and load tests were not run;
  this change uses the targeted real-database/HTTP integration harness above.
- No dependency, authentication policy, payment behavior or production deployment changed.
