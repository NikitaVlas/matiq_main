# MATIQ Project Requirements

## Functional requirements

### Users and access

- `FR-USER-001`: A visitor shall be able to view trainer, course, and video
  metadata without video playback access.
- `FR-USER-002`: A user shall be able to register, sign in, sign out, and
  manage their account.
- `FR-USER-003`: The system shall support the `Athlete`, `Trainer`, `Editor`,
  and `Admin` roles.
- `FR-USER-004`: Subscription content playback shall be available only to a
  user with an active trial or subscription.
- `FR-USER-005`: The `/` page shall show a public video and trainer catalogue
  without protected-video playback.
- `FR-USER-006`: Attempting to play locked video shall open a contextual modal
  with the appropriate next action.

### Profile and assessment

- `FR-ASMT-001`: An athlete shall be able to select BJJ Gi, No-Gi Grappling, or
  both disciplines.
- `FR-ASMT-002`: The shared profile shall include experience, training
  frequency, belt, competition experience, and prioritised general goals.
- `FR-ASMT-003`: Each selected discipline shall have a separate assessment
  section.
- `FR-ASMT-004`: An `Admin` shall configure questions, answers, branching, and
  evaluation rules through the administration interface.
- `FR-ASMT-005`: Follow-up questions shall be selected from an approved bank;
  AI shall not generate new questions.
- `FR-ASMT-006`: A user shall be able to provide general physical limitations
  voluntarily without entering a medical diagnosis.
- `FR-ASMT-007`: When collecting physical limitations, the system shall state
  that MATIQ does not provide medical advice.
- `FR-ASMT-008`: A user shall be able to edit answers; the system shall
  recalculate current recommendations after a change.
- `FR-ASMT-009`: An incomplete assessment shall be saved and resumed from the
  last completed step.
- `FR-ASMT-010`: The assessment result and preliminary Roadmap shall be shown
  before trial activation.

### Recommendations and roadmaps

- `FR-RMAP-001`: Deterministic expert-defined rules shall identify strong and
  weak areas.
- `FR-RMAP-002`: An algorithm shall build a separate roadmap for each selected
  discipline.
- `FR-RMAP-003`: AI may explain a result but shall not invent techniques,
  change expert rules, or make the final decision.
- `FR-RMAP-004`: A roadmap shall connect development areas, positions,
  techniques, discipline-specific variants, and video materials.
- `FR-RMAP-005`: A user shall be able to add existing recommendations, hide
  them, and change their order.
- `FR-RMAP-006`: A user shall not be able to create new system positions or
  techniques.
- `FR-RMAP-007`: Editing assessment answers shall update the current roadmap
  without exposing previous roadmap versions to the user.
- `FR-RMAP-008`: The system shall not treat video viewing as proof that a
  technique has been mastered.
- `FR-RMAP-009`: The system shall not assign mandatory practical tasks.

### Content and playback

- `FR-CONT-001`: Only an `Admin` shall be able to upload and publish videos.
- `FR-CONT-002`: A trainer shall not be able to upload, publish, or edit
  content.
- `FR-CONT-003`: The system shall support trainers, courses, videos, drills,
  positions, techniques, and discipline-specific technique variants.
- `FR-CONT-004`: A public trainer profile shall support a photo, biography,
  disciplines, qualifications, achievements, social links, and published
  materials.
- `FR-CONT-013`: A public trainer profile shall present the author's journey as
  an athlete, competition experience, and personal preparation principles
  rather than reducing the person to titles or an instructor card.
- `FR-CONT-014`: Videos and courses shall be linked to the concrete training
  goals they are intended to support.
- `FR-CONT-015`: The platform shall support competition analysis and content
  describing an author's personal preparation principles.
- `FR-CONT-016`: A trainer records video materials outside the platform and
  submits them to MATIQ. Only an `Admin` reviews those materials, creates and
  structures the course in the platform, uploads the videos, and publishes the content.
- `FR-CONT-005`: The system shall store playback position.
- `FR-CONT-006`: A video shall be considered watched after at least 80 percent
  has been played.
