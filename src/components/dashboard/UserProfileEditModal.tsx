"use client";

/**
 * src/components/dashboard/UserProfileEditModal.tsx
 *
 * PURPOSE:
 * Modal dialog enabling users to edit their full name, username, and optionally
 * change their password with current password verification.
 */

import { useState, useEffect } from "react";
import { updateProfile } from "@/apiService/client/users";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import type { User } from "@/lib/types";

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`d-flex align-items-center gap-1 small ${ok ? "text-success" : "text-muted"}`}>
      <i className={`bi ${ok ? "bi-check-circle-fill" : "bi-circle"}`} style={{ fontSize: "0.7rem" }}></i>
      {label}
    </span>
  );
}

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
  const [username, setUsername] = useState(user.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const strength = checkPasswordStrength(newPassword);

  useEffect(() => {
    if (show) {
      setName(user.name || "");
      setUsername(user.username || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setError(null);
      setSuccess(null);
    }
  }, [show, user]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      setError("Full name cannot be empty.");
      return;
    }

    if (!trimmedUsername) {
      setError("Username cannot be empty.");
      return;
    }

    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setError("Current password is required to change password.");
        return;
      }
      if (!newPassword) {
        setError("Please enter a new password.");
        return;
      }
      if (!strength.checks.length) {
        setError("New password must be at least 8 characters long.");
        return;
      }
      if (!strength.checks.lowercase) {
        setError("New password must contain at least one lowercase letter.");
        return;
      }
      if (!strength.checks.uppercase) {
        setError("New password must contain at least one uppercase letter.");
        return;
      }
      if (!strength.checks.number) {
        setError("New password must contain at least one number.");
        return;
      }
      if (!strength.checks.special) {
        setError("New password must contain at least one special character.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: {
        name: string;
        username: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        name: trimmedName,
        username: trimmedUsername,
      };

      if (newPassword && currentPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      await updateProfile(payload);
      setSuccess("Profile updated successfully!");

      if (onProfileUpdated) {
        await onProfileUpdated();
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="dashboard-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        style={{
          maxWidth: "560px",
          width: "100%",
          borderRadius: "1rem",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-pencil-square text-primary fs-5"></i>
            <h5 className="mb-0 fw-bold">Edit Profile</h5>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          ></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {success && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2" role="alert">
                <i className="bi bi-check-circle-fill"></i>
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>{error}</span>
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="editFullName" className="form-label fw-semibold text-muted small">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                id="editFullName"
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="editUsername" className="form-label fw-semibold text-muted small">
                Username <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted">@</span>
                <input
                  id="editUsername"
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-light rounded-3 border mb-2">
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-shield-lock text-primary"></i>
                <span className="fw-bold small text-dark">Change Password</span>
              </div>
              <p className="text-muted small mb-3">
                Leave password fields empty if you do not want to change your password.
              </p>

              <div className="mb-3">
                <label htmlFor="editCurrentPassword" className="form-label fw-semibold text-muted small">
                  Current Password
                </label>
                <div className="input-group">
                  <input
                    id="editCurrentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    className="form-control bg-white"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showCurrentPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                  </button>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label htmlFor="editNewPassword" className="form-label fw-semibold text-muted small">
                    New Password
                  </label>
                  <div className="input-group">
                    <input
                      id="editNewPassword"
                      type={showNewPassword ? "text" : "password"}
                      className="form-control bg-white"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Strong password required"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                    >
                      <i className={`bi ${showNewPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label htmlFor="editConfirmPassword" className="form-label fw-semibold text-muted small">
                    Confirm Password
                  </label>
                  <div className="input-group">
                    <input
                      id="editConfirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      className="form-control bg-white"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                </div>
              </div>

              {newPassword.length > 0 && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="small text-muted">Strength</span>
                    <span className={`small fw-semibold ${strength.color}`}>{strength.label}</span>
                  </div>
                  <div className="progress mb-2" style={{ height: 5 }}>
                    <div
                      className="progress-bar"
                      style={{ width: `${strength.percent}%`, backgroundColor: strength.barColor }}
                    />
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

          <div className="card-footer bg-white py-3 px-4 border-top d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary d-flex align-items-center gap-2"
              disabled={saving || (newPassword.length > 0 && strength.score < 4)}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg"></i>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
