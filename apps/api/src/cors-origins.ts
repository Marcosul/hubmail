import type { IncomingHttpHeaders } from 'node:http';

/**
 * Lógica partilhada entre o bootstrap Nest e o handler serverless (Vercel)
 * para que o preflight e os erros 500 incluam sempre CORS.
 */

const DEFAULT_CORS_HUBMAIL = ['https://hubmail.to', 'https://www.hubmail.to'] as const;

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function expandOriginsForCors(origins: string[]): string[] {
  const set = new Set<string>();
  for (const o of origins) {
    if (!o) continue;
    set.add(o);
    try {
      const u = new URL(o);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      if (u.hostname === 'localhost' || u.hostname.startsWith('127.')) continue;
      if (u.hostname.startsWith('www.')) {
        set.add(
          `${u.protocol}//${u.hostname.slice(4)}${u.port ? `:${u.port}` : ''}`,
        );
      } else {
        set.add(`${u.protocol}//www.${u.host}`);
      }
    } catch {
      /* ignore */
    }
  }
  return [...set];
}

export function getCorsAllowList(): string[] {
  const appOrigins = parseOrigins(process.env.APP_URL);
  const extraOrigins = process.env.CORS_ORIGINS
    ? parseOrigins(process.env.CORS_ORIGINS)
    : [];
  let baseOrigins = [...new Set([...appOrigins, ...extraOrigins])];
  if (baseOrigins.length === 0) {
    const onVercel = Boolean(
      process.env.VERCEL || process.env.VERCEL_URL || process.env.VERCEL_ENV,
    );
    baseOrigins = onVercel ? [...DEFAULT_CORS_HUBMAIL] : ['http://localhost:3010'];
  }
  return expandOriginsForCors(baseOrigins);
}

export function getRequestOrigin(req: { headers: IncomingHttpHeaders }): string | undefined {
  const raw = req.headers.origin;
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw === 'string') return raw;
  return undefined;
}

/** CORS mínimo para respostas de erro geradas fora do Nest (p.ex. falha de `app.init()`). */
export function applyCorsToNodeError(
  res: { setHeader: (n: string, v: string) => void },
  origin: string | undefined,
  allowList: string[],
): void {
  if (origin && allowList.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
}

export function applyCorsForPreflight(
  res: { setHeader: (n: string, v: string) => void; end: (body?: string) => void; statusCode: number },
  origin: string,
): void {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Workspace-Id, X-Requested-With',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.statusCode = 204;
  res.end();
}
