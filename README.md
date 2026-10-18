# GORD

A modern, production-ready starter boilerplate built with **Next.js (App Router)**, a secure **Username & Email Authentication** backend system using **bcrypt** and **JWT (HTTP-only cookies)**, and a real-time **Admin UI Customization Studio**.

---

##  Features

- **Next.js App Router Architecture**:
  - Unified frontend and backend architecture in one codebase.
  - Server & Client Components cleanly separated.
- **Dual Login (Username or Email)**:
  - Users can sign in using either their **Username** or registered **Email Address**.
  - Interactive method switcher toggle on the login page.
  - Secure credential verification using `bcryptjs` password hashing.
  - Stateless JWT sessions signed with `jose` and persisted via secure HTTP-Only cookies.
  - Instant trial accounts ready out-of-the-box.
- **Consistent High-Visibility Buttons**:
  - Login and Register buttons share matched cohesive tones across all navigation bar styles (Dark, Light, Brand Primary).
- **Admin UI Customizer Studio**:
  - Exclusive admin mode panel allowing real-time adjustment of primary colors, typography/fonts, base font size scale, corner radius, and navigation bar styles.
- **Route Protection & Middleware**:
  - Server-side middleware interceptor for `/dashboard` and protected paths.
  - Automatic redirect for unauthenticated users (`/login?redirect=...`).
- **Clean Interactive Dashboard & Backend API**:
  - Streamlined system health and active user metrics fetched from authenticated route `GET /api/data/stats`.
  - User profile display showing Username, Email, Role, and Display Name.
  - Real-time user profile state management with React `AuthContext`.

---

## Trial Accounts

Choose a role-specific trial sign-in on the `/login` page:

| Trial role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@example.com` | `password123` |
| **Viewer** | `viewer.trial@example.com` | `password123` |
| **Manager** | `mustafa@example.com` | `password123` |

*(You can also register any new account on `/register`!)*

---

##  Project Structure

```text
src/
├── app/                  # Routes, layouts, and API route handlers
├── components/           # Shared UI and feature-specific components
│   └── dashboard/        # Dashboard cards and admin theme settings
├── context/              # Authentication and theme state
├── lib/                  # Authentication, data access, and shared types
└── middleware.ts         # Protected route handling
data/                     # Local user data
```

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
