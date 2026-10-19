"use client";








import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { getUser, updateUser } from "@/apiService/client/users";
import { formatMinutes, timeAgo, formatDate, getUserInitial } from "@/helpers/client/dataHelpers";
import { can, getUserRoleLabel, userHasPermission } from "@/lib/types";
import type { CustomRole, User, UserRole } from "@/lib/types";

function EditUserContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const { user: currentUser, loading: authLoading } = useAuth();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [assignedRole, setAssignedRole] = useState<UserRole>("viewer");
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [builtinRoles, setBuiltinRoles] = useState<
    { roleKey: "admin" | "moderator" | "viewer"; name: string }[]
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    getUser({ id: userId })
      .then((data) => {
        if (data?.user) {
          setUserData(data.user);
          setUsername(data.user.username || "");
          setAssignedRole(data.user.role);
        } else {
          setError("User not found or failed to load user.");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error loading user details.");
      })
      .finally(() => {
        setLoadingUser(false);
      });
  }, [userId]);

  useEffect(() => {
    if (!currentUser || (currentUser.role !== "super_admin" && currentUser.role !== "admin")) return;
    fetch("/api/roles")
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.success && Array.isArray(result.data?.builtinRoles) && Array.isArray(result.data?.customRoles)) {
          setBuiltinRoles(result.data.builtinRoles);
          setCustomRoles(result.data.customRoles);
        }
      })
      .catch((loadError: unknown) => {
        console.error("Could not load custom roles:", loadError);
      });
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await updateUser({
        id: userId,
        username: username.trim(),
        role: assignedRole,
        permissions: null,
      });

      if (res?.user) {
        setUserData(res.user);
        setAssignedRole(res.user.role);
        setSuccessMessage(`User @${res.user.username} details updated successfully.`);
      } else {
        setError("The update completed without returning the updated user. Refresh and verify the account before trying again.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating user details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingUser) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading user details...</span>
        </div>
      </div>
    );
  }

  if (
    !currentUser ||
    !userHasPermission(currentUser, "users.view") ||
    !userHasPermission(currentUser, "users.edit") ||
    (userData && !can.manageUser(currentUser.role as UserRole, userData.role))
  ) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger p-4 mx-auto" style={{ maxWidth: "500px" }}>
          <i className="bi bi-shield-x fs-1 d-block mb-2 text-danger"></i>
          <h4>Access Denied</h4>
          <p className="text-muted small">You do not have permission to modify this user account.</p>
          <Link href="/dashboard?tab=users" className="btn btn-primary mt-2">
            Return to User Management
          </Link>
        </div>
      </div>
    );
  }

  const canChangeRole =
    userData &&
    userData.role !== "super_admin" &&
    (currentUser.role === "super_admin" || currentUser.role === "admin");

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="users" />

      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-4 p-md-5">
          <div className="mb-4">
            <h3 className="fw-bold mb-1">Edit User Details</h3>
            <p className="text-muted small mb-0">
              Update account profile and manage assigned role.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 py-2 px-3 small">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <div>{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success d-flex align-items-center gap-2 mb-4 py-2 px-3 small">
              <i className="bi bi-check-circle-fill"></i>
              <div>{successMessage}</div>
            </div>
          )}

          {userData ? (
            <div className="row g-4">
              {                            }
              <div className="col-12 col-lg-7">
                <div className="apex-card h-100">
                  <h5 className="fw-bold mb-4 pb-2 border-bottom">Edit Account Information</h5>

                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                        Username <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted border-end-0">
                          <i className="bi bi-at"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0"
                          placeholder="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                        Email Address
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted border-end-0">
                          <i className="bi bi-envelope"></i>
                        </span>
                        <input
                          type="email"
                          className="form-control border-start-0 bg-light"
                          value={userData.email}
                          disabled
                          readOnly
                        />
                      </div>
                      <small className="text-muted" style={{ fontSize: "11px" }}>
                        Email address is tied to authentication and cannot be changed here.
                      </small>
                    </div>

                    {                   }
                    <div className="mb-4">
                      <label htmlFor="edit-user-role" className="form-label small fw-semibold text-muted text-uppercase mb-1">
                        Assigned Role
                      </label>
                      {canChangeRole ? (
                        <select
                          id="edit-user-role"
                          className="form-select"
                          value={assignedRole}
                          onChange={(event) => setAssignedRole(event.target.value as UserRole)}
                          disabled={submitting}
                        >
                          {builtinRoles
                            .filter((role) => role.roleKey !== "admin" || currentUser.role === "super_admin")
                            .map((role) => (
                              <option value={role.roleKey} key={role.roleKey}>{role.name}</option>
                            ))}
                          {customRoles.length > 0 && (
                            <optgroup label="Custom Roles">
                              {customRoles.map((cr) => (
                                <option value={cr.roleKey} key={cr.roleKey}>{cr.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      ) : (
                        <div className="p-2 bg-light rounded border">
                          <span className="badge bg-dark text-warning px-2 py-1">
                            {getUserRoleLabel(userData.role, userData.roleName)}
                          </span>
                          <span className="text-muted small ms-2">
                            {userData.role === "super_admin"
                              ? "Super Admin role is permanent."
                              : "You do not have permission to change this role."}
                          </span>
                        </div>
                      )}
                      <div className="form-text small mt-1">
                        Permissions are automatically determined by the user’s assigned role.
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                      <Link href="/dashboard?tab=users" className="btn btn-outline-secondary px-4">
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 fw-semibold shadow-sm"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2 me-1"></i> Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {                                     }
              <div className="col-12 col-lg-5">
                <div className="apex-card h-100">
                  <h5 className="fw-bold mb-4 pb-2 border-bottom">User Details &amp; Activity</h5>

                  <div className="text-center py-3 mb-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-3 shadow"
                      style={{
                        width: "72px",
                        height: "72px",
                        fontSize: "1.75rem",
                        backgroundColor:
                          userData.role === "super_admin"
                            ? "#1e3a5f"
                            : userData.role === "admin"
                            ? "#0f172a"
                            : userData.role === "moderator"
                            ? "#0d6efd"
                            : userData.role === "viewer"
                            ? "#0dcaf0"
                            : "#10b981",
                      }}
                    >
                      {getUserInitial(userData.name || userData.username)}
                    </div>
                    <h5 className="fw-bold mb-1">{userData.name || userData.username}</h5>
                    <p className="text-muted small mb-2">@{userData.username}</p>
                    <div className="d-flex justify-content-center gap-2">
                      <span className={`badge ${
                        userData.role === "super_admin"
                          ? "bg-dark text-warning border border-warning"
                          : userData.role === "admin"
                          ? "bg-dark text-white"
                          : userData.role === "moderator"
                          ? "bg-primary text-white"
                          : userData.role === "viewer"
                          ? "bg-info text-dark"
                          : "bg-secondary text-white"
                      } px-2 py-1`}>
                        {getUserRoleLabel(userData.role, userData.roleName)}
                      </span>
                      {userData.isBlocked ? (
                        <span className="badge bg-danger">Banned</span>
                      ) : (
                        <span className="badge bg-success">Active</span>
                      )}
                    </div>
                  </div>

                  <div className="border-top pt-3">
                    <div className="d-flex justify-content-between py-2 border-bottom">
                      <span className="text-muted small">Member Since</span>
                      <span className="fw-semibold small">{formatDate(userData.createdAt)}</span>
                    </div>
                    <div className="d-flex justify-content-between py-2 border-bottom">
                      <span className="text-muted small">Last Active</span>
                      <span className="fw-semibold small">{timeAgo(userData.lastSeen)}</span>
                    </div>
                    <div className="d-flex justify-content-between py-2">
                      <span className="text-muted small">Time Online</span>
                      <span className="fw-semibold small">
                        {formatMinutes(userData.totalMinutesOnline ?? 0)}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning" style={{ maxWidth: "600px" }}>
              <i className="bi bi-exclamation-triangle me-2"></i>
              No user selected. Please access this page from the <Link href="/dashboard?tab=users" className="alert-link">User Management table</Link>.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function EditUserPage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <EditUserContent />
    </Suspense>
  );
}
