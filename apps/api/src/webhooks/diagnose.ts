import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  try {
    console.log('\n📋 WEBHOOK SYSTEM DIAGNOSIS\n');

    // 1. Find webhooks
    const webhooks = await prisma.webhook.findMany({
      where: { enabled: true },
    });

    console.log(`1️⃣ WEBHOOKS FOUND: ${webhooks.length}`);
    for (const webhook of webhooks) {
      console.log(`   • ID: ${webhook.id}`);
      console.log(`   • URL: ${webhook.url}`);
      console.log(`   • Enabled: ${webhook.enabled}`);
      console.log(`   • Events: ${webhook.events.join(', ')}`);
      console.log(`   • InboxIds: ${webhook.inboxIds.join(', ')}`);
      console.log('');
    }

    if (webhooks.length === 0) {
      console.log('   ⚠️  No enabled webhooks found!\n');
      return;
    }

    // 2. Find inboxes with webhooks
    const inboxIds = new Set<string>();
    for (const webhook of webhooks) {
      (webhook.inboxIds ?? []).forEach((id) => inboxIds.add(id));
    }

    console.log(
      `2️⃣ INBOXES WITH WEBHOOKS: ${inboxIds.size}`,
    );
    for (const inboxId of inboxIds) {
      const inbox = await prisma.mailbox.findUnique({
        where: { id: inboxId },
        select: { id: true, address: true },
      });
      if (inbox) {
        console.log(`   • ${inbox.address} (${inbox.id})`);
      } else {
        console.log(`   • ⚠️  Inbox not found: ${inboxId}`);
      }
    }
    console.log('');

    // 3. Check for recent emails
    console.log(`3️⃣ RECENT EMAILS IN WEBHOOK INBOXES`);
    for (const inboxId of inboxIds) {
      const recentEmails = await prisma.mailbox_message.findMany({
        where: { mailbox_id: inboxId },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          external_id: true,
          from: true,
          subject: true,
          created_at: true,
        },
      });

      console.log(`   📧 Inbox ${inboxId}:`);
      if (recentEmails.length === 0) {
        console.log('      No emails found');
      } else {
        for (const email of recentEmails) {
          const timestamp = email.created_at.toISOString();
          console.log(`      • [${timestamp}] From: ${email.from}`);
          console.log(`        Subject: ${email.subject}`);
          console.log(`        ID: ${email.id}`);
        }
      }
      console.log('');
    }

    // 4. Check Redis connection
    console.log(`4️⃣ REDIS QUEUE STATUS`);
    console.log(`   REDIS_URL: ${process.env.REDIS_URL || 'NOT SET'}`);
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.ping();
      console.log('   ✅ Redis connected');
      await redis.disconnect();
    } catch (err) {
      console.log(`   ❌ Redis error: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log('');

    // 5. Check webhook events
    console.log(`5️⃣ RECENT WEBHOOK EVENTS (last 10)`);
    const events = await prisma.webhookEvent.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        eventType: true,
        messageId: true,
        created_at: true,
        status: true,
      },
    });

    if (events.length === 0) {
      console.log('   No webhook events found - EmailMonitorService may not be running!');
    } else {
      for (const event of events) {
        console.log(`   • [${event.created_at.toISOString()}] ${event.eventType}`);
        console.log(`     Message: ${event.messageId}`);
        console.log(`     Status: ${event.status}`);
      }
    }
    console.log('');

    console.log('✅ DIAGNOSIS COMPLETE\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
