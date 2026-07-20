import 'reflect-metadata';
import { createApp } from './bootstrap';

async function main() {
  const { app } = await createApp();
  await app.listen(Number(process.env.USER_API_PORT ?? 4000));
}

void main();
