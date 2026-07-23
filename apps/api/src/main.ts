import 'reflect-metadata';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), '../../.env'), override: false });
import { createApp } from './bootstrap';

async function main() {
  const { app } = await createApp();
  await app.listen(Number(process.env.USER_API_PORT ?? 4000));
}

void main();
