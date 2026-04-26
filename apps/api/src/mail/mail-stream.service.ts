import {
  Injectable,
  Logger,
  Optional,
  Inject,
  OnModuleDestroy,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Redis } from 'ioredis';
import { REDIS_CONNECTION } from '../queue/redis.provider';

export interface MailStreamEvent {
  type: 'mail.received' | 'mail.sent' | 'mail.updated';
  workspaceId: string;
  mailboxId: string;
}

function channelFor(workspaceId: string, mailboxId: string) {
  return `mail:${workspaceId}:${mailboxId}`;
}

@Injectable()
export class MailStreamService implements OnModuleDestroy {
  private readonly log = new Logger(MailStreamService.name);
  private readonly subs = new Set<Redis>();

  constructor(
    @Optional() @Inject(REDIS_CONNECTION) private readonly redis: Redis | null,
  ) {}

  async publish(event: MailStreamEvent): Promise<void> {
    if (!this.redis) return;
    const ch = channelFor(event.workspaceId, event.mailboxId);
    await this.redis
      .publish(ch, JSON.stringify(event))
      .catch((err: Error) => this.log.warn(`SSE publish falhou: ${err.message}`));
  }

  /**
   * Retorna um Observable que emite eventos SSE para o mailbox especificado.
   * Quando Redis não está disponível, o Observable completa imediatamente e o
   * cliente faz fallback para polling.
   */
  createStream(workspaceId: string, mailboxId: string): Observable<{ data: MailStreamEvent }> {
    return new Observable((subscriber) => {
      if (!this.redis) {
        subscriber.complete();
        return;
      }

      const sub = this.redis.duplicate();
      this.subs.add(sub);
      const ch = channelFor(workspaceId, mailboxId);

      sub.subscribe(ch, (err) => {
        if (err) {
          this.log.error(`Redis subscribe erro: ${err.message}`);
          subscriber.error(err);
        }
      });

      sub.on('message', (_ch: string, msg: string) => {
        try {
          subscriber.next({ data: JSON.parse(msg) as MailStreamEvent });
        } catch {
          // mensagem malformada – ignora
        }
      });

      sub.on('error', (err: Error) => {
        this.log.error(`Redis sub erro: ${err.message}`);
        subscriber.error(err);
      });

      return () => {
        this.subs.delete(sub);
        sub.quit().catch(() => {});
      };
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.subs) {
      sub.quit().catch(() => {});
    }
    this.subs.clear();
  }
}
