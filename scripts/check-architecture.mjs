import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const violations = [];

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

for (const file of files(path.join(root, 'apps/web/src'))) {
  const relative = path.relative(path.join(root, 'apps/web/src'), file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');
  const layer = relative.split('/')[0];
  const forbidden = layer === 'entities' ? ['features/', 'widgets/', 'screens/', 'app/'] : layer === 'features' ? ['screens/', 'app/'] : layer === 'shared' ? ['entities/', 'features/', 'widgets/', 'screens/', 'app/'] : [];
  for (const target of forbidden) if (source.includes(`from '${target}`) || source.includes(`from "${target}`)) violations.push(`${relative} imports ${target}`);
}

for (const file of files(path.join(root, 'apps/api/src/modules'))) {
  const relative = path.relative(path.join(root, 'apps/api/src/modules'), file).replaceAll('\\', '/');
  const source = fs.readFileSync(file, 'utf8');
  if (relative.includes('/application/') && /from ['"].*controllers\//.test(source)) violations.push(`${relative} imports controllers`);
  if (relative.includes('/domain/') && /(nestjs|prisma|infrastructure)/i.test(source)) violations.push(`${relative} imports framework infrastructure`);
}

if (violations.length) { console.error(['Architecture boundary violations:', ...violations].join('\n')); process.exit(1); }
console.log('Architecture boundaries passed.');
