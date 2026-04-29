# Webhook Integration Setup Complete ✅

## Status

The webhook integration is **fully operational** and ready for testing.

### Configuration

- **Webhook ID (HubMail):** `55df22c1-2751-4652-8c62-4c2a6e41e3f8`
- **Webhook ID (Stalwart):** `ioollkdctaqa`
- **Callback URL:** `https://api.hubmail.to/api/webhooks/stalwart/55df22c1-2751-4652-8c62-4c2a6e41e3f8`
- **Final URL:** `https://supersquad-backend.fly.dev/api/workflows/webhook/aac55c92-bf32-40d6-ace0-f6c8a288bc00`
- **Status:** ✅ Enabled
- **Subscribed Events:**
  - `message-ingest.ham` (emails received)
  - `message-ingest.error` (blocked emails)
  - `message-ingest.spam` (spam emails)
  - `delivery.completed` (email sent)
  - `delivery.delivered` (email delivered)
  - `delivery.failed` (delivery failure)
  - `incoming-report.dmarc-report` (DMARC reports)
  - `delivery.message-rejected` (rejected emails)

## Architecture

```
Email → Stalwart (mail.hubmail.to)
         ↓
         [message-ingest.ham event]
         ↓
         HTTP POST to callback URL
         ↓
HubMail Callback Controller (stalwart-callback.controller.ts)
         ↓
         [Convert to AgentMail format]
         ↓
Webhook Dispatcher (with retries)
         ↓
         HTTP POST to user's final URL
         ↓
User's Backend (supersquad-backend.fly.dev)
```

## Testing

### Option 1: Monitor Real Emails
Send an email to `remessas_codcage@supersquad.app` and watch the delivery logs:

```bash
node scripts/monitor-webhook.js 55df22c1-2751-4652-8c62-4c2a6e41e3f8
```

### Option 2: Simulate Stalwart Event
Test the entire flow with a simulated event:

```bash
curl -X POST https://api.hubmail.to/api/webhooks/stalwart/55df22c1-2751-4652-8c62-4c2a6e41e3f8 \
  -H "Content-Type: application/json" \
  -d '{
    "typeId": "message-ingest.ham",
    "from": "test@example.com",
    "to": "remessas_codcage@supersquad.app",
    "recipient": "remessas_codcage@supersquad.app",
    "subject": "Test Email",
    "createdAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "size": 1024
  }'
```

Expected response: `{"ok":true,"dispatched":1}`

### Option 3: Send Test Event from WebMail
Use the HubMail WebMail UI to send a test event (already tested and working).

## Verification

### Recent Successful Deliveries

```
✅ [12:18:58] MESSAGE_RECEIVED (200) — 13883ms
✅ [10:51:50] MESSAGE_RECEIVED (200) — 23510ms
```

Both deliveries completed successfully with HTTP 200 status.

## Payload Format

When Stalwart fires an event, it gets converted to AgentMail format:

```json
{
  "event_id": "uuid",
  "event_type": "message.received",
  "type": "event",
  "message": {
    "from": "sender@example.com",
    "to": ["remessas_codcage@supersquad.app"],
    "subject": "Email Subject",
    "created_at": "2026-04-29T12:18:58",
    ...more fields
  },
  "thread": {
    "thread_id": "thread_msgid",
    "message_count": 1,
    "subject": "Email Subject",
    ...more fields
  }
}
```

## Debugging

### Check Webhook Status in Stalwart

```bash
curl -s -X POST http://mail.hubmail.to:8080/jmap \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'admin@hubmail.to:IZkXuz8OkspObVlQ' | base64)" \
  -d '{
    "using": ["urn:ietf:params:jmap:core", "urn:stalwart:jmap"],
    "methodCalls": [
      ["x:WebHook/get", {"ids": ["ioollkdctaqa"]}, "check"]
    ]
  }' | jq '.methodResponses[0][1].list[0] | {url, enable, events}'
```

### View Recent Webhook Events

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.webhookAttempt.findMany({
  where: { webhook: { id: '55df22c1-2751-4652-8c62-4c2a6e41e3f8' } },
  orderBy: { createdAt: 'desc' },
  take: 10,
  include: { event: true }
}).then(a => {
  a.forEach(x => {
    const status = x.status === 'SUCCEEDED' ? '✅' : '❌';
    console.log(status, x.createdAt.toLocaleString('pt-BR'), x.status, x.statusCode || '');
  });
  process.exit(0);
}).finally(() => p.\$disconnect());
"
```

## Next Steps

1. **Send a real email** to `remessas_codcage@supersquad.app`
2. **Monitor delivery** using `node scripts/monitor-webhook.js ...`
3. **Verify** the email triggers the webhook and delivers to the final URL

If no events appear within 30 seconds, check:
- ✅ Stalwart webhook is enabled (verified above)
- ✅ Callback URL is reachable (tested working)
- ⚠️ Email is actually arriving in Stalwart (check via WebMail)
- ⚠️ Email matches the watched domain/inbox (remessas_codcage@supersquad.app)

## Files Modified

- `apps/api/src/webhooks/stalwart-callback.controller.ts` — Callback endpoint
- `apps/api/src/webhooks/stalwart-webhooks.helper.ts` — Stalwart registration
- `apps/api/src/webhooks/webhooks.service.ts` — Webhook management
- `apps/api/src/webhooks/webhook-dispatcher.service.ts` — Delivery with retries
- `apps/webmail/src/components/webhooks/...` — UI components (schema tree, JSON viewer)

## Deployed

Vercel production deployment includes all changes and is ready to use.