- `FR-CONT-007`: A user shall have access to a library of watched materials.
- `FR-CONT-008`: The platform shall use protected streaming delivery and shall
  not expose a public source video file.
- `FR-CONT-009`: The platform shall provide a dedicated catalogue of all
  published videos with methodology and content filters.
- `FR-CONT-010`: A locked video shall support a short preview without granting
  access to the complete material.
- `FR-CONT-011`: Completely free videos are out of scope for the first version.
- `FR-CONT-012`: An `Admin` shall select a preview range within the full video,
  with a maximum duration of 60 seconds.

### Trial and subscription

- `FR-SUB-001`: A seven-day trial shall be available after registration and
  assessment completion.
- `FR-SUB-002`: No payment card shall be required to activate the trial.
- `FR-SUB-003`: The trial shall not convert to a paid subscription
  automatically. The user purchases a monthly subscription separately during
  or after the trial.
- `FR-SUB-004`: Playback access shall be blocked after the trial if there is no
  active subscription.
- `FR-SUB-005`: The primary video library shall be included in the
  subscription.
- `FR-SUB-006`: Paid-access checks shall be enforced on the server.
- `FR-SUB-007`: The trial shall expire automatically after seven days and shall
  not require cancellation.
- `FR-SUB-008`: After access expires, the profile, Roadmap, and catalogue shall
  remain available while video playback is locked.
- `FR-SUB-009`: Checkout shall use EUR for Germany and disclose price, period,
  automatic renewal, next charge, and cancellation before payment.
- `FR-SUB-010`: A success redirect shall not grant access before a verified
  payment event creates or updates an entitlement.
- `FR-SUB-011`: A user shall be able to cancel renewal from the profile while
  retaining access through the paid period.
- `FR-SUB-012`: Payment, subscription, and entitlement shall be separate domain
  concepts.
- `FR-PREM-001`: Premium-course sales are outside MVP, but the model shall allow
  a future course-scoped product and entitlement without changing video access.

### Trainers and reporting

- `FR-PAY-001`: A trainer shall have access only to their own statistics and
  financial reports.
- `FR-PAY-002`: The system shall collect verified watch time with anti-abuse
  controls.
- `FR-PAY-003`: The system shall produce a report for manual payout calculation
  and execution.
- `FR-PAY-004`: Trainer terms shall support a fixed fee, a share of the
  distributable pool, or a combination of both.
- `FR-PAY-005`: Automated trainer payouts are out of scope for the first
  version.

### Administration and languages

- `FR-ADMIN-001`: An `Admin` shall manage users, trainers, content,
  assessments, roadmaps, subscriptions, and reports.
- `FR-ADMIN-002`: An `Editor` shall manage permitted content drafts without
  access to assessments, payments, or user administration.
- `FR-ADMIN-003`: An `Editor` shall be able to edit drafts of trainers, courses,
  lessons, positions, techniques, Movements, and Drills. Only an `Admin` may
  create a course.
- `FR-ADMIN-004`: An `Editor` shall be able to add descriptions, relationships,
  and a primary topic to an uploaded video but shall not upload videos.
- `FR-ADMIN-005`: Only an `Admin` shall be able to publish, archive, or
  unpublish content.
- `FR-ADMIN-006`: Only an `Admin` shall be able to modify assessment questions,
  branching, and rules.
- `FR-ADMIN-007`: The system shall audit administrative changes with the actor,
  time, and changed data.
- `FR-ADMIN-008`: Published content shall be changed through a new draft
  revision and renewed `Admin` approval.
- `FR-ADMIN-009`: Unpublishing content shall require a reason.
- `FR-LANG-001`: The user interface, assessments, administration interface,
  trainer area, emails, and payment pages shall be in German.
- `FR-LANG-002`: The catalogue and author profiles shall highlight the
  German-speaking BJJ community, local availability, and attainable role
  models.
- `FR-NAV-001`: The Roadmap shall be the personal core of the Dashboard without
  displacing courses, videos, or trainers.
- `FR-NAV-002`: Desktop shall use primary side navigation and mobile web shall
  use bottom navigation.
- `FR-NAV-003`: Bottom mobile navigation shall contain Dashboard, Roadmap,
  Videos, History, and Profile.
