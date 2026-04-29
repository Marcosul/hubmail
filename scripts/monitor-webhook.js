#!/usr/bin/env node

/**
 * Monitor webhook deliveries in real-time
 * Usage: node scripts/monitor-webhook.js [webhookId] [interval]
 *
 * Examples:
 *   node scripts/monitor-webhook.js 55df22c1-2751-4652-8c62-4c2a6e41e3f8
 *   node scripts/monitor-webhook.js 55df22c1-2751-4652-8c62-4c2a6e41e3f8 5000
 */

const { PrismaClient } = require('@prisma/client');

const webhookId = process.argv[2];
const interval = Math.max(parseInt(process.argv[3] ?? '3000', 10), 1000);

if (!webhookId) {
  console.error('Usage: node scripts/monitor-webhook.js <webhookId> [intervalMs]');
  process.exit(1);
}

const prisma = new PrismaClient();
let lastCheck = null;

async function check() {
  try {
    const attempts = await prisma.webhookAttempt.findMany({
      where: { webhook: { id: webhookId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { event: true }
    });

    if (lastCheck === null) {
      console.clear();
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  Webhook Monitor — ' + webhookId.slice(0, 8) + '...                          ║');
      console.log('║  Checking every ' + (interval / 1000).toFixed(1) + 's (Ctrl+C to exit)                       ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('');
    }

    if (!lastCheck || attempts[0]?.id !== lastCheck?.id) {
      console.clear();
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  Webhook Monitor — ' + webhookId.slice(0, 8) + '...                          ║');
      console.log('║  Updated: ' + new Date().toLocaleTimeString('pt-BR') + '                                   ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('');
      lastCheck = attempts[0];
    }

    const summary = {
      succeeded: attempts.filter(a => a.status === 'SUCCEEDED').length,
      failed: attempts.filter(a => a.status === 'FAILED').length,
      total: attempts.length
    };

    console.log(`Recent attempts (last 5): SUCCEEDED=${summary.succeeded} | FAILED=${summary.failed}`);
    console.log('');
    console.log('Latest attempts:');

    attempts.slice(0, 3).forEach((attempt, idx) => {
      const emoji = attempt.status === 'SUCCEEDED' ? '✅' : '❌';
      const time = new Date(attempt.createdAt).toLocaleTimeString('pt-BR');
      const code = attempt.statusCode ?? '---';
      const type = attempt.event?.eventType ?? 'UNKNOWN';

      console.log(`  ${emoji} [${time}] ${type} (${code}) — ${attempt.durationMs}ms`);
    });

    if (attempts.length === 0) {
      console.log('  (no deliveries yet)');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
const timer = setInterval(check, interval);

process.on('SIGINT', () => {
  clearInterval(timer);
  prisma.$disconnect().then(() => {
    console.log('\n\nMonitor stopped.');
    process.exit(0);
  });
});
