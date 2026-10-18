# GSAS

A modern, production-ready starter boilerplate built with **Next.js (App Router)**, a secure **Username & Email Authentication** backend system using **bcrypt** and **JWT (HTTP-only cookies)**, and a real-time **Admin UI Customization Studio**.

---

##  Features

## Features

- **GSAS Project Management**
  - Manage projects across Construction Management (CM), Design & Build (DB), and Operations (OP).
  - Track project details, certification status, ratings, dates, and related files.
  - View project summaries, reports, and certification rating charts.

- **Plaque and Print Inventory**
  - Manage plaque batches and plaque inventory.
  - Track iPrint stock and MedalMade plaque orders, deliveries, and remaining quantities.
  - Review inventory and project status from the dashboard.

- **Dashboard and Reporting**
  - View project totals, issued certificates, pending actions, and print and frame stock.
  - Explore certified project distributions by category and rating.
  - Filter project data and generate reports.

- **User and Role Management**
  - Create and manage user accounts.
  - Assign built-in or custom roles with granular permissions.
  - Restrict access to dashboard, user, project, GSAS, and plaque features.

- **Authentication and Account Security**
  - Sign in with a username or email address.
  - Hash passwords with `bcryptjs` and use JWT sessions stored in HTTP-only cookies.
  - Protect dashboard routes and provide password recovery.

- **Theme Customization**
  - Customize the primary color, font family, font size, corner radius, and sidebar appearance.
  - Apply changes in the browser and save theme preferences locally.

- **Next.js App Router**
  - Keep the frontend pages and backend API routes in one Next.js application.
  - Use server and client components for the relevant parts of the app.

##  Project Structure

src/
├── app/
│   ├── (auth)/                         # Login, registration, and password recovery pages
│   ├── (protected)/                    # Authenticated dashboard and user pages
│   │   ├── dashboard/                  # Dashboard, users, roles, permissions, and projects
│   │   └── users/
│   ├── api/
│   │   ├── auth/                       # Login, registration, session, and password recovery
│   │   ├── data/                       # Dashboard statistics
│   │   ├── gsas/                       # GSAS project and reporting endpoints
│   │   ├── project-files/              # Project file endpoints
│   │   ├── plaque-batches/             # Plaque batch endpoints
│   │   ├── plaque-inventory/           # Plaque inventory endpoints
│   │   ├── iprint-inventory/           # iPrint inventory endpoints
│   │   ├── medal-made-inventory/       # MedalMade inventory endpoints
│   │   ├── roles/                      # Role and permission endpoints
│   │   └── users/                      # User management endpoints
│   ├── globals.css                     # Global styles
│   ├── dashboard.css                   # Dashboard styles
│   ├── layout.tsx                      # Root layout
│   └── page.tsx                        # Root route
├── apiService/
│   ├── client/                         # Client-side API services
│   └── server/                         # Server-side API services
├── components/
│   ├── dashboard/                      # Dashboard, project, inventory, and admin UI
│   └── main/                           # App providers and layout components
├── context/                            # Authentication and theme state
├── helpers/
│   ├── client/                         # Client-side API and data helpers
│   └── server/                         # Authentication and validation helpers
├── lib/
│   ├── seeds/                          # Seed data for projects and inventory
│   ├── server/                         # Shared API handlers and responses
│   ├── db.ts                           # PostgreSQL access and schema setup
│   ├── auth.ts                         # Authentication utilities
│   ├── permissions.ts                  # Permission helpers
│   └── types.ts                        # Shared TypeScript types
├── middleware.ts                       # Protected route handling
└── types/
    └── declarations.d.ts               # Type declarations

public/                                 # Static assets and GSAS branding
scripts/                                # Seed generation scripts
README.md
package.json
next.config.ts
tsconfig.json
eslint.config.mjs

##  Getting Started

### 1. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Password Recovery Email Setup

The forgot-password form sends a six-digit verification code through Resend. Configure these server-side environment variables in `.env.local` for development and in your hosting provider for production:

| Variable | Purpose |
| :--- | :--- |
| `RESEND_API_KEY` | Resend API key used to send recovery emails |
| `RESEND_FROM_EMAIL` | Sender address verified with Resend, for example `GORD <noreply@your-verified-domain.com>` |
| `PASSWORD_RESET_CODE_SECRET` | Random secret of at least 32 bytes used to hash recovery codes |

Create a code secret with `openssl rand -hex 32`. Never expose these variables with a `NEXT_PUBLIC_` prefix or commit them to source control. The database creates the recovery-code table automatically. Codes expire after 10 minutes, can be tried up to five times, and a new code can be requested once per minute for an account.
