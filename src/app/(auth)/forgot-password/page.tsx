"use client";

/**
 * src/app/(auth)/forgot-password/page.tsx
 *
 * PURPOSE:
 * Password recovery page allowing users to request reset codes and set new credentials.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import GordLogo from "@/components/GordLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const strength = checkPasswordStrength(password);

  async function requestCode() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to request a verification code.");
      }
      setCodeRequested(true);
      setMessage(result.message || "If an account exists for that email, a verification code will be sent.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!Object.values(strength.checks).every(Boolean)) {
      setError("Use at least 8 characters, including uppercase, lowercase, a number, and a special character.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code, newPassword: password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to reset your password.");
      }
      setComplete(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset your password.");
    } finally {
      setLoading(false);
    }
  }

  if (complete) {
    return (
      <div className="auth-scenery-page">
        <div className="auth-modal-card p-4 p-md-5 mx-auto text-center" style={{ maxWidth: "460px", width: "100%" }}>
          <GordLogo size={64} />
          <div className="text-success fs-1 mt-3"><i className="bi bi-check-circle-fill"></i></div>
          <h2 className="fw-bold mt-2">Password updated</h2>
          <p className="text-muted">Your password has been changed. You can now sign in with your new password.</p>
          <Link href="/login" className="btn btn-primary w-100">Back to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-scenery-page">
      <div className="auth-modal-card p-4 p-md-5 mx-auto" style={{ maxWidth: "460px", width: "100%" }}>
        <div className="text-center mb-4">
          <Link href="/" className="d-inline-flex text-decoration-none mb-3">
            <GordLogo size={64} />
          </Link>
          <h2 className="fw-bold mb-1">{codeRequested ? "Reset your password" : "Forgot password?"}</h2>
          <p className="text-muted small mb-0">
            {codeRequested
              ? "Enter the six-digit code sent to your email and choose a new password."
              : "Enter the email address associated with your account to receive a reset code."}
          </p>
        </div>

        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        {message && <div className="alert alert-info py-2 small" role="status">{message}</div>}

        {!codeRequested ? (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void requestCode();
            }}
          >
            <label htmlFor="reset-email" className="form-label fw-semibold small text-muted text-uppercase mb-1">
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              className="form-control mb-3"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Sending code..." : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <div className="small text-muted mb-3">
              Code sent to <span className="fw-semibold text-dark">{email}</span>
              {" · "}
              <button
                type="button"
                className="btn btn-link btn-sm p-0 align-baseline"
                onClick={() => {
                  setCodeRequested(false);
                  setMessage("");
                  setCode("");
                }}
                disabled={loading}
              >
                Change email
              </button>
            </div>
            <div className="mb-3">
              <label htmlFor="reset-code" className="form-label fw-semibold small text-muted text-uppercase mb-1">
                Six-digit email code
              </label>
              <input
                id="reset-code"
                type="text"
                className="form-control"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={loading}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label fw-semibold small text-muted text-uppercase mb-1">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />
              <div className="small text-muted mt-1">
                At least 8 characters, with uppercase, lowercase, number, and special character.
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="confirm-password" className="form-label fw-semibold small text-muted text-uppercase mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-control"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Updating password..." : "Reset password"}
            </button>
            <button
              type="button"
              className="btn btn-link w-100 mt-2"
              onClick={requestCode}
              disabled={loading}
            >
              Send another code
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link href="/login" className="small text-decoration-none">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
