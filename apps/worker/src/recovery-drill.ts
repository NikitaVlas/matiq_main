import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  PrismaClient,
  type User,
  type AccountDeletionRequest,
  type Subscription,
} from '@prisma/client';
import {
  exportDeletionLedger,
  parseDeletionLedger,
  reapplyDeletionLedger,
} from './deletion-ledger.js';

// Intentionally fixed to the repository's local Compose service, never DATABASE_URL.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const runId = randomBytes(12).toString('hex');
const databases: [string, string] = [`matiq_drill_${runId}_source`, `matiq_drill_${runId}_restore`];
const created: string[] = [];
const clients: PrismaClient[] = [];
const checks: string[] = [];
const findings: string[] = [];
const started = new Date();
let stage = 'preflight';
let failure: string | null = null;
let revision = 'unknown';

function docker(args: string[], input?: string | Buffer) {
  return execFileSync('docker', ['compose', 'exec', '-T', 'postgres', ...args], {
    cwd: root,
    input,
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function sql(database: string, statement: string) {
  return docker(['psql', '-X', '-U', 'matiq', '-d', database, '-v', 'ON_ERROR_STOP=1'], statement);
}

try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim();
  for (const name of databases) {
    assert.match(name, /^matiq_drill_[a-f0-9]{24}_(source|restore)$/);
    sql('postgres', `CREATE DATABASE "${name}";`);
    created.push(name);
    clients.push(
      new PrismaClient({
        datasourceUrl: `postgresql://matiq:matiq_local@localhost:5432/${name}?schema=public`,
      }),
    );
  }
  const [source, restored] = clients;
  assert.ok(source && restored);
  stage = 'migrations';
  const migrations = resolve(root, 'apps/api/prisma/migrations');
  for (const directory of (await readdir(migrations, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    sql(databases[0], await readFile(resolve(migrations, directory.name, 'migration.sql'), 'utf8'));
  }
  stage = 'seed';
  const user = await source.user.create({
    data: {
      email: 'deleted-fixture@example.invalid',
      passwordHash: 'synthetic-non-login-hash',
      athleteProfile: {
        create: {
          disciplines: ['BJJ_GI'],
          experienceYears: 1,
          trainingSessionsPerWeek: 2,
          competitionExperience: false,
          goals: ['GENERAL_DEVELOPMENT'],
        },
      },
    },
  });
  const control = await source.user.create({
    data: {
      email: 'control-fixture@example.invalid',
      passwordHash: 'synthetic-non-login-hash',
    },
  });
  const video = await source.video.create({
    data: { title: 'Recovery fixture', storageKey: 'synthetic/recovery' },
  });
  for (const account of [user, control]) {
    const credentials = {
      userId: account.id,
      tokenHash: `synthetic-${account.id}`,
      expiresAt: new Date(Date.now() + 86_400_000),
    };
    await source.session.create({ data: credentials });
    await source.emailVerificationToken.create({ data: credentials });
    await source.passwordResetToken.create({ data: credentials });
    await source.videoWatch.create({
      data: { userId: account.id, videoId: video.id, watchedSeconds: 42 },
    });
    await source.playbackSession.create({
      data: {
        ...credentials,
        id: `playback-${account.id}`,
        videoId: video.id,
        watermarkId: `synthetic-${account.id}`,
        heartbeats: {
          create: {
            idempotencyKey: 'fixture',
            sequence: 1,
            previousPositionSec: 0,
            currentPositionSec: 1,
            activePlaybackMs: 1000,
            playbackRate: 1,
            visible: true,
            active: true,
            clientAt: new Date(),
            accepted: true,
            creditedPositionSec: 1,
          },
        },
      },
    });
    await source.verifiedWatchInterval.create({
      data: {
        userId: account.id,
        videoId: video.id,
        sessionId: `playback-${account.id}`,
        accessClass: 'PAID',
        startMs: 0,
        endMs: 1000,
        durationMs: 1000,
      },
    });
  }
  const subscriptions = await Promise.all(
    [user, control].map((account) =>
      source.subscription.create({
        data: {
          userId: account.id,
          status: 'ACTIVE',
          endsAt: new Date(Date.now() + 86_400_000),
          providerCustomerId: `synthetic-customer-${account.id}`,
          providerSubscriptionId: `synthetic-subscription-${account.id}`,
        },
      }),
    ),
  );
  const metadataAudit = await source.auditLog.create({
    data: {
      actor: user.id,
      entityId: user.id,
      entity: 'User',
      action: 'RECOVERY_METADATA_FIXTURE',
      metadata: { email: user.email, nested: { userId: user.id } },
    },
  });
  const audit = await source.auditLog.create({
    data: { actor: user.id, entityId: user.id, entity: 'User', action: 'RECOVERY_FIXTURE' },
  });
  const controlAudit = await source.auditLog.create({
    data: { actor: control.id, entityId: control.id, entity: 'User', action: 'RECOVERY_FIXTURE' },
  });
  const actorAudit = await source.auditLog.create({
    data: { actor: user.id, entity: 'Video', action: 'RECOVERY_ACTOR_FIXTURE' },
  });
  const entityAudit = await source.auditLog.create({
    data: {
      actor: 'system:fixture',
      entityId: user.id,
      entity: 'User',
      action: 'RECOVERY_ENTITY_FIXTURE',
    },
  });
  async function assertProductRecords(userId: string, expected: number) {
    assert.ok(restored);
    const where = { userId };
    assert.equal(await restored.session.count({ where }), expected);
    assert.equal(await restored.emailVerificationToken.count({ where }), expected);
    assert.equal(await restored.passwordResetToken.count({ where }), expected);
    assert.equal(await restored.videoWatch.count({ where }), expected);
    assert.equal(await restored.playbackSession.count({ where }), expected);
    assert.equal(
      await restored.playbackHeartbeat.count({ where: { sessionId: `playback-${userId}` } }),
      expected,
    );
    assert.equal(await restored.verifiedWatchInterval.count({ where }), expected);
  }
  stage = 'dump';
  const dump = docker([
    'pg_dump',
    '-U',
    'matiq',
    '-d',
    databases[0],
    '-Fc',
    '--no-owner',
    '--no-acl',
  ]);
  const now = new Date();
  await source.deletionTombstone.create({
    data: {
      subjectRef: user.privacySubjectId,
      requestedAt: now,
      retainUntil: new Date(now.getTime() + 35 * 86_400_000),
    },
  });
  const ledger = JSON.stringify(await exportDeletionLedger(source));
  stage = 'restore';
  docker(
    ['pg_restore', '-U', 'matiq', '-d', databases[1], '--no-owner', '--no-acl', '--exit-on-error'],
    dump,
  );
  assert.ok(await restored.athleteProfile.findUnique({ where: { userId: user.id } }));
  assert.equal(await restored.deletionTombstone.count(), 0);
  await assertProductRecords(user.id, 1);
  await assertProductRecords(control.id, 1);
  for (const record of [audit, actorAudit, entityAudit]) {
    assert.deepEqual(
      await restored.auditLog.findUniqueOrThrow({ where: { id: record.id } }),
      record,
    );
  }
  checks.push('real_dump_restore', 'post_backup_ledger_is_independent');
  assert.deepEqual(
    await restored.auditLog.findUniqueOrThrow({ where: { id: metadataAudit.id } }),
    metadataAudit,
  );
  for (const subscription of subscriptions) {
    assert.deepEqual(
      await restored.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
      subscription,
    );
  }
  stage = 'suppression';
  for (let attempt = 0; attempt < 2; attempt++) {
    stage = 'suppression';
    await reapplyDeletionLedger(restored, parseDeletionLedger(JSON.parse(ledger)));
    assert.equal(await restored.athleteProfile.findUnique({ where: { userId: user.id } }), null);
    const deleted = await restored.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.ok(deleted.deletedAt);
    const receipt: AccountDeletionRequest = await restored.accountDeletionRequest.findUniqueOrThrow(
      {
        where: { subjectRef: user.privacySubjectId },
      },
    );
    assert.ok(receipt.completedAt);
    assert.equal(
      receipt.retainUntil.toISOString(),
      new Date(Date.UTC(receipt.completedAt.getUTCFullYear() + 4, 0, 1)).toISOString(),
    );
    assert.notEqual(deleted.email, user.email);
    const unaffected: User = await restored.user.findUniqueOrThrow({ where: { id: control.id } });
    assert.equal(unaffected.email, control.email);
    assert.equal(unaffected.deletedAt, null);
    stage = 'credentials_and_viewing';
    await assertProductRecords(user.id, 0);
    await assertProductRecords(control.id, 1);
    assert.deepEqual(
      await restored.auditLog.findUniqueOrThrow({ where: { id: controlAudit.id } }),
      controlAudit,
    );
    if (attempt === 0) checks.push('credentials_and_viewing_erased', 'control_records_preserved');
    stage = 'audit_pseudonymisation';
    for (const record of [audit, actorAudit, entityAudit]) {
      assert.deepEqual(await restored.auditLog.findUniqueOrThrow({ where: { id: record.id } }), {
        ...record,
        actor: `subject:${user.privacySubjectId}`,
        entityId: null,
      });
    }
  }
  checks.push(
    'deleted_profile_suppressed',
    'repeated_application_safe',
    'control_account_preserved',
    'audit_pseudonymised',
    'playback_heartbeats_and_intervals_erased',
  );
  stage = 'remaining_privacy_review';
  const remainingMetadata = (
    await restored.auditLog.findUniqueOrThrow({ where: { id: metadataAudit.id } })
  ).metadata;
  if (
    JSON.stringify(remainingMetadata).includes(user.email) ||
    JSON.stringify(remainingMetadata).includes(user.id)
  ) {
    findings.push('audit_metadata_retains_direct_identifiers');
  }
  for (const subscription of subscriptions) {
    const current: Subscription = await restored.subscription.findUniqueOrThrow({
      where: { id: subscription.id },
    });
    if (subscription.userId === control.id) {
      assert.deepEqual(current, subscription);
      checks.push('control_subscription_preserved');
    } else {
      if (current.status === 'ACTIVE' && !current.cancelAtPeriodEnd)
        findings.push('deleted_account_subscription_still_active');
      if (current.providerCustomerId || current.providerSubscriptionId)
        findings.push('provider_identifiers_remain_linked');
    }
  }
  if (findings.length) failure = stage;
} catch {
  failure = stage;
} finally {
  for (const client of clients) {
    try {
      await client.$disconnect();
    } catch {
      failure ??= 'disconnect';
    }
  }
  for (const name of created.reverse()) {
    try {
      assert.ok(databases.includes(name));
      assert.match(name, /^matiq_drill_[a-f0-9]{24}_(source|restore)$/);
      sql('postgres', `DROP DATABASE "${name}" WITH (FORCE);`);
    } catch {
      failure ??= 'cleanup';
    }
  }
  const directory = resolve(root, 'test-results/recovery');
  await mkdir(directory, { recursive: true });
  const evidence = {
    version: 1,
    runId,
    revision,
    scope: 'synthetic-local-postgresql',
    startedAt: started.toISOString(),
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started.getTime(),
    status: failure ? 'FAILED' : 'PASSED',
    failedStage: failure,
    checks,
    findings,
  };
  await writeFile(resolve(directory, `${runId}.json`), JSON.stringify(evidence, null, 2), {
    flag: 'wx',
  });
  console.log(JSON.stringify(evidence));
  if (failure) process.exitCode = 1;
}
