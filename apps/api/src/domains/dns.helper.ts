import { Injectable, Logger } from '@nestjs/common';
import type { DnsSetupRow } from './domains.service';
import { StalwartAdapter } from './stalwart.helper';

@Injectable()
export class DnsHelper {
  private readonly log = new Logger(DnsHelper.name);

  constructor(private readonly emailServer: StalwartAdapter) {}

  async appendMailAuthHintsIfMissing(
    rows: DnsSetupRow[],
    domainName: string,
    mxHost: string,
  ): Promise<void> {
    const mx = mxHost.replace(/\.$/, '');
    const hasSpf = rows.some((r) => r.type === 'TXT' && r.value.toLowerCase().includes('v=spf1'));
    const hasDmarc = rows.some((r) => r.type === 'TXT' && r.host.toLowerCase().includes('_dmarc'));

    if (!hasSpf) {
      rows.push({
        id: 'hint-spf',
        label: 'SPF — autoriza o servidor de envio (evita 550 em destinos como Gmail)',
        type: 'TXT',
        host: '@',
        value: `v=spf1 mx a:${mx} ~all`,
        source: 'hint',
      });
    }

    const dkimKeys = await this.emailServer.getDkimKeys(domainName);
    let dkimHintsAdded = 0;
    for (const key of dkimKeys) {
      const host = `${key.selector}._domainkey`;
      const alreadyHas = rows.some(
        (r) => r.type === 'TXT' && r.host.toLowerCase() === host.toLowerCase(),
      );
      if (!alreadyHas) {
        rows.push({
          id: `hint-dkim-${key.selector}`,
          label: `DKIM (${key.algorithm.toUpperCase()}) — assinatura criptográfica`,
          type: 'TXT',
          host,
          value: `v=DKIM1; k=${key.algorithm}; p=${key.publicKey}`,
          source: 'hint',
        });
        dkimHintsAdded++;
      }
    }

    if (!hasDmarc) {
      rows.push({
        id: 'hint-dmarc',
        label: 'DMARC — política de segurança e relatórios de entrega',
        type: 'TXT',
        host: '_dmarc',
        value: `v=DMARC1; p=none; rua=mailto:postmaster@${domainName}`,
        source: 'hint',
      });
    }

    const added = (!hasSpf ? 1 : 0) + dkimHintsAdded + (!hasDmarc ? 1 : 0);
    if (added > 0) {
      this.log.log(
        `\x1b[36m📝\x1b[0m DNS mail-auth: \x1b[33m${domainName}\x1b[0m — acrescentadas \x1b[32m${added}\x1b[0m sugestões (SPF/DKIM/DMARC) em falta na lista`,
      );
    }
  }

  isEssentialRow(row: DnsSetupRow, domainName: string): boolean {
    const type = row.type.toUpperCase();
    const host = row.host.toLowerCase().replace(/\.$/, '');
    const value = row.value.toLowerCase();
    const apexHosts = new Set(['@', domainName.toLowerCase()]);

    if (type === 'TXT' && host === '_hubmail') return true;
    if (type === 'MX' && apexHosts.has(host)) return true;
    if (type === 'TXT' && value.includes('v=spf1')) return true;
    if (type === 'TXT' && (host.includes('_domainkey') || value.includes('v=dkim1'))) return true;
    if (type === 'TXT' && host.includes('_dmarc')) return true;
    return false;
  }

  sortEssentialRows(rows: DnsSetupRow[], domainName: string): DnsSetupRow[] {
    const normalizedDomain = domainName.toLowerCase();
    const order = (row: DnsSetupRow): number => {
      const type = row.type.toUpperCase();
      const host = row.host.toLowerCase().replace(/\.$/, '');
      const value = row.value.toLowerCase();

      if (type === 'TXT' && host === '_hubmail') return 10;
      if (type === 'MX' && (host === '@' || host === normalizedDomain)) return 20;
      if (type === 'TXT' && value.includes('v=spf1')) return 30;
      if (type === 'TXT' && (host.includes('_domainkey') || value.includes('v=dkim1'))) return 40;
      if (type === 'TXT' && host.includes('_dmarc')) return 50;
      return 99;
    };
    return [...rows].sort((a, b) => order(a) - order(b));
  }

  normalizeMxValueAndPriority(rows: DnsSetupRow[]): DnsSetupRow[] {
    return rows.map((row) => {
      if (row.type.toUpperCase() !== 'MX') return row;
      const value = row.value.trim();
      const m = value.match(/^(\d+)\s+(.+)$/);
      if (!m) return { ...row, value: value.replace(/\.$/, '') };
      const [, prioRaw, hostRaw] = m;
      const priority = Number(prioRaw);
      if (!Number.isFinite(priority)) return row;
      return { ...row, priority: row.priority ?? priority, value: hostRaw.trim().replace(/\.$/, '') };
    });
  }

  dedupeDnsRows(rows: DnsSetupRow[]): DnsSetupRow[] {
    const seen = new Set<string>();
    const out: DnsSetupRow[] = [];
    for (const row of rows) {
      const key = [
        row.type.toUpperCase(),
        row.host.toLowerCase().replace(/\.$/, ''),
        row.value.toLowerCase().replace(/\.$/, ''),
        row.priority ?? '',
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  parseZoneFileToRows(zoneText: string, domainName: string): DnsSetupRow[] {
    const lines = zoneText.split(/\r?\n/).map((l) => l.trim());
    const logicalLines: string[] = [];
    let acc = '';
    let parenBalance = 0;

    for (const line of lines) {
      if (!line) continue;
      if (!acc) acc = line;
      else acc += ` ${line}`;
      parenBalance += (line.match(/\(/g) ?? []).length;
      parenBalance -= (line.match(/\)/g) ?? []).length;
      if (parenBalance <= 0) {
        logicalLines.push(acc);
        acc = '';
        parenBalance = 0;
      }
    }
    if (acc) logicalLines.push(acc);

    const rows: DnsSetupRow[] = [];
    let i = 0;
    for (const line of logicalLines) {
      if (!line || line.startsWith(';') || line.startsWith('$')) continue;
      const m = line.match(/^(\S+)\s+(?:(\d+)\s+)?(?:IN\s+)?(TXT|MX|CNAME|SRV|NS|A|AAAA)\s+(.+)$/i);
      if (!m) continue;
      const [, name, , type, rest] = m;
      let value = rest
        .replace(/^\(\s*/, '')
        .replace(/\s*\)$/, '')
        .replace(/"\s+"/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^"(.*)"$/, '$1')
        .trim();

      let priority: number | undefined;
      if (type.toUpperCase() === 'MX') {
        const mxMatch = value.match(/^(\d+)\s+(.+)$/);
        if (mxMatch) {
          priority = Number(mxMatch[1]);
          value = mxMatch[2].trim();
        }
      }

      rows.push({
        id: `zone-${i++}`,
        label: type.toUpperCase(),
        type: type.toUpperCase(),
        host: this.normalizeDnsHostForUi(name, domainName),
        value,
        ...(priority !== undefined ? { priority } : {}),
        source: 'stalwart',
      });
    }
    return rows;
  }

  private normalizeDnsHostForUi(hostRaw: string, domainName: string): string {
    const host = hostRaw.replace(/\.$/, '').toLowerCase();
    const domain = domainName.toLowerCase();
    if (host === domain) return '@';
    if (host.endsWith(`.${domain}`)) return host.slice(0, -(domain.length + 1));
    return host;
  }
}
