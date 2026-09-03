import 'dotenv/config';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  exportDeletionLedger,
  parseDeletionLedger,
  reapplyDeletionLedger,
} from './deletion-ledger.js';

const [operation, destination] = process.argv.slice(2);
if (!destination || (operation !== 'export' && operation !== 'reapply')) {
  throw new Error('Usage: privacy:ledger:<export|reapply> -- <ledger-path>');
}

const db = new PrismaClient();
const filePath = resolve(destination);
try {
  if (operation === 'export') {
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(await exportDeletionLedger(db), null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temporaryPath, filePath);
    console.log(`Deletion ledger exported to ${filePath}`);
  } else {
    const snapshot = parseDeletionLedger(JSON.parse(await readFile(filePath, 'utf8')));
    const result = await reapplyDeletionLedger(db, snapshot);
    console.log(`Deletion ledger reapplied: ${result.reapplied} account(s)`);
  }
} finally {
  await db.$disconnect();
}
