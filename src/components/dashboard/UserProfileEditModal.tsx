"use client";

import { useEffect, useState } from "react";
import { updateProfile } from "@/apiService/client/users";
import type { User } from "@/lib/types";

interface UserProfileEditModalProps {
  show: boolean;
  user: User;
  onClose: () => void;
  onProfileUpdated: () => Promise<void> | void;
}

export default function UserProfileEditModal({
  show,
  user,
  onClose,
  onProfileUpdated,
}: UserProfileEditModalProps) {
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setName(user.name || "");
      setError(null);
      setSuccess(null);
    }
  }, [show, user]);

  if (!show) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Full name cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile({ name: trimmedName });
      setSuccess("Full name updated successfully.");
      await onProfileUpdated();
      setTimeout(onClose, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update full name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="dashboard-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1060,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-lg"
        style={{ maxWidth: "560px", width: "100%", borderRadius: "1rem", overflow: "hidden" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-pencil-square text-primary fs-5"></i>
            <h5 className="mb-0 fw-bold">Edit Profile</h5>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body p-4">
            {success && <div className="alert alert-success py-2" role="alert">{success}</div>}
            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

            <div className="mb-2">
              <label htmlFor="editName" className="form-label fw-semibold text-muted small">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                id="editName"
                type="text"
                className="form-control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className="card-footer bg-white py-3 px-4 border-top d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={saving}>
              {saving ? (
                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span>Saving...</span></>
              ) : (
                <><i className="bi bi-check-lg"></i><span>Save Changes</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
