# SafePath API

SafePath is a safety incident reporting and management API. Users can register,
report incidents, upload incident images, browse approved public incidents,
comment on approved incidents, and manage their accounts. Administrators can
review incidents, moderate comments, manage users, and handle account lifecycle
requests.

## Main Technologies

- Bun and Node.js
- TypeScript
- Express 5
- PostgreSQL
- Prisma ORM
- Redis
- Zod
- JWT authentication
- Cloudinary image storage
- Nodemailer
- Vercel deployment support

## Key Features

- User registration, email verification, login, logout, and token refresh
- Google sign-in with verified ID tokens and automatic account linking
- Password reset and account restore flows
- Role-based access for users, admins, and super admins
- Public listing and details for approved incidents only
- Authenticated users can create, edit, and delete pending incidents
- Incident image upload and replacement through Cloudinary
- Paginated comments on approved incidents with ownership and moderation
- Admin incident review with approval and rejection notes
- User blocking, restoration, and account deletion workflows
- Admin change requests reviewed by super admins
- Authenticated dashboard overview
- Public contact form with rate limiting, database storage, and email notifications
- Redis-backed services and scheduled account cleanup
- Automatic demo account and incident seeding when the server starts

## Dependencies

### Runtime

- `express`, `cors`, `helmet`, `compression`, `cookie-parser`
- `@prisma/client`, `@prisma/adapter-pg`, `pg`
- `jsonwebtoken`, `bcryptjs`, `google-auth-library`
- `zod`, `http-status`
- `multer`, `cloudinary`
- `redis`, `node-cron`
- `nodemailer`, `dotenv`, `winston`

### Development and Build

- `typescript`
- `tsx`
- `tsup`
- `prisma`
- `@biomejs/biome`
- Bun type definitions and Node.js package type definitions

## Local Setup

### Requirements

- Bun
- Node.js
- PostgreSQL
- Redis
- A Cloudinary account for image uploads
- An SMTP account for email features

### Installation

```bash
cd safe-path-server
bun install
```

Create a local environment file:

```bash
copy .env.example .env
```

Update `.env` with your PostgreSQL, Redis, JWT, Google, Cloudinary, SMTP, and
seed configuration values. Never commit the `.env` file or real credentials.

For Google sign-in, set `GOOGLE_CLIENT_ID` to the same Web Client ID used by the
frontend. The API verifies Google ID tokens against this audience; no client
secret is required.

### Database Setup

Generate the Prisma client and apply migrations:

```bash
bun run db:generate
bun run db:migrate
```

The server automatically runs the seed process during startup. This creates
the configured demo accounts and demo incidents if they do not already exist.

### Run in Development

```bash
bun run dev
```

### Build and Run in Production Mode

```bash
bun run build
bun start
```

The default API URL is:

```text
http://localhost:5000/api/v1
```

Health check:

```text
http://localhost:5000/health
```

## Useful Commands

```bash
bun run typecheck
bun run format:check
bun run lint:check
bun run db:studio
```

## API Overview

| Area           | Base path             |
| -------------- | --------------------- |
| Authentication | `/api/v1/auth`        |
| Contact        | `/api/v1/contact`     |
| Users          | `/api/v1/users`       |
| Incidents      | `/api/v1/incidents`   |
| Dashboard      | `/api/v1/dashboard`   |
| Admin          | `/api/v1/admin`       |
| Super admin    | `/api/v1/super-admin` |

Google sign-in accepts a Google ID token from the frontend:

```text
POST /api/v1/auth/google
{ "idToken": "<google-id-token>" }
```

Google sign-in is available only for normal user accounts. Admin and super
admin accounts cannot sign in with Google.

The token must have a verified email. An existing verified password user account
with the same email is linked automatically, and both Google and password login
remain available. If no account exists, a Google-only user account is created.
If the email belongs to an admin or super admin account, Google sign-in is
rejected.

Google-only accounts cannot add email/password credentials or use password
login, password reset, or credential registration with the same email. Google
sign-in remains the only login method for those accounts. Google-only accounts
cannot be promoted to admin or super admin because Google sign-in is restricted
to normal user accounts and the account has no password.

Email changes require verification of the new address. Send the change request
through the authenticated profile endpoint, then verify the OTP sent to the new
email:

```text
PATCH /api/v1/users/me
{ "email": "new@example.com", "currentPassword": "<current-password>" }

POST /api/v1/users/me/email/verify
{ "otp": "<6-digit-code>" }
```

For administrator email changes, super admin approval sends the verification OTP
to the requested new address. The administrator verifies it through the same
`/users/me/email/verify` endpoint; the current email remains active until then.

The old email remains active until verification succeeds. After verification,
all sessions are invalidated and the user must log in with the new email.

Public incident endpoints return approved incidents only:

```text
GET /api/v1/incidents
GET /api/v1/incidents/:incidentId
```

Approved incidents support paginated comments:

```text
GET    /api/v1/incidents/:incidentId/comments
POST   /api/v1/incidents/:incidentId/comments
PATCH  /api/v1/incidents/:incidentId/comments/:commentId
DELETE /api/v1/incidents/:incidentId/comments/:commentId
```

Comment creation and updates require authentication and are rate limited.
Authors can edit or delete their own comments. Administrators can delete any
comment through `/api/v1/admin/incidents/:incidentId/comments/:commentId`.

The public contact form accepts messages without authentication and is rate
limited. Each submission is stored in the database and triggers a confirmation
email to the sender plus an internal notification to the configured sender
address:

```text
POST /api/v1/contact
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "topic": "GENERAL",
  "subject": "Question about reporting",
  "message": "How do I update an incident report after submitting it?"
}
```

Allowed topics are `GENERAL`, `REPORT_ISSUE`, `ACCOUNT`, `SAFETY`,
`PARTNERSHIP`, and `OTHER`.

Administrators and super admins can review and reply to contact messages:

```text
GET  /api/v1/admin/contacts
GET  /api/v1/admin/contacts/:contactId
POST /api/v1/admin/contacts/:contactId/reply
{ "message": "Thanks for reaching out..." }
```

The list supports `page`, `limit`, `searchTerm`, `status`, `topic`, and
`sortOrder`. Replying stores the reply, marks the message as `RESOLVED`, and
automatically emails the address that submitted the contact form. These routes
require an admin or super admin session.

## Links

- Live API: No deployed URL is configured in this repository.
- Local API health check: http://localhost:5000/health
- Postman collection: [SafePath Backend Collection](./postman/SafePath.postman_collection.json)
- Postman collection link: https://documenter.getpostman.com/view/59636503/2sBYHYtdLp
