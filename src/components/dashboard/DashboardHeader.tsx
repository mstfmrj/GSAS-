"use client";








import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getUserRoleLabel } from "@/lib/types";
import type { UserRole } from "@/lib/types";

const ROLE_ICON: Record<UserRole, string> = {
  super_admin: "bi-shield-fill-check",
  admin: "bi-shield-lock",
  moderator: "bi-person",
  viewer: "bi-person",
};

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const role = user.role as UserRole;
  const roleLabel = getUserRoleLabel(role, user.roleName);
  const roleIcon = ROLE_ICON[role] ?? "bi-person";
  const displayName = user.name || user.email || "User";
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <header className="apex-topbar d-flex align-items-center justify-content-between">
      <div className="d-flex align-items-center d-md-none">
        <Link href="/dashboard" className="text-decoration-none">
          <span
            style={{
              color: "#007c02",
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "1.5px",
              lineHeight: 1,
            }}
          >
            GSAS
          </span>
        </Link>
      </div>
      <div className="dropdown ms-auto">
        <button
          className="btn dropdown-toggle d-flex align-items-center gap-2 shadow-sm py-1 px-3 border"
          type="button"
          id="topbarUserDropdown"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          style={{
            backgroundColor: "var(--card-bg, #ffffff)",
            color: "var(--topbar-color, #0f172a)",
            borderColor: "var(--topbar-border, #e2e8f0)",
            borderRadius: "9999px",
          }}
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-xs"
            style={{
              width: "28px",
              height: "28px",
              fontSize: "0.8rem",
              backgroundColor:
                role === "super_admin"
                  ? "#1e3a5f"
                  : role === "admin"
                  ? "#0f172a"
                  : role === "moderator"
                  ? "#0d6efd"
                  : "#0dcaf0",
            }}
          >
            {initial}
          </div>
          <span className="fw-semibold small">{displayName}</span>
          <span className="badge bg-light text-muted border px-2 py-1" style={{ fontSize: "10.5px" }}>
            <i className={`bi ${roleIcon} me-1 text-primary`}></i>
            {roleLabel}
          </span>
        </button>
        <ul className="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="topbarUserDropdown">
          <li className="px-3 py-2 border-bottom">
            <div className="fw-bold small">{displayName}</div>
            <div className="text-muted" style={{ fontSize: "12px" }}>{user.email}</div>
            <div className="mt-1">
              <span className="badge bg-dark text-white px-2 py-1" style={{ fontSize: "10px" }}>
                {roleLabel}
              </span>
            </div>
          </li>
          <li>
            <Link href="/dashboard?tab=profile" className="dropdown-item d-flex align-items-center gap-2 mt-1">
              <i className="bi bi-person-circle"></i> Profile ({displayName})
            </Link>
          </li>
          <li><hr className="dropdown-divider my-1" /></li>
          <li>
            <button
              onClick={() => logout()}
              className="dropdown-item text-danger d-flex align-items-center gap-2"
            >
              <i className="bi bi-box-arrow-right"></i> Log Out
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
