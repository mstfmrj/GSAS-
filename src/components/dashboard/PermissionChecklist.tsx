"use client";

/**
 * src/components/dashboard/PermissionChecklist.tsx
 *
 * PURPOSE:
 * Interactive checkbox matrix component for assigning granular system permissions to roles.
 */

import { normalizePermissions, PERMISSION_GROUPS, togglePermissionSelection } from "@/lib/types";
import type { PermissionKey } from "@/lib/types";

interface PermissionChecklistProps {
  permissions: PermissionKey[];
  onChange: (permissions: PermissionKey[]) => void;
  allowedPermissions?: readonly PermissionKey[];
  disabled?: boolean;
}

export default function PermissionChecklist({
  permissions,
  onChange,
  allowedPermissions,
  disabled = false,
}: PermissionChecklistProps) {
  const selectedPermissions = normalizePermissions(permissions);
  const allowed = allowedPermissions ? new Set(normalizePermissions(allowedPermissions)) : undefined;

  const togglePermission = (permission: PermissionKey) => {
    onChange(togglePermissionSelection(selectedPermissions, permission));
  };

  return (
    <>
      <div className="d-flex flex-column gap-3">
        {PERMISSION_GROUPS.map((group) => {
          const visiblePermissions = allowed
            ? group.permissions.filter(({ key }) => allowed.has(key))
            : group.permissions;
          if (visiblePermissions.length === 0) return null;

          return (
            <section className="border rounded-3 p-3" key={group.title}>
              <h6 className="fw-bold mb-2">{group.title}</h6>
              <div className="row g-2">
                {visiblePermissions.map(({ key, label }) => (
                  <div className="col-12 col-sm-6" key={key}>
                    <label className="d-flex align-items-center gap-2 p-2 rounded">
                      <input
                        className="form-check-input m-0"
                        type="checkbox"
                        checked={selectedPermissions.includes(key)}
                        onChange={() => togglePermission(key)}
                        disabled={disabled}
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
      <p className="small text-muted mt-3 mb-0">
        Actions require the matching view permission, and feature views require dashboard access. Removing view access also removes dependent permissions.
      </p>
      {allowedPermissions && allowedPermissions.length === 0 && (
        <p className="small text-muted mb-0">You do not have permissions to grant.</p>
      )}
    </>
  );
}
