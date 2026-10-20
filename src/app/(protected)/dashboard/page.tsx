"use client";








import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminThemeSettings from "@/components/dashboard/AdminThemeSettings";
import UserProfileCard from "@/components/dashboard/UserProfileCard";
import UserProfileEditModal from "@/components/dashboard/UserProfileEditModal";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GSASProjectsDashboard from "@/components/dashboard/GSASProjectsDashboard";
import type { PendingUser, UserActivity, UserRole } from "@/lib/types";
import { can, getUserRoleLabel, userHasPermission } from "@/lib/types";
import { getUsers, deleteUser, deletePendingUser, approvePendingUser, toggleBlockUser } from "@/apiService/client/users";
import { formatMinutes, timeAgo, prioritizeAdmins } from "@/helpers/client/dataHelpers";

type ActiveTab = "analytics" | "users" | "customizer" | "profile";
const DASHBOARD_TABS: ActiveTab[] = ["analytics", "users", "customizer", "profile"];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refreshUser } = useAuth();

  const requestedTab = searchParams.get("tab");
  const activeTab = requestedTab && DASHBOARD_TABS.includes(requestedTab as ActiveTab)
    ? requestedTab as ActiveTab
    : "analytics";

  const [activityUsers, setActivityUsers] = useState<UserActivity[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [activitySummary, setActivitySummary] = useState({ total: 0, online: 0, offline: 0 });

  const [deleteTarget, setDeleteTarget] = useState<UserActivity | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);

  const [blockTarget, setBlockTarget] = useState<UserActivity | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const handleToggleBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    setActionMessage(null);
    try {
      const res = await toggleBlockUser({
        id: blockTarget.userId,
        blocked: !blockTarget.isBlocked,
      });

      if (res?.user) {
        setActionMessage({
          text: `${res.user.name} is now ${res.user.isBlocked ? "blocked/banned" : "unblocked"}.`,
          type: res.user.isBlocked ? "danger" : "success",
        });
        setBlockTarget(null);
        fetchActivity();
      } else {
        setActionMessage({ text: "Failed to update user status.", type: "danger" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error blocking user.";
      setActionMessage({ text: msg, type: "danger" });
    } finally {
      setBlockLoading(false);
    }
  };

  const fetchActivity = useCallback(async () => {
    try {
      const data = await getUsers();
      if (data) {
        setActivityUsers(data.users || []);
        setPendingUsers(data.pendingUsers || []);
        setActivitySummary(data.summary || { total: 0, online: 0, offline: 0 });
      }
    } catch {
    }
  }, []);

  const handleDeletePendingUser = async (pendingUser: PendingUser) => {
    setActionMessage(null);
    try {
      const result = await deletePendingUser({ id: pendingUser.id });
      if (result?.success) {
        setPendingUsers((current) => current.filter((item) => item.id !== pendingUser.id));
        setActionMessage({ text: `${pendingUser.email} was removed from Pending.`, type: "success" });
      } else {
        setActionMessage({ text: "Could not remove pending user.", type: "danger" });
      }
    } catch {
      setActionMessage({ text: "Network error removing pending user.", type: "danger" });
    }
  };

  const handleApprovePendingUser = async (pendingUser: PendingUser) => {
    setActionMessage(null);
    try {
      const result = await approvePendingUser({ id: pendingUser.id });
      if (result?.pendingUser) {
        setPendingUsers((current) => current.map((item) => item.id === pendingUser.id ? result.pendingUser : item));
        setActionMessage({ text: `${pendingUser.email} is approved. Their waiting screen will grant access automatically.`, type: "success" });
      } else {
        setActionMessage({ text: "Could not approve this access request.", type: "danger" });
      }
    } catch {
      setActionMessage({ text: "Network error approving access request.", type: "danger" });
    }
  };

  useEffect(() => {
    if (!user) return;
    if (userHasPermission(user, "users.view")) {
      fetchActivity();
    }
  }, [user, fetchActivity]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setActionMessage(null);
    try {
      const res = await deleteUser({ id: deleteTarget.userId });
      if (res?.success) {
        setActionMessage({ text: `User ${deleteTarget.name} was removed.`, type: "success" });
        setDeleteTarget(null);
        fetchActivity();
      } else {
        setActionMessage({ text: "Failed to remove user.", type: "danger" });
      }
    } catch {
      setActionMessage({ text: "Network error removing user.", type: "danger" });
    } finally {
      setDeleteLoading(false);
    }
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

  if (!user) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning text-center p-4">
          <i className="bi bi-shield-exclamation fs-1 d-block mb-2"></i>
          <h4>Authentication Required</h4>
          <p>Please log in to view the dashboard.</p>
          <Link href="/login" className="btn btn-primary mt-2">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const orderedFilteredUsers = prioritizeAdmins(activityUsers);
  const handleTabChange = (tab: string) => {
    if (!DASHBOARD_TABS.includes(tab as ActiveTab)) return;
    router.replace(
      tab === "analytics" ? "/dashboard" : `/dashboard?tab=${tab}`,
      { scroll: false }
    );
  };

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onlineCount={activitySummary.online}
      />

      <main className="apex-main-content">
        <DashboardHeader />

        {actionMessage && (
          <div className="px-4 pt-3">
            <div className={`alert alert-${actionMessage.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-0`}>
              <i className={`bi ${actionMessage.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}`}></i>
              <div>{actionMessage.text}</div>
              <button type="button" className="btn-close ms-auto" onClick={() => setActionMessage(null)}></button>
            </div>
          </div>
        )}

        <div className="p-4 p-md-5">
          {activeTab === "analytics" && userHasPermission(user, "dashboard.view") && (
            <GSASProjectsDashboard />
          )}

          {activeTab === "users" && userHasPermission(user, "users.view") && (
            <div>
              <div className="d-flex justify-content-between align-items-md-center flex-column flex-md-row gap-3 mb-4">
                <div>
                  <h3 className="fw-bold mb-1">User Management</h3>
                  <p className="text-muted small mb-0">Manage accounts, track presence and remove platform users.</p>
                </div>

                {userHasPermission(user, "users.create") && (
                  <div className="d-flex flex-wrap gap-2">
                    <Link
                      href="/dashboard/new-user"
                      className="btn btn-success d-inline-flex align-items-center gap-2 shadow-sm"
                      style={{ backgroundColor: "#10b981", borderColor: "#10b981" }}
                    >
                      <i className="bi bi-person-plus-fill"></i>
                      <span>Add New User</span>
                    </Link>
                  </div>
                )}
              </div>

              <div className="apex-card">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>User Details</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Online Time</th>
                        <th>Last Seen</th>
                        <th>Created</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedFilteredUsers.map((u) => {
                              const isSelf = u.userId === user.id;
                              return (
                          <tr key={u.userId}>
                            <td>
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                                  style={{
                                    width: "38px",
                                    height: "38px",
                                    backgroundColor:
                                      u.role === "super_admin"
                                        ? "#1e3a5f"
                                        : u.role === "admin"
                                        ? "#0f172a"
                                        : u.role === "moderator"
                                        ? "#0d6efd"
                                        : u.role === "viewer"
                                        ? "#0dcaf0"
                                        : "#10b981",
                                  }}
                                >
                                  {(u.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold">{u.name || "—"}</div>
                                  <small className="text-muted">{u.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-secondary border px-2 py-1">
                                {getUserRoleLabel(u.role, u.roleName)}
                              </span>
                            </td>
                            <td>
                              {u.isBlocked ? (
                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger d-inline-flex align-items-center gap-1">
                                  <i className="bi bi-slash-circle-fill"></i>
                                  Banned
                                </span>
                              ) : u.isOnline ? (
                                <span className="badge bg-success bg-opacity-10 text-success border border-success d-inline-flex align-items-center gap-1">
                                  <span className="rounded-circle bg-success" style={{ width: 6, height: 6 }}></span>
                                  Online
                                </span>
                              ) : (
                                <span className="badge bg-light text-muted border">Offline</span>
                              )}
                            </td>
                            <td className="fw-bold text-success">{formatMinutes(u.totalMinutesOnline)}</td>
                            <td className="small text-muted">{timeAgo(u.lastSeen)}</td>
                            <td className="small text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="text-end">
                              <div className="d-inline-flex align-items-center gap-1">
                                {userHasPermission(user, "users.edit") &&
                                  can.manageUser(user.role as UserRole, u.role) && (
                                  <Link
                                    href={`/dashboard/edit-user?id=${u.userId}`}
                                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center shadow-sm"
                                    style={{ width: "32px", height: "32px", padding: 0 }}
                                    title="Edit User"
                                  >
                                    <i className="bi bi-pencil-square"></i>
                                  </Link>
                                )}
                                {userHasPermission(user, "users.edit") &&
                                  can.manageUser(user.role as UserRole, u.role) &&
                                  !isSelf && (
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${
                                      u.isBlocked
                                        ? "btn-danger text-white shadow-sm"
                                        : "btn-outline-warning text-dark shadow-sm"
                                    } d-inline-flex align-items-center justify-content-center`}
                                    style={{ width: "32px", height: "32px", padding: 0 }}
                                    onClick={() => setBlockTarget(u)}
                                    title={u.isBlocked ? "Unblock / Unban User" : "Block / Ban User"}
                                  >
                                    <i className={`bi ${u.isBlocked ? "bi-slash-circle-fill" : "bi-slash-circle"}`}></i>
                                  </button>
                                )}
                                {isSelf ? (
                                  <span className="badge bg-light text-muted border ms-1">You</span>
                                ) : userHasPermission(user, "users.delete") && !isSelf ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center shadow-sm"
                                    style={{ width: "32px", height: "32px", padding: 0 }}
                                    onClick={() => setDeleteTarget(u)}
                                    title="Delete User"
                                  >
                                    <i className="bi bi-trash-fill"></i>
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                              );
                            })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-5 mb-3">
                <div>
                  <h4 className="fw-bold mb-1">Pending</h4>
                  <p className="text-muted small mb-0">Admin-added entries are approved; first-time sign-in requests need approval before becoming users.</p>
                </div>
                <span className="badge bg-warning-subtle text-warning-emphasis border">{pendingUsers.length} pending</span>
              </div>
              <div className="apex-card">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Assigned Role</th>
                        <th>Access</th>
                        <th>Added</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map((pendingUser) => (
                        <tr key={pendingUser.id}>
                          <td className="fw-semibold">{pendingUser.name || "—"}</td>
                          <td>{pendingUser.email}</td>
                          <td><span className="badge bg-light text-secondary border">{getUserRoleLabel(pendingUser.role, pendingUser.roleName)}</span></td>
                          <td>
                            {pendingUser.approved ? (
                              <span className="badge bg-success-subtle text-success-emphasis border">Approved</span>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning-emphasis border">Awaiting approval</span>
                            )}
                          </td>
                          <td className="small text-muted">{new Date(pendingUser.createdAt).toLocaleDateString()}</td>
                          <td className="text-end">
                            {!pendingUser.approved && userHasPermission(user, "users.edit") && (
                              <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => void handleApprovePendingUser(pendingUser)} title="Approve access">
                                <i className="bi bi-check-lg me-1"></i>Approve
                              </button>
                            )}
                            {userHasPermission(user, "users.delete") && (
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void handleDeletePendingUser(pendingUser)} title="Remove pending user">
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {pendingUsers.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-4 text-muted">No pending users</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "customizer" && (
            <div>
              <div className="mb-4">
                <h3 className="fw-bold mb-1">Theme Customizer</h3>
                <p className="text-muted small">Customize brand palette, navbar variants, and typography in real-time.</p>
              </div>

              <AdminThemeSettings />
            </div>
          )}

          {activeTab === "profile" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="fw-bold mb-1">My Profile</h3>
                  <p className="text-muted small mb-0">Manage personal profile details and security settings.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-2"
                  onClick={() => setShowEditProfileModal(true)}
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>Edit Profile</span>
                </button>
              </div>

              <div className="apex-card mb-4">
                <UserProfileCard user={user} />
              </div>

              <UserProfileEditModal
                show={showEditProfileModal}
                user={user}
                onClose={() => setShowEditProfileModal(false)}
                onProfileUpdated={refreshUser}
              />
            </div>
          )}
        </div>
      </main>

      {blockTarget && (
        <div
          className="dashboard-modal-backdrop"
          style={{ zIndex: 1060 }}
          onClick={() => setBlockTarget(null)}
        >
          <div
            className="card border-0 shadow-lg p-4"
            style={{ maxWidth: "480px", width: "90%", borderRadius: "1.25rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`d-flex align-items-center gap-3 ${blockTarget.isBlocked ? "text-success" : "text-warning"} mb-3`}>
              <div className={`rounded-circle ${blockTarget.isBlocked ? "bg-success bg-opacity-10" : "bg-warning bg-opacity-10"} p-3 d-flex align-items-center justify-content-center`}>
                <i className={`bi ${blockTarget.isBlocked ? "bi-check-circle-fill" : "bi-slash-circle-fill"} fs-3`}></i>
              </div>
              <div>
                <h5 className="fw-bold mb-0 text-dark">
                  {blockTarget.isBlocked ? "Unblock / Unban User" : "Block / Ban User"}
                </h5>
                <small className="text-muted">Account access status</small>
              </div>
            </div>

            <p className="text-muted mb-4">
              {blockTarget.isBlocked ? (
                <>
                  Are you sure you want to restore access for <strong>{blockTarget.name}</strong> ({blockTarget.email})? They will be able to log in and use the application again.
                </>
              ) : (
                <>
                  Are you sure you want to block/ban <strong>{blockTarget.name}</strong> ({blockTarget.email})? They will be prevented from logging in and their active sessions will be terminated.
                </>
              )}
            </p>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                onClick={() => setBlockTarget(null)}
                disabled={blockLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${blockTarget.isBlocked ? "btn-success" : "btn-warning text-dark"} px-4 fw-semibold`}
                onClick={handleToggleBlock}
                disabled={blockLoading}
              >
                {blockLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Processing...
                  </>
                ) : blockTarget.isBlocked ? (
                  <>
                    <i className="bi bi-check-circle me-1"></i> Confirm Unblock
                  </>
                ) : (
                  <>
                    <i className="bi bi-slash-circle me-1"></i> Confirm Block &amp; Ban
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="dashboard-modal-backdrop"
          style={{ zIndex: 1060 }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="card border-0 shadow-lg p-4"
            style={{ maxWidth: "480px", width: "90%", borderRadius: "1.25rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center gap-3 text-danger mb-3">
              <div className="rounded-circle bg-danger bg-opacity-10 p-3 d-flex align-items-center justify-content-center">
                <i className="bi bi-exclamation-triangle-fill fs-3"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-0">Confirm Remove User</h5>
                <small className="text-muted">This action is irreversible</small>
              </div>
            </div>

            <p className="text-muted mb-4">
              Are you sure you want to permanently remove user <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? They will no longer be able to log in or access the application.
            </p>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger px-4 fw-semibold"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Removing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash me-1"></i> Remove User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
