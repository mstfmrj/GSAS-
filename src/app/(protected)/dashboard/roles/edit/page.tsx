"use client";

/**
 * src/app/(protected)/dashboard/roles/edit/page.tsx
 *
 * PURPOSE:
 * Role edit page for modifying custom role titles, descriptions, and assigned permission matrices.
 */

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import PermissionChecklist from "@/components/dashboard/PermissionChecklist";
import type { CustomRole, PermissionKey } from "@/lib/types";

function EditCustomRoleContent() {
  const searchParams = useSearchParams();
  const roleKey = searchParams.get("roleKey");
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Pick<CustomRole, "roleKey" | "name" | "permissions"> | null>(null);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [loadingRole, setLoadingRole] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!roleKey || roleKey === "super_admin") return;

    let active = true;
    fetch(`/api/roles/${encodeURIComponent(roleKey)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Could not load role settings.");
        }
        const foundRole = result.data as Pick<CustomRole, "roleKey" | "name" | "permissions">;
        if (active) {
          setRole(foundRole);
          setName(foundRole.name);
          setPermissions(foundRole.permissions);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load role settings.");
      })
      .finally(() => {
        if (active) setLoadingRole(false);
      });

    return () => {
      active = false;
    };
  }, [roleKey]);

  const saveRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const isCustomRole = role.roleKey.startsWith("custom:");
      const response = await fetch(`/api/roles/${encodeURIComponent(role.roleKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCustomRole ? { name, permissions } : { permissions }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not update custom role.");
      }
      setRole(result.data);
      setName(result.data.name);
      setPermissions(result.data.permissions);
      setSuccess(isCustomRole ? "Role name and permissions updated." : "Role permissions updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update custom role.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="container py-5 text-center"><span className="spinner-border text-primary" /></div>;
  }

  if (!roleKey || roleKey === "super_admin") {
    return (
      <div className="container py-5">
        <div className="alert alert-warning text-center">
          <h4>Role cannot be edited</h4>
          <p>Super Admin permissions are protected, and no editable role was specified.</p>
          <Link href="/dashboard/permissions" className="btn btn-primary">Return to Role Management</Link>
        </div>
      </div>
    );
  }

  if (loadingRole) {
    return <div className="container py-5 text-center"><span className="spinner-border text-primary" /></div>;
  }

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger text-center">
          <h4>Access Denied</h4>
          <p>Only Super Admin and Admin can edit roles.</p>
          <Link href="/dashboard/permissions" className="btn btn-primary">Return to Role Management</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="permissions" />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-4 p-md-5">
          <div className="mb-4">
            <h3 className="fw-bold mb-1">Edit {role?.name ?? "Role"}</h3>
            <p className="text-muted small mb-0">
              {role?.roleKey.startsWith("custom:")
                ? "Update this role’s name and permissions. Changes apply to everyone assigned to the role."
                : "Update this role’s permissions. Changes apply to everyone assigned to the role."}
            </p>
          </div>

          <form className="apex-card" onSubmit={saveRole}>
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="mb-4">
              <label htmlFor="role-name" className="form-label fw-semibold">Role Name</label>
              <input
                id="role-name"
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={48}
                autoComplete="off"
                disabled={!role || !role.roleKey.startsWith("custom:") || saving}
                required
              />
            </div>

            <h5 className="fw-bold mb-3">Permissions</h5>
            <p className="text-muted small mb-3">
              Actions require the matching view permission, and feature views require dashboard access. Removing view access also removes dependent permissions.
            </p>
            <div className="mb-4">
              <PermissionChecklist
                permissions={permissions}
                onChange={setPermissions}
                disabled={!role || saving}
              />
            </div>

            <div className="d-flex justify-content-end gap-2 border-top pt-3">
              <Link href="/dashboard/permissions" className="btn btn-outline-secondary">Cancel</Link>
              <button className="btn btn-primary" type="submit" disabled={!role || saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function EditCustomRolePage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <EditCustomRoleContent />
    </Suspense>
  );
}
