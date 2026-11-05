# SafePath API

SafePath is a safety incident reporting and management API. Users can register,
report incidents, upload incident images, browse approved public incidents, and
manage their accounts. Administrators can review incidents, manage users, and
handle account lifecycle requests.

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
- Password reset and account restore flows
- Role-based access for users, admins, and super admins
- Public listing and details for approved incidents only
- Authenticated users can create, edit, and delete pending incidents
- Incident image upload and replacement through Cloudinary
- Admin incident review with approval and rejection notes
- User blocking, restoration, and account deletion workflows
- Admin change requests reviewed by super admins
- Authenticated dashboard overview
- Redis-backed services and scheduled account cleanup
- Automatic demo account and incident seeding when the server starts

## Dependencies

### Runtime

- `express`, `cors`, `helmet`, `compression`, `cookie-parser`
- `@prisma/client`, `@prisma/adapter-pg`, `pg`
- `jsonwebtoken`, `bcryptjs`
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

Update `.env` with your PostgreSQL, Redis, JWT, Cloudinary, SMTP, and seed
configuration values. Never commit the `.env` file or real credentials.

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

| Area | Base path |
| --- | --- |
| Authentication | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Incidents | `/api/v1/incidents` |
| Dashboard | `/api/v1/dashboard` |
| Admin | `/api/v1/admin` |
| Super admin | `/api/v1/super-admin` |

Public incident endpoints return approved incidents only:

```text
GET /api/v1/incidents
GET /api/v1/incidents/:incidentId
```

## Links

- Live API: No deployed URL is configured in this repository.
- Local API health check: http://localhost:5000/health
- Postman collection: [SafePath Backend Collection](./postman/SafePath%20(Backend).postman_collection.json)
- Postman collection link: https://go.postman.co/collection/54687734-e5f67c00-a508-4e98-ae66-c2735a826ce5?source=collection_link
