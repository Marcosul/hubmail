import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import type { ServerResponse } from 'node:http';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { CurrentWorkspace } from '../tenancy/current-workspace.decorator';
import { WorkspaceGuard } from '../tenancy/workspace.guard';
import type { WorkspaceContext } from '../tenancy/workspace-context';
import { PatchMessageDto } from './dto/patch-message.dto';
import { SendMailDto } from './dto/send-mail.dto';
import { MailService } from './mail.service';
import { MailStreamService } from './mail-stream.service';

@ApiTags('mail')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard, WorkspaceGuard)
@Controller('mail')
export class MailController {
  constructor(
    private readonly mail: MailService,
    private readonly mailStream: MailStreamService,
  ) {}

  /**
   * SSE – eventos em tempo real para o mailbox (nova mensagem, enviada, atualizada).
   * Usa resposta raw para compatibilidade com Fastify sem depender de @Sse().
   */
  @Get('stream')
  @ApiOperation({ summary: 'SSE: eventos em tempo real do mailbox' })
  @ApiQuery({ name: 'mailboxId', required: true })
  async streamEvents(
    @Res() reply: { raw: ServerResponse },
    @Query('mailboxId') mailboxId: string,
    @CurrentWorkspace() ws: WorkspaceContext,
  ): Promise<void> {
    const { raw } = reply;
    raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    raw.setHeader('Cache-Control', 'no-cache, no-transform');
    raw.setHeader('Connection', 'keep-alive');
    raw.setHeader('X-Accel-Buffering', 'no');
    raw.writeHead(200);
    raw.write(':\n\n'); // comentário inicial (mantém conexão viva em proxies)

    const sub = this.mailStream.createStream(ws.workspaceId, mailboxId).subscribe({
      next: (event) => {
        if (!raw.writableEnded) {
          raw.write(`data: ${JSON.stringify(event.data)}\n\n`);
        }
      },
      error: () => { if (!raw.writableEnded) raw.end(); },
      complete: () => { if (!raw.writableEnded) raw.end(); },
    });

    const ping = setInterval(() => {
      if (raw.writableEnded) { clearInterval(ping); return; }
      raw.write(':\n\n');
    }, 25_000);

    raw.on('close', () => {
      clearInterval(ping);
      sub.unsubscribe();
    });
  }

  @Get('mailboxes')
  @ApiOperation({ summary: 'Pastas JMAP do mailbox seleccionado (Inbox, Sent, etc)' })
  @ApiQuery({ name: 'mailboxId', required: true })
  listFolders(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Query('mailboxId') mailboxId: string,
  ) {
    return this.mail.listMailboxes(ws.workspaceId, mailboxId);
  }

  @Get('threads')
  @ApiOperation({ summary: 'Lista threads no mailbox/pasta (suporta ?q= para busca)' })
  @ApiQuery({ name: 'mailboxId', required: true })
  @ApiQuery({ name: 'folderId', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false })
  listThreads(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Query('mailboxId') mailboxId: string,
    @Query('folderId') folderId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.mail.listThreads(ws.workspaceId, mailboxId, {
      folderId,
      cursor: cursor ? Number(cursor) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: q?.trim() || undefined,
    });
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Detalhe de uma thread com mensagens' })
  getThread(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') threadId: string,
    @Query('mailboxId') mailboxId: string,
  ) {
    return this.mail.getThread(ws.workspaceId, mailboxId, threadId);
  }

  @Get('messages/:id/raw')
  @ApiOperation({ summary: 'Corpo HTML sanitizado + texto da mensagem' })
  getMessage(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') emailId: string,
    @Query('mailboxId') mailboxId: string,
  ) {
    return this.mail.getMessageRaw(ws.workspaceId, mailboxId, emailId);
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Atualiza flags/labels/mailbox de uma mensagem' })
  patchMessage(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') emailId: string,
    @Body() dto: PatchMessageDto,
  ) {
    return this.mail.patch(ws.workspaceId, emailId, dto);
  }

  @Post('search')
  @ApiOperation({ summary: 'Procura por texto (JMAP Email/query com filter.text)' })
  search(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Body() body: { mailboxId: string; q: string; folderId?: string; cursor?: number; limit?: number },
  ) {
    return this.mail.listThreads(ws.workspaceId, body.mailboxId, {
      folderId: body.folderId,
      cursor: body.cursor,
      limit: body.limit,
      search: body.q,
    });
  }

  @Post('send')
  @ApiOperation({ summary: 'Envia email (SMTP submission, 587/STARTTLS)' })
  send(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: User,
    @Body() dto: SendMailDto,
  ) {
    return this.mail.send(ws.workspaceId, user.id, dto);
  }
}
