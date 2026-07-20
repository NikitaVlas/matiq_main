import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from './bootstrap';

async function generate() {
  const { app, document } = await createApp();
  const directory = resolve(process.cwd(), '../../openapi');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'user-api.json'), JSON.stringify(document, null, 2));
  await app.close();
}

void generate();
