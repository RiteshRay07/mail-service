# Mail Service — Interview Revision Guide

A structured recap of this project for interview preparation.

---

## 30-Second Elevator Pitch

> "I built an **asynchronous email microservice** using a **producer–consumer pattern**. Other backend services call a REST API to queue emails; the API doesn't send mail directly — it pushes jobs into a **Redis-backed BullMQ queue**. A separate **worker process** picks up jobs, renders HTML templates, and sends via **Nodemailer/SMTP**. This decouples email delivery from the main app, improves reliability with retries, and lets workers scale independently."

---

## Architecture

```text
Main App / Client
       │
       │  POST /send-mail  (x-api-key)
       ▼
   Producer (Express API)     ← producer.js
       │
       │  mailQueue.add(type, data)
       ▼
   BullMQ Queue ("mail-queue")
       │
       ▼
      Redis                    ← shared message broker
       │
       ▼
   Consumer (Worker)           ← consumer.js
       │
       ├── templates (OTP, welcome, login, logout)
       ├── sendMail()
       ▼
   Nodemailer → Gmail SMTP → User Inbox
```

**Key idea:** Producer and consumer are **separate processes** (and can be separate containers). They only talk through Redis.

---

## File-by-File Breakdown

| File | Role |
|------|------|
| `config/redis.js` | Shared Redis connection via `ioredis` |
| `config/mail_queue.js` | BullMQ `Queue` named `"mail-queue"` |
| `producer.js` | HTTP API — validates, enqueues jobs, returns fast |
| `consumer.js` | BullMQ `Worker` — processes jobs, sends emails |
| `config/mailer.js` | Nodemailer SMTP transporter |
| `services/sendMail.js` | Thin wrapper around `transporter.sendMail()` |
| `templates/*.js` | HTML email templates per mail type |

---

## End-to-End Flow

1. **Client** sends `POST /send-mail` with `x-api-key` header and body:
   ```json
   { "type": "otp-mail", "to": "user@example.com", "otp": "123456" }
   ```

2. **Producer** (`producer.js`):
   - Validates API key → `401` if wrong
   - Validates `type` against allowed list → `400` if invalid
   - Adds job to queue: `mailQueue.add(type, data, options)`
   - Returns `201` with `jobId` immediately — **does not wait for email to send**

3. **Redis + BullMQ** store the job with metadata (attempts, backoff, etc.)

4. **Consumer** (`consumer.js`):
   - Worker listens on `"mail-queue"`
   - Uses `job.name` (the `type`) in a `switch` to pick template + subject
   - Calls `sendMail()` → Nodemailer → SMTP

5. **Events:** `completed` / `failed` handlers log job status

---

## Important Technical Decisions

### 1. Why Producer–Consumer / Message Queue?

**Problem:** Sending email synchronously in a login/signup API is slow (SMTP can take 1–5+ seconds) and fragile (SMTP down = your API fails).

**Solution:** API only **enqueues** and responds in milliseconds. Email sending happens in the background.

**Benefits:**
- **Decoupling** — main app doesn't depend on SMTP availability
- **Resilience** — retries on failure
- **Scalability** — run multiple consumers
- **Burst handling** — queue absorbs traffic spikes

### 2. Why Redis + BullMQ?

- **Redis** = fast in-memory store, good for queues
- **BullMQ** = Node.js job queue on Redis with retries, backoff, job lifecycle built in

**Alternatives:**

| Option | Trade-off |
|--------|-----------|
| Direct SMTP in API | Simple, but slow and tightly coupled |
| RabbitMQ / Kafka | More powerful for complex event streaming; heavier ops |
| AWS SQS + Lambda | Managed, good at scale; vendor lock-in |
| Database polling | Easy but inefficient and harder to scale |

This choice fits a **learning project + small/medium scale** well.

### 3. Retry Configuration

```js
const job = await mailQueue.add(type, data, {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 3000,
  },
  removeOnComplete: true,
  removeOnFail: 100,
});
```

- **5 attempts** — transient SMTP/network failures get retried
- **Exponential backoff** — waits 3s, then 6s, 12s… reduces hammering a failing server
- **removeOnComplete: true** — keeps Redis clean
- **removeOnFail: 100** — keeps last 100 failed jobs for debugging

### 4. `maxRetriesPerRequest: null` in Redis Config

```js
export const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});
```

BullMQ **requires** this for blocking operations (workers waiting on jobs). Without it, ioredis can throw errors.

### 5. API Key Authentication

```js
const apiKey = req.headers["x-api-key"];
if (!apiKey || apiKey !== process.env.API_KEY) {
  return res.status(401).json({ success: false, message: "Unauthorized" });
}
```

Only trusted internal services should call this API. Simple but effective for a microservice boundary.

### 6. Job Name = Mail Type

`mailQueue.add(type, data)` — first arg becomes `job.name`. Consumer routes on `job.name`. Clean pattern for multiple email types without separate queues.

---

## Docker / Deployment

`Docker-compose.yml` runs 3 services:

- **redis** — message broker
- **producer** — API on port 5000
- **consumer** — background worker

