"use client";

/**
 * src/app/(protected)/dashboard/roles/new/page.tsx
 *
 * PURPOSE:
 * Role creation page for designing and configuring new custom access control roles.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { normalizePermissions, PERMISSION_GROUPS, togglePermissionSelection, type PermissionKey } from "@/lib/types";

export default function CreateRolePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (permission: PermissionKey) => {
    setPermissions((selected) => togglePermissionSelection(selected, permission));
  };

  const toggleGroup = (groupPermissions: PermissionKey[]) => {
    const allSelected = groupPermissions.every((permission) => permissions.includes(permission));
    setPermissions((selected) => normalizePermissions(
      allSelected
        ? selected.filter((permission) => !groupPermissions.includes(permission))
        : [...new Set([...selected, ...groupPermissions])]
    ));
  };

  const createRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || "Could not create role.");
        return;
      }
      router.push("/dashboard/permissions");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create role.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container py-5 text-center"><span className="spinner-border text-primary" /></div>;
  }

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger text-center">
          <h4>Access Denied</h4>
          <p>Only Super Admin and Admin can create custom roles.</p>
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
            <h3 className="fw-bold mb-1">Create Custom Role</h3>
            <p className="text-muted small mb-0">Name the role and select the permissions it should have.</p>
          </div>

          <form className="apex-card" onSubmit={createRole}>
            {error && <div className="alert alert-danger">{error}</div>}
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
                required
              />
            </div>

            <h5 className="fw-bold mb-3">Select Permissions</h5>
            <p className="text-muted small mb-3">
              Actions require the matching view permission, and feature views require dashboard access. Removing view access also removes dependent permissions.
            </p>
            <div className="d-flex flex-column gap-3 mb-4">
              {PERMISSION_GROUPS.map((group) => {
                const groupKeys = group.permissions.map(({ key }) => key);
                const allSelected = groupKeys.every((key) => permissions.includes(key));
                return (
                  <section key={group.title} className="border rounded-3 p-3">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                      <h6 className="fw-bold mb-0">{group.title}</h6>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => toggleGroup(groupKeys)}
                      >
                        {allSelected ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    <div className="row g-2">
                      {group.permissions.map(({ key, label }) => (
                        <div className="col-12 col-sm-6" key={key}>
                          <label className="d-flex align-items-center gap-2 p-2 rounded">
                            <input
                              className="form-check-input m-0"
                              type="checkbox"
                              checked={permissions.includes(key)}
                              onChange={() => togglePermission(key)}
                            />
                            <span>{label}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="d-flex justify-content-end gap-2 border-top pt-3">
              <Link href="/dashboard/permissions" className="btn btn-outline-secondary">Cancel</Link>
              <button className="btn btn-primary" type="submit" disabled={saving || permissions.length === 0}>
                {saving ? "Creating…" : "Create Role"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
