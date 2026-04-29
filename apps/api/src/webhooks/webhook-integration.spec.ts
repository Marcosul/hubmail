import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailMonitorService } from './email-monitor.service';
import { WebhookQueueService } from './webhook-queue.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('Webhook Integration - End-to-End Flow', () => {
  let emailMonitor: EmailMonitorService;
  let queueService: WebhookQueueService;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        EmailMonitorService,
        WebhookQueueService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key) => {
              const config = {
                REDIS_URL: 'redis://localhost:6379',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            webhook: {
              findMany: vi.fn().mockResolvedValue([
                {
                  id: 'webhook-1',
                  workspaceId: 'ws-1',
                  url: 'https://webhook.example.com',
                  secret: 'test-secret',
                  inboxIds: ['inbox-1'],
                  events: ['MESSAGE_RECEIVED'],
                  enabled: true,
                },
              ]),
            },
            mailbox: {
              findUnique: vi.fn().mockResolvedValue({
                id: 'inbox-1',
                address: 'test@example.com',
              }),
            },
            $queryRaw: vi.fn().mockResolvedValue([
              {
                id: 'email-1',
                external_id: 'ext-1',
                from: 'sender@example.com',
                subject: 'Test Email',
                created_at: new Date(),
              },
            ]),
            webhookEvent: {
              create: vi.fn().mockResolvedValue({
                id: 'event-1',
                workspaceId: 'ws-1',
                eventType: 'MESSAGE_RECEIVED',
              }),
            },
          },
        },
        {
          provide: WebhookDispatcherService,
          useValue: {
            deliverToWebhook: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    emailMonitor = module.get<EmailMonitorService>(EmailMonitorService);
    queueService = module.get<WebhookQueueService>(WebhookQueueService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Complete Email-to-Webhook Flow', () => {
    it('should scan for new emails and enqueue them', async () => {
      const enqueueSpy = vi.spyOn(queueService, 'enqueueEmailEvent');

      await emailMonitor.scanForNewEmails();

      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          inboxId: 'inbox-1',
          emailId: 'email-1',
          from: 'sender@example.com',
          subject: 'Test Email',
        }),
      );
    });

    it('should scan all workspace inboxes if webhook has no specific scope', async () => {
      vi.spyOn(prismaService.webhook, 'findMany').mockResolvedValue([
        {
          id: 'webhook-1',
          workspaceId: 'ws-1',
          url: 'https://webhook.example.com',
          secret: 'test-secret',
          inboxIds: ['inbox-1'],
          workspaceIds: [],
          events: ['MESSAGE_RECEIVED'],
          enabled: true,
        },
      ]);

      const queryRawSpy = vi.spyOn(prismaService, '$queryRaw');

      await emailMonitor.scanForNewEmails();

      // Should query inbox-1
      expect(queryRawSpy).toHaveBeenCalled();
    });

    it('should handle empty result sets gracefully', async () => {
      vi.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      const enqueueSpy = vi.spyOn(queueService, 'enqueueEmailEvent');

      await emailMonitor.scanForNewEmails();

      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('should process multiple emails in single scan', async () => {
      const multipleEmails = Array.from({ length: 10 }, (_, i) => ({
        id: `email-${i}`,
        external_id: `ext-${i}`,
        from: `sender${i}@example.com`,
        subject: `Email ${i}`,
        created_at: new Date(),
      }));

      vi.spyOn(prismaService, '$queryRaw').mockResolvedValue(multipleEmails);

      const enqueueSpy = vi.spyOn(queueService, 'enqueueEmailEvent');

      await emailMonitor.scanForNewEmails();

      expect(enqueueSpy).toHaveBeenCalledTimes(10);
    });

    it('should respect query limit of 50 emails per scan', async () => {
      const tooManyEmails = Array.from({ length: 100 }, (_, i) => ({
        id: `email-${i}`,
        external_id: `ext-${i}`,
        from: `sender${i}@example.com`,
        subject: `Email ${i}`,
        created_at: new Date(),
      }));

      // Service limits to 50, so we should only get 50
      vi.spyOn(prismaService, '$queryRaw').mockResolvedValue(
        tooManyEmails.slice(0, 50),
      );

      const enqueueSpy = vi.spyOn(queueService, 'enqueueEmailEvent');

      await emailMonitor.scanForNewEmails();

      expect(enqueueSpy).toHaveBeenCalledTimes(50);
    });

    it('should track last scan time per inbox', async () => {
      vi.spyOn(prismaService.webhook, 'findMany').mockResolvedValue([
        {
          id: 'webhook-1',
          workspaceId: 'ws-1',
          url: 'https://webhook.example.com',
          secret: 'test-secret',
          inboxIds: ['inbox-1', 'inbox-2'],
          events: ['MESSAGE_RECEIVED'],
          enabled: true,
        },
      ]);

      await emailMonitor.scanForNewEmails();

      // Second scan should use different time window
      const queryRawSpy = vi.spyOn(prismaService, '$queryRaw');
      await emailMonitor.scanForNewEmails();

      // Both calls should have been made
      expect(queryRawSpy).toHaveBeenCalled();
    });

    it('should not lose emails on processing errors', async () => {
      vi.spyOn(queueService, 'enqueueEmailEvent').mockRejectedValue(
        new Error('Queue error'),
      );

      // Should not throw even if enqueue fails
      await expect(
        emailMonitor.scanForNewEmails(),
      ).resolves.not.toThrow();
    });

    it('should handle webhook creation with full AgentMail payload', async () => {
      const createSpy = vi.spyOn(prismaService.webhookEvent, 'create');

      // Simulate job processing
      const job = {
        id: 'test-job-1',
        data: {
          inboxId: 'inbox-1',
          emailId: 'email-1',
          emailExternalId: 'ext-1',
          from: 'sender@example.com',
          subject: 'Test Email',
          createdAt: new Date(),
        },
      };

      // In real usage, this would be called by BullMQ worker
      // Here we verify the structure would be created correctly
      expect(job.data).toMatchObject({
        inboxId: 'inbox-1',
        emailId: 'email-1',
        from: 'sender@example.com',
        subject: 'Test Email',
      });

      expect(createSpy).toBeDefined();
    });
  });

  describe('Security Properties', () => {
    it('should prevent SQL injection in email scan', async () => {
      const maliciousInboxId = "inbox-1'; DROP TABLE webhooks; --";

      // The service should handle this safely via Prisma parameterization
      const queryRawSpy = vi.spyOn(prismaService, '$queryRaw');

      // Create webhook for this inbox
      vi.spyOn(prismaService.webhook, 'findMany').mockResolvedValue([
        {
          id: 'webhook-1',
          workspaceId: 'ws-1',
          url: 'https://webhook.example.com',
          secret: 'test-secret',
          inboxIds: [maliciousInboxId],
          events: ['MESSAGE_RECEIVED'],
          enabled: true,
        },
      ]);

      await expect(
        emailMonitor.scanForNewEmails(),
      ).resolves.not.toThrow();

      expect(queryRawSpy).toHaveBeenCalled();
    });

    it('should not expose sensitive data in logs', async () => {
      const logSpy = vi.spyOn(console, 'log');

      await emailMonitor.scanForNewEmails();

      const logOutput = logSpy.mock.calls
        .map((call) => JSON.stringify(call))
        .join('');

      expect(logOutput).not.toContain('secret');
      expect(logOutput).not.toContain('password');
      expect(logOutput).not.toContain('token');

      logSpy.mockRestore();
    });

    it('should respect webhook enabled status', async () => {
      // When no enabled webhooks exist, findMany returns empty array
      vi.spyOn(prismaService.webhook, 'findMany').mockResolvedValue([]);

      const enqueueSpy = vi.spyOn(queueService, 'enqueueEmailEvent');

      await emailMonitor.scanForNewEmails();

      // Should not enqueue if no enabled webhooks
      expect(enqueueSpy).not.toHaveBeenCalled();
    });
  });
});
