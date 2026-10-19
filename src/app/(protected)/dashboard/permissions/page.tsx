"use client";








import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getUsers } from "@/apiService/client/users";
import {
  BUILTIN_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  can,
  type CustomRole,
  type PermissionKey,
  type UserActivity,
  type UserRole,
} from "@/lib/types";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

const PERMISSION_LABEL_MAP: Record<PermissionKey, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => [p.key, p.label]))
) as Record<PermissionKey, string>;

interface DisplayRole {
  roleKey: UserRole;
  name: string;
  type: "builtin" | "custom";
  permissions: PermissionKey[];
}

interface RoleManagementData {
  builtinRoles: {
    roleKey: "admin" | "moderator" | "viewer";
    name: string;
    permissions: PermissionKey[];
  }[];
  customRoles: CustomRole[];
}

export default function RoleManagementPage() {
  const { user: currentUser, loading: authLoading } = useAuth();

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [builtinPermissions, setBuiltinPermissions] = useState<
    Partial<Record<"admin" | "moderator" | "viewer", PermissionKey[]>>
  >();
  const [activeBuiltinRoles, setActiveBuiltinRoles] = useState<
    { roleKey: "admin" | "moderator" | "viewer"; name: string; permissions: PermissionKey[] }[]
  >([]);
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DisplayRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rolesRes, usersData] = await Promise.all([
        fetch("/api/roles").then(async (r) => {
          const j = await r.json();
          if (!r.ok || !j.success || !Array.isArray(j.data?.customRoles) || !Array.isArray(j.data?.builtinRoles)) {
            throw new Error(j.error || "Could not load custom roles.");
          }
          return j.data as RoleManagementData;
        }),
        getUsers(),
      ]);
      setError(null);
      setCustomRoles(rolesRes.customRoles);
      setActiveBuiltinRoles(rolesRes.builtinRoles);
      setBuiltinPermissions(Object.fromEntries(
        rolesRes.builtinRoles.map(({ roleKey, permissions }) => [roleKey, permissions])
      ) as Partial<Record<"admin" | "moderator" | "viewer", PermissionKey[]>>);
      if (usersData?.users) setUsers(usersData.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    queueMicrotask(() => void fetchData());
  }, [authLoading, currentUser, fetchData]);

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/roles/${encodeURIComponent(deleteTarget.roleKey)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not delete custom role.");
      }
      setDeleteTarget(null);
      void fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete role.");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (
    !currentUser ||
    !can.viewPermissions(currentUser.role as UserRole) ||
    !can.editUser(currentUser.role as UserRole)
  ) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger p-4 mx-auto" style={{ maxWidth: "500px" }}>
          <i className="bi bi-shield-x fs-1 d-block mb-2 text-danger"></i>
          <h4>Access Denied</h4>
          <p className="text-muted small">Only Admins and Super Admins can access Role Management.</p>
          <Link href="/dashboard" className="btn btn-primary mt-2">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const builtinRoles: DisplayRole[] = [
    {
      roleKey: "super_admin",
      name: "Super Admin",
      type: "builtin",
      permissions: BUILTIN_ROLE_PERMISSIONS.super_admin,
    },
    ...activeBuiltinRoles.map((role) => ({
      ...role,
      type: "builtin" as const,
      permissions: builtinPermissions?.[role.roleKey] ?? role.permissions,
    })),
  ];

  const customDisplayRoles: DisplayRole[] = customRoles
    .filter(
      (cr) =>
        !["admin", "super admin", "superadmin", "moderator", "viewer", "user"].includes(
          cr.name.trim().toLowerCase()
        )
    )
    .map((cr) => ({
      roleKey: cr.roleKey,
      name: cr.name,
      type: "custom",
      permissions: cr.permissions,
    }));

  const allRoles: DisplayRole[] = [...builtinRoles, ...customDisplayRoles];

  const getUserCountForRole = (roleKey: UserRole) =>
    users.filter((u) => u.role === roleKey).length;

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="permissions" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-4 p-md-5">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
            <div>
              <h3 className="fw-bold mb-1">Role Management</h3>
              <p className="text-muted small mb-0">
                View roles, inspect assigned permissions, and configure role privileges.
              </p>
            </div>
            {(currentUser.role === "super_admin" || currentUser.role === "admin") && (
              <Link
                href="/dashboard/roles/new"
                className="btn btn-success d-inline-flex align-items-center gap-2 shadow-sm"
                style={{ backgroundColor: "#047857", borderColor: "#047857" }}
              >
                <i className="bi bi-plus-lg me-1"></i>Create Role
              </Link>
            )}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="apex-card">
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <div>
                <h5 className="fw-bold mb-0">System &amp; Custom Roles</h5>
                <span className="text-muted small">
                  {allRoles.length} active roles configured
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <span className="spinner-border spinner-border-sm text-primary"></span>
                <span className="ms-2 text-muted small">Loading roles...</span>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "220px" }}>Role</th>
                      <th>Permissions</th>
                      <th style={{ width: "110px" }} className="text-center">Assigned Users</th>
                      <th style={{ width: "160px" }} className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRoles.map((r) => {
                      const userCount = getUserCountForRole(r.roleKey);
                      const isSuperAdmin = r.roleKey === "super_admin";

                      return (
                        <tr key={r.roleKey}>
                          {}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-bold">
                                {r.name}
                              </span>
                              {r.type === "custom" && (
                                <span
                                  className="badge border"
                                  style={{
                                    fontSize: "10px",
                                    backgroundColor: "#ede9fe",
                                    color: "#4c1d95",
                                    borderColor: "#c4b5fd",
                                  }}
                                >
                                  Custom
                                </span>
                              )}
                            </div>
                          </td>

                          {}
                          <td>
                            {isSuperAdmin ? (
                              <div className="d-flex flex-wrap align-items-center gap-1">
                                <span className="badge bg-primary px-2 py-1 fw-semibold">
                                  <i className="bi bi-shield-fill-check me-1"></i>All Permissions (Full Access)
                                </span>
                                <span className="text-muted small ms-2">
                                  ({r.permissions.length} system privileges)
                                </span>
                              </div>
                            ) : r.permissions.length === 0 ? (
                              <span className="text-muted small italic">No permissions assigned</span>
                            ) : (
                              <div className="d-flex flex-wrap gap-1">
                                {r.permissions.map((pk) => (
                                  <span
                                    key={pk}
                                    className="badge bg-light text-dark border px-2 py-1"
                                    style={{ fontSize: "11px", fontWeight: 500 }}
                                    title={pk}
                                  >
                                    {PERMISSION_LABEL_MAP[pk] || pk}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {}
                          <td className="text-center">
                            <span className="badge bg-light text-secondary border px-2 py-1">
                              <i className="bi bi-people me-1"></i>
                              {userCount} {userCount === 1 ? "user" : "users"}
                            </span>
                          </td>

                          {}
                          <td className="text-end">
                            {!isSuperAdmin ? (
                              <div className="d-flex justify-content-end gap-1">
                                <Link
                                  href={`/dashboard/roles/edit?roleKey=${encodeURIComponent(r.roleKey)}`}
                                  className="btn btn-sm btn-outline-primary"
                                  title={r.type === "custom" ? "Edit role name and permissions" : "Edit role permissions"}
                                >
                                  <i className="bi bi-pencil me-1"></i>Edit Role
                                </Link>
                                {r.type === "custom" ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    title="Delete custom role"
                                    onClick={() => setDeleteTarget(r)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                ) : !isSuperAdmin && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    title={userCount > 0
                                      ? `Remove all users from ${r.name} before deleting this role`
                                      : `Delete ${r.name} role`}
                                    onClick={() => setDeleteTarget(r)}
                                    disabled={userCount > 0}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="badge bg-light text-muted border px-2 py-1 small">
                                {isSuperAdmin ? "System Root" : "System Default"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {}
      {deleteTarget && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>Delete Role
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                ></button>
              </div>
              <div className="modal-body">
                Are you sure you want to delete the{" "}
                {deleteTarget.type === "custom" ? "custom " : ""}
                <strong>&quot;{deleteTarget.name}&quot;</strong>?
                <p className="text-muted small mt-2 mb-0">
                  This action cannot be undone. Roles currently assigned to active users cannot be deleted.
                </p>
              </div>
              <div className="modal-footer border-0">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteRole}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Deleting...
                    </>
                  ) : (
                    "Delete Role"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
