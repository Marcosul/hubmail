/**
 * O `schema.prisma` usa `STORAGE_POSTGRES_PRISMA_URL` e `STORAGE_POSTGRES_URL_NON_POOLING`.
 * Muitos setups (legado, tutoriais Prisma, `prisma migrate`) ainda expõem só `DATABASE_URL` / `DIRECT_URL`.
 *
 * Este módulo deve ser importado **antes** de `@prisma/client`. Também carrega `.env` de forma
 * síncrona (antes do `ConfigModule`), para `nest start` / turbo com cwd na raiz do monorepo.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseDotenv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (let line of content.split(/\r?\n/)) {
    if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || /\s/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadApiDotenvFiles(): void {
  const dirs = new Set<string>();
  dirs.add(process.cwd());
  dirs.add(resolve(process.cwd(), 'apps/api'));
  try {
    dirs.add(resolve(__dirname, '..'));
    dirs.add(resolve(__dirname, '../..'));
  } catch {
    /* ignore */
  }

  for (const dir of dirs) {
    for (const name of ['.env', '.env.local']) {
      const p = resolve(dir, name);
      if (!existsSync(p)) continue;
      try {
        const parsed = parseDotenv(readFileSync(p, 'utf8'));
        for (const [k, v] of Object.entries(parsed)) {
          const cur = process.env[k];
          if (cur === undefined || cur === '') {
            process.env[k] = v;
          }
        }
      } catch {
        /* ignore */
      }
    }
  }
}

function t(v: string | undefined): string | undefined {
  const s = v?.trim();
  return s || undefined;
}

let applied = false;

export function applyPrismaDatabaseEnvAliases(): void {
  if (applied) return;
  applied = true;

  loadApiDotenvFiles();

  const storagePrisma = t(process.env.STORAGE_POSTGRES_PRISMA_URL);
  const storageDirect = t(process.env.STORAGE_POSTGRES_URL_NON_POOLING);
  const legacyDb = t(process.env.DATABASE_URL);
  const legacyDirect = t(process.env.DIRECT_URL);

  if (!storagePrisma && legacyDb) {
    process.env.STORAGE_POSTGRES_PRISMA_URL = legacyDb;
  }
  if (!storageDirect && legacyDirect) {
    process.env.STORAGE_POSTGRES_URL_NON_POOLING = legacyDirect;
  }

  const effectivePrisma = t(process.env.STORAGE_POSTGRES_PRISMA_URL);
  const effectiveDirect = t(process.env.STORAGE_POSTGRES_URL_NON_POOLING);

  if (effectivePrisma && !t(process.env.DATABASE_URL)) {
    process.env.DATABASE_URL = effectivePrisma;
  }
  if (effectiveDirect && !t(process.env.DIRECT_URL)) {
    process.env.DIRECT_URL = effectiveDirect;
  }
}

applyPrismaDatabaseEnvAliases();
