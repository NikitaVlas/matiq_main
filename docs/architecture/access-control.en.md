# MATIQ Access-Control and Editorial Model

## Roles

MATIQ uses four system roles:

| Role | Purpose |
|---|---|
| `Athlete` | Assessment, Roadmap, subscription, and content playback |
| `Trainer` | Own statistics and financial reports only |
| `Editor` | Preparation of content and methodology entities |
| `Admin` | Full management, publishing, video, assessment, and security |

The first version does not use a separate methodology-expert role.

## Authorisation principle

The server verifies a concrete permission. A role name by itself does not
replace a permission check.

```text
Authenticated user
        ↓
Role
        ↓
Permission
        ↓
Resource scope
        ↓
Authorised action
```

## Access matrix

| Action | Athlete | Trainer | Editor | Admin |
|---|---:|---:|---:|---:|
| Browse the published catalogue | Yes | Yes | Yes | Yes |
| Play video when entitled | Yes | According to account access | Yes | Yes |
| Complete an assessment | Yes | No | No | For testing |
| Manage own Roadmap | Yes | No | No | For support |
| View own trainer statistics | No | Yes | No | Yes |
| View another trainer's statistics | No | No | No | Yes |
| Create a trainer draft | No | No | Yes | Yes |
| Create course and lesson drafts | No | No | Yes | Yes |
| Create positions, techniques, and Movements | No | No | Yes | Yes |
| Create Drills and Flows | No | No | Yes | Yes |
| Edit uploaded-video metadata | No | No | Yes | Yes |
| Upload video | No | No | No | Yes |
| Publish or archive content | No | No | No | Yes |
| Manage assessment questions and rules | No | No | No | Yes |
| Manage users and roles | No | No | No | Yes |
| Manage MATIQ subscriptions and payment records | No | No | No | Yes |
| View the audit log | No | No | No | Yes |

This matrix is a product model. Concrete permissions will be named during API
design.

## Editor responsibilities

An `Editor` may create and edit drafts of:

- trainers;
- courses;
- modules and lessons;
- positions and PositionContexts;
- SkillGroups;
- techniques and TechniqueVariants;
- Movements;
- Drills;
- Flows;
- descriptions, relationships, and the primary topic of an uploaded video.

An `Editor` cannot:

- upload videos;
- publish or archive content;
- modify assessments;
- manage users and roles;
- manage payments;
- change the audit log.

## Admin responsibilities

An `Admin`:

- uploads videos;
- performs all permitted editorial actions;
- publishes, unpublishes, and archives content;
- creates assessment questions, answers, branching, and rules;
- manages users and roles;
- accesses subscriptions and reports;
- views the audit log.

Critical actions may require a dedicated permission even for an `Admin`.

## Content lifecycle

```text
DRAFT
  ↓ submit for review
IN_REVIEW
  ↓ Admin approval
PUBLISHED
  ↓ unpublish
ARCHIVED
```

Allowed transitions:

- An `Editor` creates and changes `DRAFT`.
- An `Editor` submits `DRAFT` as `IN_REVIEW`.
- An `Admin` returns `IN_REVIEW` to `DRAFT`.
- Only an `Admin` changes `IN_REVIEW` to `PUBLISHED`.
- Only an `Admin` changes `PUBLISHED` to `ARCHIVED`.
- Republishing requires renewed `Admin` approval.

Status labels may be refined during interface design, but the transition meaning
must remain.

## Published-content revisions

Published content cannot be edited directly:

1. A new draft revision is created from the published version.
2. An `Editor` or `Admin` changes the draft revision.
3. The revision passes through `IN_REVIEW`.
4. An `Admin` publishes the revision.
5. The new version becomes active, while the previous one remains in technical
   history.

Unpublishing requires a reason, which is retained in the audit log.

## Publishing related data

Content cannot be published until required relationships are ready.
Preliminary checks are:

- a video has an uploaded and ready media resource;
- exactly one primary topic is configured;
- a discipline is configured;
- required German text is complete;
- the related trainer exists;
- required methodology entities are published;
- no critical validation error exists.

Concrete rules will be defined separately for every content type.

## Audit log

The audit log records:

- actor;
- role and permission;
- time;
- entity type and identifier;
- operation type;
- changed fields before and after;
- reason where required;
- technical request context without secrets.

Audited operations include:

- content creation and editing;
- publication-status changes;
- video upload and replacement;
- assessment and expert-rule changes;
- role and permission changes;
- administrative subscription actions;
- sensitive-report viewing or export where required.

The preliminary audit-log retention period is at least five years. The final
period and deletion rules must be reviewed against GDPR, contractual, and legal
requirements before production.

## Strong authentication

- MFA is mandatory for `Admin` and `Editor`.
- A critical action requires recent re-authentication.
- Re-authentication does not replace permission checks or MFA.

Critical actions are:

- changing a role or permissions;
- deleting or blocking a user;
- changing assessment questions, branching, or rules;
- unpublishing content;
- performing an administrative subscription action.

## Constraints

- `ACL-001`: The server performs authorisation.
- `ACL-002`: A `Trainer` sees only their own data.
- `ACL-003`: An `Editor` cannot upload video.
- `ACL-004`: Only an `Admin` publishes and archives content.
- `ACL-005`: Only an `Admin` changes assessments and scoring rules.
- `ACL-006`: Only an `Admin` changes roles and permissions.
- `ACL-007`: Administrative changes produce an audit event.
- `ACL-008`: Ordinary administrative functions cannot modify the audit log.
- `ACL-009`: The presence of a UI route does not grant a permission.
- `ACL-010`: A critical permission change requires separate approval.
- `ACL-011`: Published content is changed only through a new revision.
- `ACL-012`: Unpublishing content requires a reason.
- `ACL-013`: MFA is mandatory for `Admin` and `Editor`.
- `ACL-014`: Critical actions require re-authentication.
- `ACL-015`: The audit log is preliminarily retained for at least five years;
  the period requires legal review before production.

## Open questions

- Which MFA factors are supported?
- What period qualifies as recent re-authentication?
- Which GDPR rules and legal basis apply to five-year audit-log retention?

## Document status

- Status: Approved permission baseline
- Owner: MATIQ team
- Last reviewed: 2026-07-19
- Related code: Identity, Admin API, editorial workflow; implementation partial
