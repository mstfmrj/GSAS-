# GSAS

GSAS is a Next.js application for managing GSAS projects, certification information, plaque and print inventories, users, roles, and permissions. Authentication uses Microsoft sign-in through Auth.js. PostgreSQL stores application data and GSAS user records.

## Features

- Manage Construction Management, Design & Build, and Operations projects.
- Track certification status, ratings, project dates, and related files.
- Manage plaque batches, plaque inventory, iPrint stock, and MedalMade orders.
- View dashboard summaries, reports, and certification charts.
- Manage users, built-in roles, custom roles, and permissions.
- Customize dashboard appearance and themes.

## Requirements

- Node.js and npm
- PostgreSQL
- A Microsoft Entra app registration configured for personal Microsoft accounts and organizational accounts

## Local setup

1. Clone the repository and open its folder:

   ```bash
   git clone https://github.com/mstfmrj/GSAS-.git
   cd GSAS-
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a PostgreSQL database and set up a Microsoft app registration. Add a web redirect URI for local development:

   ```text
   http://localhost:3000/api/auth/callback/microsoft-entra-id
   ```

4. Create `.env.local` in the project root. Fill in the values for your own database and Microsoft app registration:

   ```dotenv
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME
   AUTH_MICROSOFT_ENTRA_ID_ID=YOUR_MICROSOFT_APPLICATION_CLIENT_ID
   AUTH_MICROSOFT_ENTRA_ID_SECRET=YOUR_MICROSOFT_CLIENT_SECRET_VALUE
   AUTH_SECRET=GENERATE_A_LONG_RANDOM_SECRET
   JWT_SECRET=GENERATE_ANOTHER_LONG_RANDOM_SECRET
   MICROSOFT_LOGIN_ENABLED=true
   MICROSOFT_TENANT_ID=common
   MICROSOFT_SUPER_ADMIN_EMAIL=admin@example.com (for starters)
   ```

   `common` allows personal Microsoft accounts and work or school accounts. Set `MICROSOFT_SUPER_ADMIN_EMAIL` to the email that should receive the GSAS Super Admin role. The first sign-in creates a GSAS user record; other first-time Microsoft users are created as viewers.

   Keep `.env.local` private. It is ignored by Git and must not be committed. For a deployed site, add these variables in the hosting provider's environment-variable settings and register the production callback URL there too:

   ```text
   https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id
   ```


## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server after building |
| `npm run lint` | Run ESLint |

## Project layout

- `src/app/` — Next.js pages and API routes
- `src/apiService/` — Client-side and server-side API operations
- `src/components/` — Shared UI and dashboard components
- `src/context/` — Authentication and theme contexts
- `src/lib/` — Database access, permissions, data types, and seed data
- `public/` — GSAS logos and static assets
- `scripts/` — Utility scripts for generating seed data
- `auth.ts` — Auth.js Microsoft provider configuration

## Deployment notes

The hosting provider must have access to a PostgreSQL database and the environment variables above. Set the Microsoft app registration's redirect URI to the deployed domain's callback URL. Use a separate `AUTH_SECRET` and `JWT_SECRET` for each environment, and never place real secrets in this README or in GitHub.
