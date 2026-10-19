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


## Project Structure

```text
src/
├── app/
│   ├── (auth)/                      # Login, registration, and password recovery
│   ├── (protected)/                 # Authenticated pages
│   │   ├── dashboard/               # Dashboard, users, roles, permissions, and projects
│   │   └── users/                   # User management
│   ├── api/                          # Backend API routes
│   │   ├── auth/                    # Authentication and password recovery
│   │   ├── data/                    # Dashboard statistics
│   │   ├── gsas/                    # GSAS projects, summaries, and reports
│   │   ├── project-files/           # Project files
│   │   ├── plaque-batches/          # Plaque batches
│   │   ├── plaque-inventory/        # Plaque inventory
│   │   ├── iprint-inventory/        # iPrint inventory
│   │   ├── medal-made-inventory/    # MedalMade inventory
│   │   ├── roles/                   # Roles and permissions
│   │   └── users/                   # User management API
│   ├── globals.css                  # Global styles
│   ├── dashboard.css                # Dashboard styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Root page
├── apiService/
│   ├── client/                      # Client-side API services
│   └── server/                      # Server-side API services
├── components/
│   ├── dashboard/                  # Dashboard, project, inventory, and admin UI
│   └── main/                       # Providers and layout components
├── context/                         # Authentication and theme state
├── helpers/
│   ├── client/                      # Client-side API and data helpers
│   └── server/                      # Authentication and validation helpers
├── lib/
│   ├── seeds/                       # Project and inventory seed data
│   ├── server/                      # Shared API handlers and responses
│   ├── db.ts                        # PostgreSQL access and schema setup
│   ├── auth.ts                      # Authentication utilities
│   ├── permissions.ts               # Permission helpers
│   └── types.ts                     # Shared TypeScript types
├── types/                           # TypeScript declarations
└── middleware.ts                    # Protected route handling

public/                              # Static assets and GSAS branding
scripts/                             # Seed generation scripts
```

