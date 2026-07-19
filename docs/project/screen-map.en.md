# MATIQ Screen Map

## Purpose

This document describes the information architecture and primary states of the
German-language web platform. It does not define visual design.

## Primary areas

```text
Public platform
├── catalogue
├── videos without playback
└── trainers

Authentication
├── registration
├── login
├── email verification
└── password recovery

Athlete platform
├── onboarding and assessment
├── result
├── Roadmap
├── catalogue
├── video playback
├── viewing history
├── profile
└── subscription

Trainer area
├── own statistics
└── financial reports

Administration
├── content
├── methodology
├── assessment
├── users
├── subscriptions
└── audit log
```

## Public platform

### `/`

`/` is a public entry point into the platform, not a landing page.

It contains:

- a carousel of published videos;
- navigation to a selected video;
- a trainer carousel;
- navigation to a public trainer profile;
- login and registration.

Separate marketing-landing sections are not used.

### `/videos/[slug]`

A public video page contains:

- title;
- cover image;
- trainer;
- primary topic;
- short description;
- related positions or techniques;
- a locked video player.

When a visitor attempts playback, a modal invites them to register and obtain a
seven-day trial.

The video does not play until the user has playback entitlement.

### `/trainers/[slug]`

A public trainer profile contains:

- name and photograph;
- biography;
- disciplines;
- belt, qualifications, and achievements;
- social links;
- published courses and videos.

### Additional public routes

Preliminary routes are:

```text
/videos
/courses
/courses/[slug]
/trainers
/trainers/[slug]
```

The catalogue is available without registration, while protected video playback
is locked.

## Authentication

```text
/auth/register
/auth/login
/auth/verify-email
/auth/forgot-password
/auth/reset-password
```

Social sign-in is not used.

After login:

- a user with incomplete onboarding is redirected to `/onboarding`;
- a user with a completed assessment is redirected to `/app`.

## Onboarding and assessment

Preliminary routes are:

```text
/onboarding/profile
/onboarding/disciplines
/onboarding/goals
/onboarding/assessment
/onboarding/result
```

State is saved after every step. A user may leave and resume from the last
completed step.

### Assessment result

The result is shown before trial activation:

- general strengths;
- areas requiring development;
- explanation of the result;
- preliminary Roadmap;
- an invitation to activate the seven-day trial.

Video playback remains locked until a trial or subscription is activated.

## Athlete platform

Preliminary routes are:

```text
/app
/app/roadmap
/app/videos
/app/videos/[slug]
/app/courses
/app/courses/[slug]
/app/trainers
/app/trainers/[slug]
/app/history
/app/profile
/app/subscription
```

### `/app`

The Dashboard contains:

- the selected current discipline;
- personal recommendations;
- a compact personal Roadmap section;
- the next recommended Roadmap item;
- videos for the next step;
- continuation of a recently opened video;
- recommended and new courses;
- new videos;
- trainers;
- trial or subscription status.

The Dashboard is not a points system or verified-learning-progress system.

The Roadmap remains the personal core of the Dashboard but does not occupy most
of the screen. Courses, videos, and trainers remain prominent to support content
discovery and sales.

### `/app/roadmap`

A user may:

- view a separate map for every discipline;
- add existing recommendations;
- hide items;
- change order and priority;
- open related materials.

### `/app/history`

History contains watched videos and the latest playback position. A video is
considered watched after 80 percent.

### `/videos` and `/app/videos`

A dedicated catalogue of all published videos supports filtering at least by:

- discipline;
- trainer;
- GameArea;
- Position;
- SkillGroup;
- Technique;
- Movement;
- Drill.

The catalogue is visible without a subscription, while full playback requires
an active trial or subscription.

### Preview

A locked video may provide a short preview. The preview is available without an
active trial or subscription but does not grant access to the full material.

An `Admin` selects the preview start and end inside the full video. The maximum
preview duration is 60 seconds.

When the preview ends or the user attempts to continue playback, the contextual
modal is displayed.

