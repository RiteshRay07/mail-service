# Mail Service Microservice

A scalable email microservice built with Node.js, BullMQ, Redis, and Nodemailer for asynchronous email processing.

## Features

* Asynchronous email delivery using BullMQ and Redis
* Producer-Consumer architecture
* Background worker processing
* Retry mechanism with exponential backoff
* API Key authentication
* Multiple email types support
  * OTP Mail
  * Welcome Mail
  * Login Alert Mail
  * Logout Alert Mail
* Reusable email templates
* Separate worker process for email processing
* Cloud Redis compatible (Upstash, Redis Cloud, etc.)
---

## Architecture

```text
Client / Backend Service
          │
          ▼
      Producer API
          │
          ▼
      BullMQ Queue
          │
          ▼
         Redis
          │
          ▼
    Consumer Worker
          │
          ▼
      Nodemailer
          │
          ▼
       SMTP Server
          │
          ▼
      User Inbox
```

---

## Tech Stack

### Backend

* Node.js
* Express.js

### Queue System

* BullMQ
* Redis

### Email

* Nodemailer
* Gmail SMTP


---

## Project Structure

```text
mail-service/
│
├── config/
│   ├── redis.js
│   ├── mailer.js
│   └── mail_queue.js
│
├── services/
│   └── sendMail.js
│
├── templates/
│   ├── otpTemplate.js
│   ├── welcomeTemplate.js
│   ├── loginTemplate.js
│   └── logoutTemplate.js
│
├── producer.js
├── consumer.js
├── .env
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/RiteshRay07/mail-service.git

cd mail-service
```

### Install Dependencies

```bash
npm install
```

### Start Redis

```bash
redis-server
```

### Configure Environment Variables

Create a `.env` file:

```env
PORT=5500

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

API_KEY=your_secret_api_key

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## Run Application

### Start Producer

```bash
npm run producer
```

### Start Consumer

```bash
npm run consumer
```

Producer and Consumer run independently.

---

## API Authentication

Every request must include:

```http
x-api-key: your_secret_api_key
```

Unauthorized requests are rejected with HTTP 401.

---

## Send Mail API

### Endpoint

```http
POST /send-mail
```

### Headers

```http
Content-Type: application/json
x-api-key: your_secret_api_key
```

---

## OTP Mail

```json
{
  "type": "otp-mail",
  "to": "user@example.com",
  "otp": "123456"
}
```

---

## Welcome Mail

```json
{
  "type": "welcome-mail",
  "to": "user@example.com",
  "name": "Ritesh"
}
```

---

## Login Alert Mail

```json
{
  "type": "login-alert",
  "to": "user@example.com",
  "device": "Chrome on Windows"
}
```

---

## Logout Alert Mail

```json
{
  "type": "logout-alert",
  "to": "user@example.com",
  "device": "Chrome on Windows"
}
```

---


## Reliability Features

- Automatic retry mechanism for failed jobs
- Up to 5 retry attempts
- Exponential backoff strategy between retries
- Automatic cleanup of completed jobs
- Failed jobs retained for debugging


---

## Supported Email Types

### OTP Mail

Used for authentication and account verification.

### Welcome Mail

Sent after successful registration.

### Login Alert Mail

Sent when a user logs into the system.

### Logout Alert Mail

Sent when a user logs out of the system.

---



## Future Improvements

* Email scheduling
* Queue priorities
* Rate limiting
* HTML email templates
* Multiple queues
* Dedicated SMTP providers
* Webhook support

---

## Learning Outcomes

This project demonstrates:

* Queue-Based Systems
* Redis Integration
* Producer-Consumer Pattern
* Retry Mechanisms
* API Security
* Asynchronous Processing
* Scalable Email Delivery Systems

