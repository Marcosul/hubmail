/**
 * Lê `apps/api/.env` e `apps/webmail/.env.local` e cria/atualiza variáveis
 * no ambiente **production** dos projetos Vercel (scope gr-digital).
 * Requisitos: `pnpm vercel:login` e rede.
 *
 * Uso: pnpm run vercel:push-env:production
 */
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEAM = 'gr-digital';
const API_PROJECT = 'hubmail-api';
const WEBMAIL_PROJECT = 'hubmail-webmail';
/** API pública (domínio custom; usada em NEXT_PUBLIC_API_URL) */
const API_PUBLIC_URL = 'https://api.hubmail.to';
/** Domínio canónico do webmail (CORS, redirects, NEXT_PUBLIC_*) */
const WEBMAIL_PUBLIC_URL = 'https://hubmail.to';

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Ficheiro em falta: ${filePath}`);
  }
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

/**
 * @param {string} relCwd
 * @param {string[]} vercelArgs
 * @param {string|null} input
 */
function vercelRun(relCwd, vercelArgs, input = null) {
  const args = [
    'exec',
    'vercel',
    '--cwd',
    relCwd,
    ...vercelArgs,
  ];
  const result = spawnSync('pnpm', args, {
    cwd: ROOT,
    stdio: input != null ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input: input != null ? input : undefined,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.stdout) process.stdout.write(result.stdout);
    return false;
  }
  return true;
}

function link(relCwd, project) {
  return vercelRun(relCwd, [
    'link',
    '--yes',
    '--scope',
    TEAM,
    '--project',
    project,
  ]);
}

function envAdd(relCwd, name, value) {
  return vercelRun(
    relCwd,
    ['env', 'add', name, 'production', '--yes', '--force', '--sensitive'],
    value,
  );
}

function envAddPublic(relCwd, name, value) {
  return vercelRun(
    relCwd,
    ['env', 'add', name, 'production', '--yes', '--force', '--no-sensitive'],
    value,
  );
}

/** @param {Record<string, string>} webEnv */
function nextPublicFromEnv(webEnv) {
  const o = {};
  for (const [k, v] of Object.entries(webEnv)) {
    if (k.startsWith('NEXT_PUBLIC_') && v) o[k] = v;
  }
  return o;
}

function main() {
  const apiPath = path.join(ROOT, 'apps/api/.env');
  const webPath = path.join(ROOT, 'apps/webmail/.env.local');

  console.log('A ligar hubmail-api…');
  if (!link('apps/api', API_PROJECT)) process.exit(1);
  console.log('A ligar hubmail-webmail…');
  if (!link('apps/webmail', WEBMAIL_PROJECT)) process.exit(1);

  const apiEnv = parseEnv(apiPath);
  const webEnv = parseEnv(webPath);

  const supabaseAnon =
    apiEnv.STORAGE_SUPABASE_ANON_KEY ||
    apiEnv.SUPABASE_ANON_KEY ||
    webEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    webEnv.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY;
  if (!supabaseAnon) {
    console.error(
      'Falta STORAGE_SUPABASE_ANON_KEY (ou legacy SUPABASE_*) na API, ou chave anon no webmail .env.local',
    );
    process.exit(1);
  }

  const supabaseUrl = apiEnv.STORAGE_SUPABASE_URL || apiEnv.SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('Falta STORAGE_SUPABASE_URL (ou SUPABASE_URL) no .env da API');
    process.exit(1);
  }

  const serviceKey =
    apiEnv.STORAGE_SUPABASE_SERVICE_ROLE_KEY || apiEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('Falta STORAGE_SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }

  const databaseUrl =
    apiEnv.STORAGE_POSTGRES_PRISMA_URL || apiEnv.DATABASE_URL;
  const directUrl =
    apiEnv.STORAGE_POSTGRES_URL_NON_POOLING || apiEnv.DIRECT_URL;
  if (!databaseUrl || !directUrl) {
    console.error(
      'Falta STORAGE_POSTGRES_PRISMA_URL e STORAGE_POSTGRES_URL_NON_POOLING (ou legacy DATABASE_URL / DIRECT_URL) no .env da API',
    );
    process.exit(1);
  }

  const coreApi = {
    STORAGE_SUPABASE_URL: supabaseUrl,
    STORAGE_SUPABASE_ANON_KEY: supabaseAnon,
    STORAGE_SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    STORAGE_POSTGRES_PRISMA_URL: databaseUrl,
    STORAGE_POSTGRES_URL_NON_POOLING: directUrl,
    APP_URL: `${WEBMAIL_PUBLIC_URL},https://www.hubmail.to`,
    WORKERS_ENABLED: 'false',
    SWAGGER_DISABLED: 'true',
  };

  const optionalApi = {
    MAIL_CREDENTIAL_KEY: apiEnv.MAIL_CREDENTIAL_KEY,
    STALWART_JMAP_URL: apiEnv.STALWART_JMAP_URL,
    STALWART_SMTP_HOST: apiEnv.STALWART_SMTP_HOST,
    STALWART_SMTP_PORT: apiEnv.STALWART_SMTP_PORT,
    WEBHOOK_DEFAULT_SECRET: apiEnv.WEBHOOK_DEFAULT_SECRET,
    REDIS_URL: apiEnv.REDIS_URL,
  };
  for (const [name, v] of Object.entries(optionalApi)) {
    if (!v) continue;
    console.log(`API production (opcional): ${name}`);
    if (!envAdd('apps/api', name, v)) process.exit(1);
  }

  for (const [name, v] of Object.entries(coreApi)) {
    if (!v) {
      console.error(`Valor em falta para API: ${name}`);
      process.exit(1);
    }
    console.log(`API production: ${name}`);
    if (!envAdd('apps/api', name, v)) process.exit(1);
  }

  for (const [k, v] of Object.entries(apiEnv)) {
    if (!k.startsWith('STORAGE_') || !v) continue;
    if (k === 'STORAGE_SUPABASE_JWT_SECRET' || k.includes('SECRET') || k.includes('PASSWORD')) {
      console.log(`API production (STORAGE, sensível): ${k}`);
    } else {
      console.log(`API production: ${k}`);
    }
    if (!envAdd('apps/api', k, v)) process.exit(1);
  }

  const webPublic = nextPublicFromEnv(webEnv);
  Object.assign(webPublic, {
    NEXT_PUBLIC_APP_URL: WEBMAIL_PUBLIC_URL,
    NEXT_PUBLIC_AUTH_REDIRECT_URL: `${WEBMAIL_PUBLIC_URL}/auth/callback`,
    NEXT_PUBLIC_API_URL: `${API_PUBLIC_URL}/api`,
  });

  const hasSupabaseForWeb =
    webPublic.NEXT_PUBLIC_SUPABASE_URL || webPublic.NEXT_PUBLIC_STORAGE_SUPABASE_URL;
  const hasAnonForWeb =
    webPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY || webPublic.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY;
  if (!hasSupabaseForWeb || !hasAnonForWeb) {
    console.error('Falta URL Supabase pública (NEXT_PUBLIC_*) no webmail .env.local');
    process.exit(1);
  }

  for (const [name, v] of Object.entries(webPublic)) {
    if (v == null || v === '') {
      console.error(`Valor vazio: ${name}`);
      process.exit(1);
    }
    console.log(`Webmail production: ${name}`);
    if (!envAddPublic('apps/webmail', name, v)) process.exit(1);
  }

  console.log('Concluído. Faz um redeploy na Vercel para aplicar (ou push em main).');
}

main();
