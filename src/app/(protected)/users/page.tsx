"use client";








import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import PermissionChecklist from "@/components/dashboard/PermissionChecklist";
import { can, getUserRoleLabel, userHasPermission } from "@/lib/types";
import type { PermissionKey, UserActivity } from "@/lib/types";
import { formatMinutes, timeAgo, prioritizeAdmins } from "@/helpers/client/dataHelpers";
import { toggleBlockUser } from "@/apiService/client/users";

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`d-flex align-items-center gap-1 small ${ok ? "text-success" : "text-muted"}`}>
      <i className={`bi ${ok ? "bi-check-circle-fill" : "bi-circle"}`} style={{ fontSize: "0.7rem" }}></i>
      {label}
    </span>
  );
}

export default function UsersPage() {
  const { user, loading } = useAuth();

  const [users, setUsers] = useState<UserActivity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    permissions: [] as PermissionKey[],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserActivity | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [blockTarget, setBlockTarget] = useState<UserActivity | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  const strength = checkPasswordStrength(form.password);

  const fetchUsers = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
      } else {
        setError(json.error || "Failed to load users");
      }
    } catch {
      setError("Network error while loading users");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && userHasPermission(user, "users.view")) {
      fetchUsers();
      const interval = setInterval(fetchUsers, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loading, fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, action: "addUser" }),
    });
    const json = await res.json();
    setFormLoading(false);

    if (json.success) {
      setFormSuccess(`User "${form.username}" created successfully!`);
      setForm({ username: "", email: "", name: "", password: "", permissions: [] });
      setShowAddForm(false);
      fetchUsers();
    } else {
      setFormError(json.error || "Failed to create user");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/users?id=${deleteTarget.userId}`, { method: "DELETE" });
    const json = await res.json();
    setDeleteLoading(false);
    setDeleteTarget(null);
    if (json.success) {
      fetchUsers();
    } else {
      setError(json.error || "Failed to delete user");
    }
  };

  const handleToggleBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    setError(null);
    try {
      const result = await toggleBlockUser({
        id: blockTarget.userId,
        blocked: !blockTarget.isBlocked,
      });
      if (!result?.user) throw new Error("Failed to update this user's access.");
      setUsers((currentUsers) =>
        currentUsers.map((entry) =>
          entry.userId === blockTarget.userId
            ? { ...entry, isBlocked: result.user.isBlocked }
            : entry
        )
      );
      setBlockTarget(null);
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "Failed to update this user's access.");
    } finally {
      setBlockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <span className="spinner-border text-primary"></span>
      </div>
    );
  }

  if (!user || !userHasPermission(user, "users.view")) {
    return (
      <div className="container-fluid py-5 px-4 px-lg-5">
        <div className="alert alert-danger text-center p-4">
          <i className="bi bi-shield-x fs-1 d-block mb-2"></i>
          <h4>Access Denied</h4>
          <p>You do not have permission to view User Management.</p>
          <Link href="/dashboard" className="btn btn-primary mt-2">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  const orderedUsers = prioritizeAdmins(users);

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-people-fill text-primary"></i> User Management
          </h2>
          <p className="text-muted mb-0 small">Manage accounts, monitor activity and online presence</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchUsers}>
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
          {userHasPermission(user, "users.create") && (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddForm(!showAddForm); setFormError(null); setFormSuccess(null); }}>
              <i className="bi bi-person-plus me-1"></i>{showAddForm ? "Cancel" : "Add User"}
            </button>
          )}
        </div>
      </div>

      {formSuccess && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <i className="bi bi-check-circle-fill"></i>{formSuccess}
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill"></i>{error}
        </div>
      )}

      {showAddForm && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-4"><i className="bi bi-person-plus text-primary me-2"></i>Add New User</h5>
            {formError && (
              <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill"></i>{formError}
              </div>
            )}
            <form onSubmit={handleAddUser}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Username *</label>
                  <input
                    type="text" className="form-control" placeholder="username"
                    value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required disabled={formLoading}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Full Name</label>
                  <input
                    type="text" className="form-control" placeholder="Display name"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={formLoading}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Email *</label>
                  <input
                    type="email" className="form-control" placeholder="user@example.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required disabled={formLoading}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold small">Permissions</label>
                  <PermissionChecklist
                    permissions={form.permissions}
                    onChange={(permissions) => setForm({ ...form, permissions })}
                    allowedPermissions={user.permissions ?? []}
                    disabled={formLoading}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold small">Password *</label>
                  <div className="input-group">
                    <input
                      type={showFormPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="Strong password required"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required disabled={formLoading}
                    />
                    <button type="button" className="btn btn-outline-secondary"
                      onClick={() => setShowFormPassword(!showFormPassword)} tabIndex={-1}>
                      <i className={`bi ${showFormPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div className="mt-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="small text-muted">Strength</span>
                        <span className={`small fw-semibold ${strength.color}`}>{strength.label}</span>
                      </div>
                      <div className="progress mb-2" style={{ height: 5 }}>
                        <div className="progress-bar" style={{ width: `${strength.percent}%`, backgroundColor: strength.barColor }} />
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <CheckItem ok={strength.checks.length} label="8+ chars" />
                        <CheckItem ok={strength.checks.lowercase} label="Lowercase" />
                        <CheckItem ok={strength.checks.uppercase} label="Uppercase" />
                        <CheckItem ok={strength.checks.number} label="Number" />
                        <CheckItem ok={strength.checks.special} label="Special" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={formLoading || strength.score < 4}>
                  {formLoading ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating…</> : <><i className="bi bi-check-circle me-1"></i>Create User</>}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {dataLoading ? (
            <div className="text-center py-5">
              <span className="spinner-border text-primary"></span>
              <p className="text-muted small mt-2">Loading users…</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 py-3">User</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Last Seen</th>
                    <th className="py-3">Time Online</th>
                    <th className="py-3">Joined</th>
                    <th className="py-3 pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedUsers.map((u) => (
                    <tr key={u.userId}>
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                            style={{ width: 36, height: 36, backgroundColor: u.role === "admin" ? "#0d6efd" : "#6c757d", fontSize: "0.9rem" }}
                          >
                            {(u.name || u.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-semibold small">{u.name || u.username}</div>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                              @{u.username} &middot; {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary border fw-normal">
                          {getUserRoleLabel(u.role, u.roleName)}
                        </span>
                      </td>
                      <td>
                        {u.isBlocked ? (
                          <span className="d-flex align-items-center gap-1 text-danger small fw-medium">
                            <span className="rounded-circle bg-danger" style={{ width: 8, height: 8, display: "inline-block", flexShrink: 0 }}></span>
                            Blocked
                          </span>
                        ) : u.isOnline ? (
                          <span className="d-flex align-items-center gap-1 text-success small fw-medium">
                            <span className="rounded-circle bg-success" style={{ width: 8, height: 8, display: "inline-block", flexShrink: 0 }}></span>
                            Online
                          </span>
                        ) : (
                          <span className="d-flex align-items-center gap-1 text-muted small">
                            <span className="rounded-circle bg-secondary" style={{ width: 8, height: 8, display: "inline-block", flexShrink: 0 }}></span>
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="small text-muted">{timeAgo(u.lastSeen)}</td>
                      <td>
                        <span className="small fw-medium">{formatMinutes(u.totalMinutesOnline)}</span>
                        <div className="progress mt-1" style={{ height: 4, width: 60 }}>
                          <div
                            className="progress-bar bg-primary"
                            style={{ width: `${Math.min(100, (u.totalMinutesOnline / 60) * 10)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="small text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="pe-4 text-end">
                        <div className="d-inline-flex align-items-center gap-1">
                          {u.userId !== user.id &&
                          userHasPermission(user, "users.edit") &&
                          can.manageUser(user.role, u.role) && (
                            <button
                              className={`btn btn-sm ${u.isBlocked ? "btn-outline-success" : "btn-outline-warning"}`}
                              onClick={() => setBlockTarget(u)}
                              title={u.isBlocked ? "Unblock User" : "Block User"}
                              aria-label={u.isBlocked ? `Unblock ${u.username}` : `Block ${u.username}`}
                            >
                              <i className={`bi ${u.isBlocked ? "bi-check-circle" : "bi-slash-circle"}`}></i>
                            </button>
                          )}
                          {u.userId !== user.id &&
                          userHasPermission(user, "users.delete") &&
                          can.manageUser(user.role, u.role) ? (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setDeleteTarget(u)}
                              title="Delete User"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          ) : u.userId === user.id ? (
                            <span className="badge bg-primary fw-normal small">You</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                        ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p className="text-muted small mt-3">
        <i className="bi bi-info-circle me-1"></i>
        Online status updates every 30 seconds. A user is considered online if active within the last 5 minutes.
      </p>

      {deleteTarget && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                    Delete User
                  </h5>
                  <button className="btn-close" onClick={() => setDeleteTarget(null)}></button>
                </div>
                <div className="modal-body pt-2">
                  <p className="text-muted">
                    Are you sure you want to delete <strong>@{deleteTarget.username}</strong>? This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                    {deleteLoading ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting…</> : "Delete User"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {blockTarget && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">
                    <i className={`bi ${blockTarget.isBlocked ? "bi-check-circle-fill text-success" : "bi-slash-circle-fill text-warning"} me-2`}></i>
                    {blockTarget.isBlocked ? "Unblock User" : "Block User"}
                  </h5>
                  <button className="btn-close" onClick={() => setBlockTarget(null)} disabled={blockLoading}></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted mb-0">
                    {blockTarget.isBlocked
                      ? <>Restore access for <strong>@{blockTarget.username}</strong>?</>
                      : <>Block <strong>@{blockTarget.username}</strong>? They will no longer be able to access the application.</>}
                  </p>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button className="btn btn-secondary" onClick={() => setBlockTarget(null)} disabled={blockLoading}>Cancel</button>
                  <button
                    className={`btn ${blockTarget.isBlocked ? "btn-success" : "btn-warning"}`}
                    onClick={handleToggleBlock}
                    disabled={blockLoading}
                  >
                    {blockLoading ? "Updating…" : blockTarget.isBlocked ? "Confirm Unblock" : "Confirm Block"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
