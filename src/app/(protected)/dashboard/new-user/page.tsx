"use client";








import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { addUser } from "@/apiService/client/users";
import { getUserRoleLabel, userHasPermission } from "@/lib/types";
import type { CustomRole, UserRole } from "@/lib/types";

export default function AdminNewUserPage() {
  const { user, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [assignedRole, setAssignedRole] = useState<UserRole>("viewer");
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [builtinRoles, setBuiltinRoles] = useState<
    { roleKey: "admin" | "moderator" | "viewer"; name: string }[]
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<{
    id: string;
    username: string;
    email: string;
    role: UserRole;
  } | null>(null);

  useEffect(() => {
    if (!user || (user.role !== "super_admin" && user.role !== "admin")) return;
    fetch("/api/roles")
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.success && Array.isArray(result.data?.builtinRoles) && Array.isArray(result.data?.customRoles)) {
          setBuiltinRoles(result.data.builtinRoles);
          setCustomRoles(result.data.customRoles);
          const assignableBuiltinRoles = result.data.builtinRoles.filter(
            (role: { roleKey: "admin" | "moderator" | "viewer" }) =>
              role.roleKey !== "admin" || user.role === "super_admin"
          );
          setAssignedRole((currentRole) => {
            const availableRoleKeys = [
              ...assignableBuiltinRoles.map((role: { roleKey: "admin" | "moderator" | "viewer" }) => role.roleKey),
              ...result.data.customRoles.map((role: CustomRole) => role.roleKey),
            ];
            return availableRoleKeys.includes(currentRole) ? currentRole : (availableRoleKeys[0] ?? "viewer");
          });
        }
      })
      .catch((loadError: unknown) => {
        console.error("Could not load custom roles:", loadError);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim()) {
      setError("Please enter a username and Microsoft account email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await addUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role: assignedRole,
      });

      if (res?.user) {
        setCreatedUser({
          id: res.user.id,
          username: res.user.username,
          email: res.user.email,
          role: res.user.role,
        });
      } else {
        setError("Failed to create user account.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating user.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setUsername("");
    setEmail("");
    setAssignedRole("viewer");
    setCreatedUser(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user || !userHasPermission(user, "users.create")) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger p-4 mx-auto" style={{ maxWidth: "500px" }}>
          <i className="bi bi-shield-x fs-1 d-block mb-2 text-danger"></i>
          <h4>Access Denied</h4>
          <p className="text-muted small">You do not have permission to add users.</p>
          <Link href="/dashboard?tab=users" className="btn btn-primary mt-2">
            Back to User Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="users" />

      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-4 p-md-5">
          <div className="mb-4">
            <h3 className="fw-bold mb-1">Add New User</h3>
            <p className="text-muted small mb-0">
              Add a GSAS user using the email address they use to sign in with Microsoft.
            </p>
          </div>

          <div className="apex-card">
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 py-2 px-3 small">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>{error}</div>
              </div>
            )}

            {createdUser ? (
              <div>
                <div className="alert alert-success d-flex align-items-center gap-2 mb-4">
                  <i className="bi bi-check-circle-fill fs-5"></i>
                  <div>
                    <strong>User Created Successfully!</strong> Record has been written to PostgreSQL.
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 border mb-4">
                  <h6 className="fw-bold mb-3">User Details:</h6>
                  <div className="row g-2 mb-2">
                    <div className="col-4 text-muted small">Username:</div>
                    <div className="col-8 fw-semibold">@{createdUser.username}</div>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-4 text-muted small">Email:</div>
                    <div className="col-8">{createdUser.email}</div>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-4 text-muted small">Assigned Role:</div>
                    <div className="col-8">
                      <span className="badge bg-light text-secondary border">
                        {getUserRoleLabel(
                          createdUser.role,
                          customRoles.find(({ roleKey }) => roleKey === createdUser.role)?.name
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button onClick={handleReset} className="btn btn-outline-primary">
                    <i className="bi bi-person-plus me-1"></i> Add Another User
                  </button>
                  <Link href="/dashboard?tab=users" className="btn btn-primary">
                    <i className="bi bi-people me-1"></i> Return to User Management
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                      Username <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0">
                        <i className="bi bi-person"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="e.g. sconnor"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted border-end-0">
                      <i className="bi bi-envelope"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control border-start-0"
                      placeholder="sconnor@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className="form-text small">
                    GSAS cannot verify whether an email belongs to a Microsoft account at this step. The user must sign in with Microsoft using this exact email; Microsoft confirms the account during sign-in.
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="new-user-role" className="form-label small fw-semibold text-muted text-uppercase mb-1">
                    Assigned Role <span className="text-danger">*</span>
                  </label>
                  <select
                    id="new-user-role"
                    className="form-select"
                    value={assignedRole}
                    onChange={(event) => setAssignedRole(event.target.value as UserRole)}
                    disabled={submitting}
                  >
                    {builtinRoles
                      .filter((role) => role.roleKey !== "admin" || user.role === "super_admin")
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
                  <div className="form-text small">
                    Permissions and access privileges are determined by the assigned role.
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                  <Link href="/dashboard?tab=users" className="btn btn-outline-secondary px-4">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-success px-4 fw-semibold shadow-sm"
                    style={{ backgroundColor: "#10b981", borderColor: "#10b981" }}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-check-fill me-2"></i> Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