Both producer and consumer use `REDIS_HOST: redis` (Docker network hostname). They share the same image, different `command`.

---

## Supported Email Types

| Type | Payload | Use Case |
|------|---------|----------|
| `otp-mail` | `to`, `otp` | Auth / verification |
| `welcome-mail` | `to`, `name` | Post-registration |
| `login-alert` | `to`, `device` | Security notification |
| `logout-alert` | `to`, `device` | Security notification |

---

## API Examples

### Headers (all requests)

```http
Content-Type: application/json
x-api-key: your_secret_api_key
```

### OTP Mail

```json
{
  "type": "otp-mail",
  "to": "user@example.com",
  "otp": "123456"
}
```

### Welcome Mail

```json
{
  "type": "welcome-mail",
  "to": "user@example.com",
  "name": "Ritesh"
}
```

### Login Alert

```json
{
  "type": "login-alert",
  "to": "user@example.com",
  "device": "Chrome on Windows"
}
```

### Logout Alert

```json
{
  "type": "logout-alert",
  "to": "user@example.com",
  "device": "Chrome on Windows"
}
```

---

## Common Interview Questions + Answers

### "Why not send email directly in the API?"

> SMTP is slow and unreliable. Queuing keeps API response time low and isolates failures. If email fails, the user's signup/login still succeeds; we retry in the background.

### "What happens if Redis goes down?"

> Producer can't enqueue (returns 500). Consumer can't process. In production I'd use managed Redis (Upstash, Redis Cloud) with persistence, monitoring, and possibly a fallback or dead-letter strategy.

### "What happens if the consumer crashes mid-job?"

> BullMQ marks the job as active. If the worker dies without completing, the job becomes **stalled** and can be picked up again by another worker (BullMQ handles this).

### "How would you scale this?"

> Run **multiple consumer instances** — they all listen to the same queue; BullMQ ensures each job is processed once. Producer can scale behind a load balancer. Redis becomes the bottleneck at very high scale (then consider Redis Cluster or a dedicated broker).

### "How do you prevent duplicate emails?"

> BullMQ processes each job once per attempt. For true idempotency (e.g. "send welcome email only once"), I'd add an idempotency key in the job data and check Redis/DB before sending.

### "What's the difference between a queue and pub/sub?"

> **Queue** = one consumer processes each message (work distribution). **Pub/sub** = broadcast to many subscribers. Email sending needs queue semantics — each email is a task for one worker.

### "Why separate producer and consumer processes?"

> Different scaling needs: API might need 2 instances; workers might need 10 during a campaign. Separation also means a memory leak or crash in the worker doesn't take down the API.

### "What would you improve?"

- Rate limiting (avoid SMTP throttling)
- Structured logging + monitoring (job metrics, failed job dashboard)
- Dead letter queue for permanently failed jobs
- HTML template engine (Handlebars/EJS) instead of raw strings
- Health checks (`/health` on producer, worker heartbeat)
- Input validation (email format, required fields per type)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| API | Express.js |
| Queue | BullMQ |
| Broker | Redis (ioredis) |
| Email | Nodemailer + Gmail SMTP |
| Deployment | Docker + Docker Compose |

---

## How to Demo in an Interview

1. Start Redis → `npm run producer` → `npm run consumer`
2. `POST /send-mail` with curl/Postman
3. Show **instant 201** with `jobId`
4. Show consumer logs: `Processing job: otp-mail` → `Job X completed`
5. Mention you can run **2 consumers** and jobs distribute between them

### Quick curl Example

```bash
curl -X POST http://localhost:5001/send-mail \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_secret_api_key" \
  -d '{"type":"otp-mail","to":"user@example.com","otp":"123456"}'
```

---

## Weak Points to Acknowledge (Shows Maturity)

- No request body validation beyond `type` (missing `to` could fail in worker)
- API key in header is basic (JWT/service mesh in larger systems)
- No observability (metrics, tracing)
- Gmail SMTP isn't ideal for production volume (SendGrid, SES, Resend)
- Consumer `default` case only logs — doesn't fail the job explicitly

**Framing:** "This was a learning project focused on queue architecture. In production I'd add validation, monitoring, and a transactional email provider."

---

## Resume Bullet

> Built an asynchronous email microservice using Node.js, BullMQ, and Redis with a producer–consumer architecture; implemented retry with exponential backoff, API key auth, and Dockerized multi-container deployment for scalable background email processing.

---

## Key Concepts to Remember

- **Asynchronous processing** — API responds fast, work happens in background
- **Producer–consumer pattern** — decoupled services communicating via a queue
- **Message broker (Redis)** — persistent, reliable job storage
- **Job queue (BullMQ)** — retries, backoff, job lifecycle management
- **Microservice boundary** — dedicated service for one responsibility (email)
- **Horizontal scaling** — add more workers, not bigger servers
- **Fail-safe design** — retries + job retention for debugging

---

## Run Commands (Quick Reference)

```bash
# Install
npm install

# Start Redis (local)
redis-server

# Start services
npm run producer
npm run consumer

# Dev mode (auto-reload)
npm run producer:dev
npm run consumer:dev

# Docker
docker-compose up
```
