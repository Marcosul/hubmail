export type DkimKey = { publicKey: string; selector: string; algorithm: string };

export type EnsureDomainResult = {
  id: string | null;
  zoneText: string;
  detail?: string;
};

export interface IEmailServerAdapter {
  /** Retorna true se credenciais de gestão estão configuradas. */
  isConfigured(): boolean;

  /** Cria ou garante que o domínio existe no servidor, retornando o zone file. */
  ensureDomain(name: string, aliases: string[]): Promise<EnsureDomainResult>;

  /** Retorna as chaves DKIM publicadas para o domínio. */
  getDkimKeys(domainName: string): Promise<DkimKey[]>;
}
