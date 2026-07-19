# MATIQ Project Overview

## Summary

MATIQ is a German-language web platform for combat-sports athletes. It analyses
the athlete's experience, goals, strong positions, and weak positions to build
a personal development roadmap linked to curated video courses, techniques,
and drills.

The first version supports BJJ Gi and No-Gi Grappling. It serves athletes at
different levels, from beginners to professionals.

## Problem

Athletes often struggle to determine which positions and techniques to develop
next and in which order to study the available material. MATIQ turns
expert-curated video content into a personal, editable development path.

## Target users

- BJJ Gi and No-Gi Grappling athletes at different experience levels;
- athletes training for general development;
- athletes preparing for competition;
- athletes returning after a break;
- trainers whose selected content is published on MATIQ;
- MATIQ editors and administrators.

## Primary user journey

1. The user registers and selects one or both disciplines.
2. The user completes a shared profile covering experience, training
   frequency, belt, competition experience, and general goals.
3. The user completes a separate assessment section for each selected
   discipline.
4. Expert-defined rules identify strong and weak areas.
5. An algorithm builds a separate roadmap for each discipline.
6. AI explains the result and recommendations in clear, personalised language.
7. The user watches recommended videos and drills.
8. The user can add recommendations, hide them, and change their order.
9. The platform stores viewing history and playback position.

## Product principles

- Experts define the methodology, questions, answers, and evaluation rules.
- AI does not invent methodology or techniques and does not make final
  decisions.
- Only the MATIQ administration selects and uploads content.
- Trainers cannot publish or edit content themselves.
- The platform gives recommendations but does not assign mandatory tasks.
- Watching a video does not prove that a technique has been mastered.
- There is no separate landing page or marketing website; only the platform
  exists.
- The first version is a web application; native mobile applications are out
  of scope.

## Athlete roadmap

The roadmap moves from broad areas to specific learning materials. For example:

```text
Top game
├── Takedown
│   ├── Single Leg
│   └── Double Leg
├── Guard Passing
└── Side Control
```

A technique may be shared by multiple disciplines, while its execution
variants, constraints, and videos have a BJJ Gi or No-Gi context.

The user may select and prioritise multiple general goals:

- general development;
- competition preparation;
- returning after a break.

The assessment identifies more specific development areas. After the analysis,
the user can add them to the roadmap or change their priority.

## Content

Primary content types are:

- trainer;
- course;
- video;
- drill;
- position;
- technique;
- discipline-specific technique variant.

The platform provides public trainer profiles containing a photo, biography,
disciplines, qualifications, achievements, social links, and published
materials.

## Access and monetisation

- An unregistered visitor can see trainers, courses, and video titles but
  cannot watch videos.
- After registration and assessment completion, the user can activate a
  seven-day trial.
- No payment card is required to activate the trial.
- The trial does not convert to a paid subscription automatically. After it
  ends, the user may purchase a monthly subscription separately.
- Video access is blocked after the trial when there is no active subscription.
- The main video library is included in the subscription.
- Separate sales of large courses are planned for the future.

## Trainers and remuneration

- A trainer can access only their own statistics and financial reports.
- The primary remuneration model uses a distributable pool funded from net
  subscription revenue.
- Distribution is based on verified watch time with anti-abuse controls.
- An individual agreement may combine a fixed payment with a revenue share.
- In the first version, the platform collects statistics and produces reports,
  while payouts are performed manually.

## Languages

- All product interfaces, assessments, the administration interface, the
  trainer area, emails, and payment pages use German.
- Permanent project documentation is maintained in separate Russian and
  English files.

## Initial success criteria

- the user opens the first recommended lesson;
- the user returns to the platform within seven days;
- the user converts to a paid subscription after the trial.

## Future directions

- separate sales of large courses;
- physical preparation;
- mental preparation;
- nutrition.

## Open questions

- The exact trainer pool size and remuneration formula.
- Whether and how trial viewing contributes to trainer remuneration.
- Video-stream protection requirements and provider selection.
- Subscription price, currency, taxes, refunds, and cancellation rules.
- The exact list of general physical limitations available to users.

## Document status

- Status: Approved product baseline
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Repository-wide; implementation is partial