- `FR-NAV-004`: The primary interface shall use light mode and compact
  typography.

## Non-functional requirements

### Security

- `NFR-SEC-001`: The server shall enforce authentication for every protected
  action.
- `NFR-SEC-002`: Role and permission checks shall not depend on client-side
  interface state.
- `NFR-SEC-003`: Payment webhooks shall be verified and processed
  idempotently.
- `NFR-SEC-004`: Video access shall use time-limited permissions or tokens.
- `NFR-SEC-005`: The system shall not include secrets or payment details in
  client code, logs, or documentation.
- `NFR-SEC-006`: Viewing statistics shall prevent obvious abuse and duplicate
  counting.
- `NFR-SEC-007`: MFA shall be mandatory for `Admin` and `Editor`.
- `NFR-SEC-008`: Critical administrative actions shall require recent
  re-authentication.

### Privacy

- `NFR-PRIV-001`: The system shall collect only data needed for approved
  features.
- `NFR-PRIV-002`: Medical diagnoses shall not be collected in the first
  version.
- `NFR-PRIV-003`: GDPR requirements, retention periods, and deletion rules
  shall be defined before user-data implementation.
- `NFR-PRIV-004`: Primary user data, video, analytics, logs, and backups shall
  be stored in the EU.
- `NFR-PRIV-005`: An international processor shall require explicit approval
  and DPA, subprocessor, transfer, retention, and deletion review.
- `NFR-PRIV-006`: Account deletion shall revoke sessions and asynchronously
  erase or irreversibly pseudonymise product data, including processor copies.
- `NFR-PRIV-007`: The system shall support a machine-readable user-data export.

### Accessibility and compatibility

- `NFR-A11Y-001`: The web interface shall support keyboard navigation, visible
  focus, and semantic elements.
- `NFR-COMP-001`: The first version shall be a responsive web application for
  desktop, tablet, and mobile web.
- `NFR-COMP-002`: Native mobile applications are not required.

### Reliability and observability

- `NFR-REL-001`: Retried payment and viewing events shall not cause duplicate
  accounting.
- `NFR-OBS-001`: Critical assessment, video-access, subscription, and
  statistics operations shall provide diagnosable logs without sensitive data.
- `NFR-OBS-002`: The administrative audit log shall be protected from
  modification by roles without a dedicated permission.
- `NFR-OBS-003`: The audit log shall preliminarily be retained for at least
  five years; the final period requires legal and GDPR review before production.

## First-version scope

### Included

- a German-language web platform without a separate landing page;
- registration, authentication, and athlete profiles;
- BJJ Gi and No-Gi Grappling;
- expert-defined branching assessments;
- algorithmic recommendations and AI explanations;
- editable roadmaps;
- curated trainers, courses, videos, techniques, and drills;
- streaming playback and viewing history;
- an administration interface and restricted trainer area;
- a seven-day trial, monthly subscription, and access blocking;
- verified watch-time statistics and manual payout reports.

### Excluded

- mandatory assignments;
- verification that a technique has been mastered;
- points, levels, and gamification;
- physical preparation, mental preparation, and nutrition;
- a free-form AI Coach;
- trainer self-publishing;
- automated trainer payouts;
- separate sales of large courses;
- a referral system;
- native mobile applications;
- a landing page or marketing website.

## Initial success criteria

- `SC-001`: The user opened the first recommended lesson.
- `SC-002`: The user returned to the platform within seven days.
- `SC-003`: The user converted to a paid subscription after the trial.

## Open questions

- `OQ-001`: What are the distributable pool size and exact payout formula?
- `OQ-002`: How does trial watch time contribute to remuneration?
- `OQ-003`: Which video provider and protection level are required?
- `OQ-004`: What are the subscription price, currency, tax, refund, and
  cancellation rules?
- `OQ-005`: Which browsers and minimum versions are supported?
- `OQ-006`: Which concrete performance targets are mandatory?

## Document status

- Status: Approved product baseline
- Owner: MATIQ team
- Last reviewed: 2026-08-24
- Related code: Repository-wide; implementation is partial
