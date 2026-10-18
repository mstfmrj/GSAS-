"use client";

/**
 * src/components/dashboard/UserProfileCard.tsx
 *
 * PURPOSE:
 * Full-page profile overview card displaying personal account details, assigned permissions,
 * and role badges with a top-right Edit button.
 */

import { useTheme } from "@/context/ThemeContext";
import { getUserRoleLabel } from "@/lib/types";
import type { User } from "@/lib/types";

interface UserProfileCardProps {
  user: User;
}

export default function UserProfileCard({ user }: UserProfileCardProps) {
  const { theme } = useTheme();
  const roleLabel = getUserRoleLabel(user.role, user.roleName);

  return (
    <div className="card shadow-sm w-100">
      <div className="card-body p-4">
        <div className="d-flex align-items-center gap-3 mb-4 p-4 bg-light rounded-3 border flex-wrap">
          <div
            className="text-white rounded-circle p-3 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
            style={{ width: "64px", height: "64px", backgroundColor: theme.primaryColor }}
          >
            <i className="bi bi-person-fill fs-2"></i>
          </div>
          <div>
            <h4 className="mb-1 fw-bold" style={{ color: theme.primaryColor }}>
              {user.name || user.username}
            </h4>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="badge bg-dark text-white px-2 py-1" style={{ fontSize: "11px" }}>
                <i className="bi bi-shield-check me-1" style={{ color: theme.primaryColor }}></i>
                {roleLabel}
              </span>
              <small className="text-muted">@{user.username}</small>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted d-block fw-semibold mb-1">Full Name</small>
              <div className="fw-semibold text-dark fs-6">{user.name || "—"}</div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted d-block fw-semibold mb-1">Username</small>
              <div className="fw-semibold text-dark fs-6">@{user.username}</div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted d-block fw-semibold mb-1">Email</small>
              <div className="fw-semibold text-dark fs-6">{user.email || `${user.username}@example.com`}</div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted d-block fw-semibold mb-1">Role</small>
              <div className="fw-semibold text-dark fs-6">
                <span className="badge bg-dark text-white px-2 py-1">
                  <i className="bi bi-shield-lock me-1" style={{ color: theme.primaryColor }}></i>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="p-3 bg-light rounded-3 border">
              <small className="text-muted d-block fw-semibold mb-1">Account Created</small>
              <div className="small text-muted">{new Date(user.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
