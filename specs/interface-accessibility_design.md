# Interface accessibility

## Scope and plan

User request: continue available launch-readiness work, starting with interface
accessibility. Audit public navigation and all Admin sections in DE/RU at 320 CSS
pixels, including populated Foundation and editable assessment choices. Fix
unlabelled controls, keyboard navigation and reflow; preserve business behavior.
Use existing Playwright/axe tooling, regression tests and full verification.
No provider, payment, authorization or dependency changes.

## Acceptance

- Keyboard users can skip repeated navigation to content with visible focus.
- Admin form controls have explicit accessible names in the selected UI language.
- Tested sections reflow at 320 CSS pixels without page-wide horizontal overflow.
- Existing WCAG 2.1 A/AA automated checks pass in both Admin languages.
- Public navigation and existing critical user journeys remain functional.

## Implementation

- Added localized keyboard skip links to Public/Admin layouts with a focusable
  content target and visible keyboard focus.
- Added explicit translated accessible names to course, module, lesson, upload,
  metadata and assessment controls, including recommendation choices.
- Foundation rows stack with visible field labels on narrow screens. Finance forms
  wrap and their columns fit the available width; controls can shrink within forms.
- Added 12 Admin regression cases (six sections in each language) using axe,
  explicit-label, keyboard and 320 CSS pixel reflow checks, including populated
  course/Foundation fixtures. Extended the public login keyboard regression.

## Verification

Initial regression run reproduced 10 failures across the two Admin languages:
missing control names and horizontal overflow. The subsequent 12-case run passed.
Full verification (format, architecture, lint, types, units and build) and the
14-case Admin suite passed locally.

- `pnpm e2e --workers=1`: 24 passed, including the public keyboard regression.
- `pnpm e2e:admin --workers=1`: 14 passed.
- `pnpm e2e:admin --workers=1 accessibility.spec.ts`: 12 passed again after
  widening the desktop Foundation columns; mobile/desktop screenshots reviewed.
- `git diff --check`: passed.

Browser tests use synthetic API responses. Database/provider integration was not
rerun because this change touches UI only. Manual assistive-technology acceptance
and remote CI were not run.

## Remaining acceptance

Automated tests and narrow-viewport checks do not replace real screen-reader,
browser zoom, OS high-contrast or cross-browser acceptance. Launch gates remain
open until those checks are completed. No full accessibility certification claimed.

## Document status

- Status: Implemented and locally verified; manual acceptance remains open
- Owner: MATIQ team
- Last reviewed: 2026-09-13
- Related code: Public/Admin layouts and Admin forms
