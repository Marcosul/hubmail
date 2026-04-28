import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JmapClient, type JmapCredentials } from '../mail/jmap.client';
import type { IEmailServerAdapter, DkimKey, EnsureDomainResult } from './email-server.adapter';

@Injectable()
export class StalwartAdapter implements IEmailServerAdapter {
  private readonly log = new Logger(StalwartAdapter.name);

  constructor(
    private readonly jmap: JmapClient,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.creds());
  }

  async ensureDomain(name: string, aliases: string[]): Promise<EnsureDomainResult> {
    const creds = this.creds();
    if (!creds) return { id: null, zoneText: '', detail: 'stalwart_not_configured' };

    const normalized = name.trim().toLowerCase();
    let id = await this.findDomainId(creds, normalized);
    const createKey = 'hubmailProvision';

    if (!id) {
      const createPayload: Record<string, unknown> = {
        name: normalized,
        certificateManagement: { '@type': 'Manual' },
        dkimManagement: { '@type': 'Automatic' },
        dnsManagement: { '@type': 'Manual' },
        subAddressing: { '@type': 'Enabled' },
      };
      if (aliases.length > 0) createPayload.aliases = aliases;

      const setRes = await this.jmap.invokeStalwartManagement(creds, [
        ['x:Domain/set', { create: { [createKey]: createPayload } }, 's1'],
      ]);
      const setPayload = setRes.find((r) => r[0] === 'x:Domain/set')?.[1] as {
        created?: Record<string, string>;
        notCreated?: Record<string, { type?: string; description?: string }>;
      };
      const createdId = setPayload?.created?.[createKey];
      if (createdId) {
        id = createdId;
        this.log.log(
          `\x1b[32m✨\x1b[0m Domínio \x1b[36m${normalized}\x1b[0m criado no Stalwart (id \x1b[33m${createdId}\x1b[0m)`,
        );
      } else {
        const err = this.extractSetError(setPayload);
        this.log.warn(
          `\x1b[33m⚠️\x1b[0m Stalwart x:Domain/set não criou \x1b[36m${normalized}\x1b[0m${err ? `: ${err}` : ''}`,
        );
        id = await this.findDomainId(creds, normalized);
        if (!id) return { id: null, zoneText: '', detail: err ?? 'create_failed' };
      }
    } else {
      try {
        await this.jmap.invokeStalwartManagement(creds, [
          [
            'x:Domain/set',
            { update: { [id]: { dkimManagement: { '@type': 'Automatic' }, subAddressing: { '@type': 'Enabled' } } } },
            'u1',
          ],
        ]);
      } catch (e) {
        this.log.debug(`Falha ao atualizar configurações do domínio existente ${normalized}: ${e}`);
      }
    }

    await this.renameDkimSelectors(creds, id);

    const getRes = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/get', { ids: [id] }, 'g2'],
    ]);
    const domainObj = (
      getRes.find((r) => r[0] === 'x:Domain/get')?.[1] as {
        list?: { dnsZoneFile?: unknown }[];
      }
    )?.list?.[0];
    const zoneText = unwrapText(domainObj?.dnsZoneFile);
    return { id, zoneText };
  }

  /**
   * Renomeia selectors DKIM gerados automaticamente pelo Stalwart
   * (ex.: v1-rsa-YYYYMMDD, v1-ed25519-YYYYMMDD) para o padrão hubmail:
   * RSA → hubmail-rsa, ed25519 → hubmail-ed.
   */
  private async renameDkimSelectors(creds: JmapCredentials, domainId: string): Promise<void> {
    try {
      const responses = await this.jmap.invokeStalwartManagement(creds, [
        ['x:DkimSignature/query', { filter: { domainId } }, 'q-dkim'],
        [
          'x:DkimSignature/get',
          { '#ids': { resultOf: 'q-dkim', name: 'x:DkimSignature/query', path: '/ids' } },
          'g-dkim',
        ],
      ]);
      const list = (responses.find((r) => r[0] === 'x:DkimSignature/get')?.[1] as {
        list?: { id?: string; selector?: string; '@type'?: string }[];
      })?.list ?? [];

      const update: Record<string, { selector: string }> = {};
      for (const sig of list) {
        if (!sig.id || !sig.selector) continue;
        const type = (sig['@type'] || '').toLowerCase();
        const desired = type.includes('ed25519') ? 'hubmail-ed' : 'hubmail-rsa';
        if (sig.selector !== desired) update[sig.id] = { selector: desired };
      }
      if (Object.keys(update).length === 0) return;

      const setRes = await this.jmap.invokeStalwartManagement(creds, [
        ['x:DkimSignature/set', { update }, 's-dkim'],
      ]);
      const payload = setRes.find((r) => r[0] === 'x:DkimSignature/set')?.[1] as {
        updated?: Record<string, unknown>;
        notUpdated?: Record<string, { type?: string; description?: string }>;
      };
      const okCount = Object.keys(payload?.updated ?? {}).length;
      const failCount = Object.keys(payload?.notUpdated ?? {}).length;
      if (okCount > 0) {
        this.log.log(
          `\x1b[32m🔁\x1b[0m DKIM selectors renomeados: \x1b[32m${okCount}\x1b[0m atualizados${failCount ? `, \x1b[31m${failCount}\x1b[0m falharam` : ''}`,
        );
      }
      if (failCount > 0) {
        for (const [sid, err] of Object.entries(payload!.notUpdated!)) {
          this.log.warn(`DKIM rename falhou para ${sid}: ${err?.description ?? err?.type ?? 'unknown'}`);
        }
      }
    } catch (e) {
      this.log.warn(`Falha ao renomear selectors DKIM (domainId=${domainId}): ${e}`);
    }
  }

  async getDkimKeys(domainName: string): Promise<DkimKey[]> {
    const creds = this.creds();
    if (!creds) return [];

    try {
      const domainId = await this.findDomainId(creds, domainName.toLowerCase());
      if (!domainId) {
        this.log.debug(`[DKIM] Domínio não encontrado: ${domainName}`);
        return [];
      }

      this.log.debug(`[DKIM] Query para domainId=${domainId}, domainName=${domainName}`);

      await this.renameDkimSelectors(creds, domainId);

      const responses = await this.jmap.invokeStalwartManagement(creds, [
        [
          'x:DkimSignature/query',
          { filter: { domainId } },
          'q-dkim',
        ],
        [
          'x:DkimSignature/get',
          { '#ids': { resultOf: 'q-dkim', name: 'x:DkimSignature/query', path: '/ids' } },
          'g-dkim',
        ],
      ]);

      const queryRes = responses.find((r) => r[0] === 'x:DkimSignature/query')?.[1] as { ids?: string[] };
      const ids = queryRes?.ids ?? [];
      this.log.debug(`[DKIM] Query retornou ${ids.length} IDs: ${ids.join(', ')}`);

      const getRes = responses.find((r) => r[0] === 'x:DkimSignature/get')?.[1] as {
        list?: {
          id?: string;
          publicKey?: string;
          selector?: string;
          '@type'?: string;
          keyId?: string;
        }[];
      };

      if (!getRes?.list?.length) {
        this.log.debug(`[DKIM] Get retornou lista vazia para ${domainName}`);
        return [];
      }

      this.log.debug(`[DKIM] Get retornou ${getRes.list.length} assinaturas:`);
      for (const item of getRes.list) {
        this.log.debug(
          `  - id=${item.id}, selector=${item.selector}, @type=${item['@type']}, hasPublicKey=${!!item.publicKey}`,
        );
      }

      const keys: DkimKey[] = [];
      for (const sig of getRes.list) {
        if (sig.publicKey && sig.selector) {
          const type = (sig['@type'] || '').toLowerCase();
          const key: DkimKey = {
            publicKey: sig.publicKey,
            selector: sig.selector,
            algorithm: type.includes('ed25519') ? 'ed25519' : 'rsa',
          };
          keys.push(key);
          this.log.debug(`[DKIM] Adicionada chave: selector=${key.selector}, algorithm=${key.algorithm}`);
        }
      }

      if (keys.length > 0) {
        this.log.log(
          `\x1b[32m✅\x1b[0m DKIM para \x1b[36m${domainName}\x1b[0m: ${keys.length} chave(s) encontrada(s)`,
        );
        return keys;
      }

      this.log.debug(`[DKIM] Nenhuma publicKey encontrada nas assinaturas, tentando DkimKey separado`);

      // publicKey pode estar em DkimKey separado
      const keyIds = getRes.list.map((s) => s.keyId).filter(Boolean) as string[];
      if (keyIds.length === 0) {
        this.log.debug(`[DKIM] Nenhum keyId disponível`);
        return keys;
      }

      const keyRes = await this.jmap.invokeStalwartManagement(creds, [
        ['x:DkimKey/get', { ids: keyIds }, 'gk'],
      ]);
      const keyPayload = keyRes.find((r) => r[0] === 'x:DkimKey/get')?.[1] as {
        list?: { id: string; publicKey: string; algorithm?: string }[];
      };

      for (const sig of getRes.list) {
        const kObj = keyPayload?.list?.find((k) => k.id === sig.keyId);
        if (kObj?.publicKey && sig.selector) {
          const type = (sig['@type'] || '').toLowerCase();
          keys.push({
            publicKey: kObj.publicKey,
            selector: sig.selector,
            algorithm: type.includes('ed25519') ? 'ed25519' : kObj.algorithm || 'rsa',
          });
        }
      }

      if (keys.length > 0) {
        this.log.log(
          `\x1b[32m✅\x1b[0m DKIM para \x1b[36m${domainName}\x1b[0m: ${keys.length} chave(s) de DkimKey`,
        );
      }

      return keys;
    } catch (e) {
      this.log.error(`❌ Falha ao buscar DKIM keys para ${domainName}:`, e);
      return [];
    }
  }

  async deleteDomainDkim(domainName: string): Promise<{ ok: boolean; detail?: string; count?: number }> {
    const creds = this.creds();
    if (!creds) return { ok: false, detail: 'stalwart_not_configured' };

    const normalized = domainName.trim().toLowerCase();
    const domainId = await this.findDomainId(creds, normalized);
    if (!domainId) return { ok: true, count: 0 };

    try {
      const count = await this.destroyDkimSignatures(creds, domainId);
      return { ok: true, count };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.log.warn(`Falha ao remover assinaturas DKIM de ${normalized}: ${detail}`);
      return { ok: false, detail };
    }
  }

  async deleteDomainRecord(domainName: string): Promise<{ ok: boolean; detail?: string }> {
    const creds = this.creds();
    if (!creds) return { ok: false, detail: 'stalwart_not_configured' };

    const normalized = domainName.trim().toLowerCase();
    const domainId = await this.findDomainId(creds, normalized);
    if (!domainId) return { ok: true };

    try {
      const res = await this.jmap.invokeStalwartManagement(creds, [
        ['x:Domain/set', { destroy: [domainId] }, 'd1'],
      ]);
      const payload = res.find((r) => r[0] === 'x:Domain/set')?.[1] as {
        destroyed?: string[];
        notDestroyed?: Record<string, { type?: string; description?: string }>;
      };
      if (payload?.destroyed?.includes(domainId)) {
        this.log.log(
          `\x1b[31m🗑️\x1b[0m Domínio \x1b[36m${normalized}\x1b[0m removido do Stalwart (id \x1b[33m${domainId}\x1b[0m)`,
        );
        return { ok: true };
      }
      const err = payload?.notDestroyed?.[domainId];
      const detail = err?.description ?? err?.type ?? 'destroy_failed';
      this.log.warn(`Stalwart não removeu domínio ${normalized}: ${detail}`);
      return { ok: false, detail };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.log.error(`Erro ao deletar domínio ${normalized} no Stalwart: ${detail}`);
      return { ok: false, detail };
    }
  }

  async deleteAccount(accountId: string): Promise<{ ok: boolean; detail?: string }> {
    const creds = this.creds();
    if (!creds) return { ok: false, detail: 'stalwart_not_configured' };

    try {
      const res = await this.jmap.invokeStalwartManagement(creds, [
        ['x:Account/set', { destroy: [accountId] }, 'p1'],
      ]);
      const payload = res.find((r) => r[0] === 'x:Account/set')?.[1] as {
        destroyed?: string[];
        notDestroyed?: Record<string, { type?: string; description?: string }>;
      };
      if (payload?.destroyed?.includes(accountId)) {
        this.log.log(`\x1b[31m🗑️\x1b[0m Account \x1b[33m${accountId}\x1b[0m removida do Stalwart`);
        return { ok: true };
      }
      const err = payload?.notDestroyed?.[accountId];
      const detail = err?.description ?? err?.type ?? 'destroy_failed';
      this.log.warn(`Stalwart não removeu account ${accountId}: ${detail}`);
      return { ok: false, detail };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.log.error(`Erro ao deletar account ${accountId} no Stalwart: ${detail}`);
      return { ok: false, detail };
    }
  }

  private async destroyDkimSignatures(creds: JmapCredentials, domainId: string): Promise<number> {
    const responses = await this.jmap.invokeStalwartManagement(creds, [
      ['x:DkimSignature/query', { filter: { domainId } }, 'q-dkim-del'],
    ]);
    const ids = (responses.find((r) => r[0] === 'x:DkimSignature/query')?.[1] as { ids?: string[] })?.ids ?? [];
    if (ids.length === 0) return 0;
    await this.jmap.invokeStalwartManagement(creds, [
      ['x:DkimSignature/set', { destroy: ids }, 's-dkim-del'],
    ]);
    this.log.log(`\x1b[31m🧹\x1b[0m DKIM signatures removidas: \x1b[33m${ids.length}\x1b[0m`);
    return ids.length;
  }

  private creds(): JmapCredentials | null {
    const username = this.config.get<string>('STALWART_MANAGEMENT_EMAIL')?.trim();
    const password = this.config.get<string>('STALWART_MANAGEMENT_PASSWORD')?.trim();
    if (!username || !password) return null;
    return { username, password };
  }

  private async findDomainId(creds: JmapCredentials, normalizedName: string): Promise<string | null> {
    const responses = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/query', { filter: { name: normalizedName }, limit: 50 }, 'q1'],
    ]);
    const qr = responses.find((r) => r[0] === 'x:Domain/query')?.[1] as { ids?: string[] };
    const ids = qr?.ids ?? [];
    if (!ids.length) return null;

    const getRes = await this.jmap.invokeStalwartManagement(creds, [
      ['x:Domain/get', { ids }, 'g1'],
    ]);
    const list =
      (getRes.find((r) => r[0] === 'x:Domain/get')?.[1] as {
        list?: { id?: string; name?: string }[];
      })?.list ?? [];
    const hit = list.find((d) => (d.name ?? '').toLowerCase() === normalizedName);
    return hit?.id ?? null;
  }

  private extractSetError(setResult: unknown): string | undefined {
    if (!setResult || typeof setResult !== 'object') return undefined;
    const nc = (setResult as { notCreated?: Record<string, { type?: string; description?: string }> }).notCreated;
    if (!nc) return undefined;
    const first = Object.values(nc)[0];
    return first?.description ?? first?.type ?? 'set_failed';
  }
}

export function unwrapText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'value' in val) {
    const v = (val as { value?: unknown }).value;
    if (typeof v === 'string') return v;
  }
  return '';
}
