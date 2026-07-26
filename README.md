# Vidhrrumaa Node.js App

Express API that powers two forms on the website: **Contact us** and
**Careers/apply**. Both endpoints send an email via SMTP.

## Stack

- Node.js + Express + TypeScript
- Joi for input validation
- Nodemailer for sending email
- Multer for optional file/resume attachments

## Project layout

```
src/
  app.ts              Express app: middleware + routes
  server.ts           Starts the HTTP server, handles shutdown
  config/             Env config + a small console logger
  middleware/         CSRF, rate limiting, upload, validation, errors
  routes/             URL -> controller wiring
  controllers/         Thin request/response handlers
  services/           Business logic (build + send emails)
  validators/         Joi schemas for each form
  utils/              ApiError, asyncHandler, CSRF token helpers
tests/
  email.test.ts
```

Request flow: `middleware -> routes -> validators -> controllers -> services`.
Controllers stay thin; the actual work (building and sending the email) lives
in `services/`.

## Security

These endpoints are public forms, so there's no login. Instead:

- **CORS allow-list** – only origins listed in `CORS_ORIGINS` can call the API.
- **CSRF token** – the client calls `GET /csrf-token` first, then sends that
  token back in the `x-csrf-token` header on every POST. See
  `src/utils/csrfToken.ts`.
- **Rate limiting** – per-IP limits on the email endpoints (stricter) and on
  the API as a whole.
- **Honeypot field** – a hidden `website` field that must stay empty; bots
  that auto-fill every field get rejected.

## Setup

Requires Node.js 18+.

```bash
npm install
cp .env.example .env.local
# edit .env.local: set CORS_ORIGINS, CSRF_SECRET, SMTP_* at minimum

# generate a CSRF secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm run dev
```

`.env.local` is loaded for local dev/test, `.env.prod` is loaded when
`NODE_ENV=production` (see `src/config/index.ts`). Neither is committed to
git - copy `.env.example` to whichever one matches what you're running.

The server runs at `http://localhost:3000`. Check it with:

```bash
curl http://localhost:3000/api/v1/health
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run locally with auto-reload (ts-node + nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled app (`app.js` -> `dist/src/server.js`) |
| `npm test` | Run the Jest test suite |
| `npm run lint` | Run ESLint |

## Environment variables

See `.env.example` for the full list with comments. The app validates these
at startup and refuses to start if something required is missing.
`.env.local` (dev/test) and `.env.prod` (production) hold the actual values.

| Variable | Purpose |
|---|---|
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API |
| `CSRF_SECRET` | Random secret (32+ chars) used to sign the CSRF cookie |
| `SMTP_HOST/PORT/SECURE/USER/PASS` | Your mail provider |
| `MAIL_FROM` | From address used on outgoing mail |
| `MAIL_CONTACT_TO` | Where contact form submissions are sent |
| `MAIL_CAREERS_TO` | Where career applications are sent |
| `MAX_UPLOAD_MB` | Max attachment size (default 5) |
| `RATE_LIMIT_*` | Rate limit windows/limits |

## API

Base URL: `/api/v1`

### `GET /health`
Returns `{ success, status: "ok", uptime, timestamp }`.

### `GET /csrf-token`
Returns `{ csrfToken }` and sets the CSRF cookie. Call this before submitting
either form.

### `POST /email/contact`
Requires the `x-csrf-token` header. `multipart/form-data` or JSON.

| Field | Required | Notes |
|---|---|---|
| `fullName` | yes | 2–120 chars |
| `email` | yes | valid email |
| `message` | yes | 5–5000 chars |
| `attachment` | no | pdf/doc/docx/png/jpg/txt, ≤ 5 MB |
| `website` | no | honeypot, must stay empty |

Success: `202 { success: true, message, data: { reference } }`.

### `POST /email/careers`
Requires the `x-csrf-token` header. `multipart/form-data`.

| Field | Required | Notes |
|---|---|---|
| `firstName` / `lastName` | yes | |
| `email` | yes | valid email |
| `contactNumber` | yes | phone format |
| `areaOfInterest` | yes | |
| `yearsOfExperience` | yes | 0–60 |
| `domains` | yes | array, or comma-separated / JSON string |
| `softwareExpertise` | yes | array, or comma-separated / JSON string |
| `coverLetter` | no | ≤ 8000 chars |
| `resume` | no* | pdf/doc/docx/png/jpg/txt, ≤ 5 MB |
| `website` | no | honeypot, must stay empty |

\* optional at the API level; make it required in the React form if you want
every application to include a resume.

Errors always look like:

```json
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "...", "details": [] }, "requestId": "..." }
```

## Calling it from React

See [`examples/react-client.md`](examples/react-client.md) for a copy-paste
fetch helper and form components.

## Deployment

See [`DEPLOYMENT-GODADDY.md`](DEPLOYMENT-GODADDY.md) for GoDaddy cPanel and
VPS instructions.

## Logging

Logs go to stdout/stderr (console), one line per event with a timestamp and
level. Every request gets a `requestId`, echoed back in the `x-request-id`
response header, so you can match a user's report to a log line.
