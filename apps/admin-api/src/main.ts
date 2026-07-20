import 'reflect-metadata';
import { createApp } from './bootstrap';

async function main() {
  const { app } = await createApp();
  await app.listen(Number(process.env.ADMIN_API_PORT ?? 4001));
}

void main();