The first version has no completely free videos.

## Access states

```text
VISITOR
  └── public catalogue, video locked

REGISTERED_INCOMPLETE
  └── onboarding, public catalogue

ASSESSED_NO_TRIAL
  └── result, Roadmap, catalogue, video locked

TRIAL_ACTIVE
  └── Roadmap and video available

SUBSCRIPTION_ACTIVE
  └── Roadmap and video available

ACCESS_EXPIRED
  └── profile, Roadmap, and catalogue available, video locked
```

## Trial and subscription purchase

1. The user completes the assessment.
2. The system shows the result and preliminary Roadmap.
3. The user opens trial activation.
4. The user activates the trial without entering a payment card.
5. The seven-day trial starts without automatic renewal.
6. Playback is locked when the trial ends unless the user has purchased a
   monthly subscription separately.

## Trial modal

The modal opens when a user attempts to play locked video.

States are:

- a visitor is invited to register;
- a user without an assessment is invited to complete it;
- a user with a result is invited to activate the trial;
- a user with expired access is invited to subscribe.

The copy and primary action depend on user state.

## Trainer area

```text
/trainer
/trainer/statistics
/trainer/reports
/trainer/profile
```

A trainer sees only:

- their own public profile;
- their own materials;
- verified watch time for their content;
- their own financial reports.

A trainer does not upload or edit content.

## Administration

Preliminary sections are:

```text
/admin
/admin/trainers
/admin/courses
/admin/lessons
/admin/videos
/admin/methodology
/admin/assessments
/admin/users
/admin/subscriptions
/admin/reports
/admin/audit
```

Sections and actions are displayed according to permission. The API provides
the actual protection.

## Primary interface states

Every critical screen must provide:

- loading;
- empty;
- error;
- access denied;
- expired access;
- unpublished or unavailable content;
- retry where safe.

## Navigation

Desktop and tablet landscape use left-side navigation. Mobile web uses bottom
navigation for primary areas and an additional menu for infrequent actions.

The primary mobile-navigation items are:

- Dashboard;
- Roadmap;
- Videos;
- History;
- Profile.

## Visual concept constraints

- Light mode is the primary mode.
- Typography is compact and avoids excessively large headings.
- The Dashboard balances the personal Roadmap, courses, videos, and trainers.
- The interface shall not resemble a landing page or a screen dedicated only
  to the Roadmap.

## Invariants

- `SM-001`: `/` is part of the platform, not a separate landing page.
- `SM-002`: A visitor may explore the catalogue but cannot play video.
- `SM-003`: Attempting to play locked video opens a contextual modal.
- `SM-004`: An incomplete assessment can be resumed later.
- `SM-005`: The assessment result is shown before trial activation.
- `SM-006`: The Roadmap is available before trial activation and after access
  expires.
- `SM-007`: The trial is activated without a payment card, expires
  automatically after seven days, and does not require cancellation.
- `SM-008`: The profile, Roadmap, and catalogue remain available after access
  expires.
- `SM-009`: A user with incomplete onboarding is redirected to onboarding
  after login.
- `SM-010`: A user with a completed assessment is redirected to the Dashboard
  after login.
- `SM-011`: The Roadmap is the personal core of the Dashboard but does not
  displace courses, videos, and trainers.
- `SM-012`: The platform provides a dedicated all-video catalogue with filters.
- `SM-013`: Full playback of every video requires a trial or subscription.
- `SM-014`: A locked video may provide a short preview.
- `SM-015`: Desktop uses side navigation and mobile web uses primary bottom
  navigation.
- `SM-016`: An `Admin` configures a preview as a range inside the video, with a
  maximum duration of 60 seconds.
- `SM-017`: The primary interface uses light mode and compact typography.

## Open questions

- Which assessment-result details are visible before trial.
- Exact catalogue filter set.
- Final visual hierarchy of Dashboard sections.

## Document status

- Status: Draft
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related design: MATIQ Figma, concept not yet created
- Related code: Product code has not been created
