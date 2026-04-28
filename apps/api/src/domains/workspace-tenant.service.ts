import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StalwartAdapter } from './stalwart.helper';

/**
 * Garante que cada workspace tem um Tenant correspondente no Stalwart.
 * Estratégia de backfill lazy: workspaces criados antes da feature ficam sem
 * tenant até alguém provisionar domínio/mailbox/grupo, momento em que o tenant
 * é criado on-demand e persistido em `Workspace.stalwartTenantId`.
 */
@Injectable()
export class WorkspaceTenantService {
  private readonly log = new Logger(WorkspaceTenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stalwart: StalwartAdapter,
  ) {}

  /**
   * Retorna o stalwartTenantId do workspace, criando-o se necessário.
   * Retorna null quando Stalwart não está configurado ou houve falha não fatal.
   */
  async ensureForWorkspace(workspaceId: string): Promise<string | null> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, stalwartTenantId: true },
    });
    if (!ws) return null;
    if (ws.stalwartTenantId) return ws.stalwartTenantId;
    if (!this.stalwart.isConfigured()) return null;

    const tenantId = await this.stalwart.ensureTenant(ws.slug, ws.name);
    if (!tenantId) {
      this.log.warn(`Stalwart não retornou tenantId para workspace ${ws.slug}`);
      return null;
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { stalwartTenantId: tenantId },
    });
    this.log.log(`Workspace ${ws.slug} associado ao tenant ${tenantId}`);
    return tenantId;
  }
}
