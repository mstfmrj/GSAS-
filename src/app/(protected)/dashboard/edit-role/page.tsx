"use client";

/**
 * src/app/(protected)/dashboard/edit-role/page.tsx
 *
 * PURPOSE:
 * Dedicated role editor page for fine-tuning specific role privileges.
 */

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import PermissionChecklist from "@/components/dashboard/PermissionChecklist";
import { getUser, updateUser } from "@/apiService/client/users";
import { can, getUserRoleLabel, userHasPermission } from "@/lib/types";
import type { User, UserRole } from "@/lib/types";

function EditRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const { user: currentUser, loading: authLoading } = useAuth();
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<NonNullable<User["permissions"]>>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError("User ID is required.");
      setLoadingUser(false);
      return;
    }
    let active = true;
    getUser({ id: userId })
      .then((result) => {
        if (!active) return;
        if (!result?.user) throw new Error("Could not load user details.");
        setTargetUser(result.user);
        setPermissions(result.user.permissions ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load user details.");
      })
      .finally(() => {
        if (active) setLoadingUser(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const savePermissions = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetUser) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await updateUser({ id: targetUser.id, permissions });
      if (!response?.user) throw new Error("Could not update this user's permissions.");
      setTargetUser(response.user);
      setSuccess("User permissions updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update permissions.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingUser) {
    return <div className="container py-5 text-center"><span className="spinner-border text-primary" /></div>;
  }

  if (
    !currentUser ||
    !targetUser ||
    !userHasPermission(currentUser, "users.view") ||
    !userHasPermission(currentUser, "users.edit") ||
    !can.manageUser(currentUser.role as UserRole, targetUser.role)
  ) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger text-center">
          <h4>Access Denied</h4>
          <p>You do not have permission to edit this user&apos;s role settings.</p>
          <Link href="/dashboard/permissions" className="btn btn-primary">Return to Role Management</Link>
        </div>
      </div>
    );
  }

  const roleName = getUserRoleLabel(targetUser.role, targetUser.roleName);

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="permissions" />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-4 p-md-5">
          <div className="mb-4">
            <h3 className="fw-bold mb-1">Edit Role</h3>
            <p className="text-muted small mb-0">Permissions are specific to this user.</p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <section className="apex-card mb-4">
            <h5 className="fw-bold mb-3">User Details</h5>
            <dl className="row mb-0">
              <dt className="col-sm-3">Name</dt><dd className="col-sm-9">{targetUser.name || "—"}</dd>
              <dt className="col-sm-3">Username</dt><dd className="col-sm-9">@{targetUser.username}</dd>
              <dt className="col-sm-3">Email</dt><dd className="col-sm-9">{targetUser.email}</dd>
              <dt className="col-sm-3">Current role</dt>
              <dd className="col-sm-9"><span className="badge bg-light text-secondary border">{roleName}</span></dd>
            </dl>
          </section>

          <form className="apex-card" onSubmit={savePermissions}>
            <h5 className="fw-bold mb-1">Permissions</h5>
            <p className="text-muted small mb-4">Selected permissions are enabled; unchecked permissions are not granted.</p>
            <PermissionChecklist
              permissions={permissions}
              onChange={setPermissions}
              allowedPermissions={[
                ...new Set([
                  ...(currentUser.permissions ?? []),
                  ...(targetUser.permissions ?? []),
                ]),
              ]}
              disabled={saving || targetUser.role === "super_admin"}
            />
            {targetUser.role === "super_admin" && (
              <p className="small text-muted mt-3 mb-0">The Super Admin account always retains all permissions.</p>
            )}
            <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-4">
              <Link href="/dashboard/permissions" className="btn btn-outline-secondary">Cancel</Link>
              <button className="btn btn-primary" type="submit" disabled={saving || targetUser.role === "super_admin"}>
                {saving ? "Saving…" : "Save Permissions"}
              </button>
              <button className="btn btn-link" type="button" onClick={() => router.refresh()} disabled={saving}>
                Reload
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function EditRolePage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <EditRoleContent />
    </Suspense>
  );
}
