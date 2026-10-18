"use client";

/**
 * src/app/(auth)/register/page.tsx
 *
 * PURPOSE:
 * Public user registration page with real-time password strength validation.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import GordLogo from "@/components/GordLogo";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = checkPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!strength.checks.length) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!strength.checks.lowercase) {
      setError("Password must contain a lowercase letter.");
      return;
    }
    if (!strength.checks.uppercase) {
      setError("Password must contain an uppercase letter.");
      return;
    }
    if (!strength.checks.number) {
      setError("Password must contain a number.");
      return;
    }
    if (!strength.checks.special) {
      setError("Password must contain a special character (!@#$%...).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await register(username.trim(), email.trim(), password, name.trim());
    setLoading(false);

    if (result.success) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(result.error || "Failed to register account.");
    }
  };

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`d-flex align-items-center gap-1 small ${ok ? "text-success fw-semibold" : "text-muted"}`}>
      <i className={`bi ${ok ? "bi-check-circle-fill" : "bi-circle"}`} style={{ fontSize: "0.75rem" }}></i>
      {label}
    </span>
  );

  return (
    <div className="auth-scenery-page">
      <div className="auth-modal-card p-4 p-md-5 mx-auto" style={{ maxWidth: "520px", width: "100%" }}>
        <div className="text-center mb-4">
          <Link href="/" className="d-inline-flex text-decoration-none mb-3">
            <GordLogo size={64} />
          </Link>
          <h2 className="fw-bold mb-1 tracking-tight">Create Account</h2>
          <p className="text-muted small">
            Join GSAS &bull; Set up your secure account
          </p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-4 py-2 px-3 small" role="alert">
            <i className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
              Full Name <span className="fw-normal text-muted">(optional)</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-card-heading"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-6">
              <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
                Username <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="e.g. alexj"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="col-12 col-sm-6">
              <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
                Email Address <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  type="email"
                  className="form-control border-start-0 ps-0"
                  placeholder="alex@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
              Password <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-lock"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control border-start-0 border-end-0 ps-0"
                placeholder="8+ chars, upper, lower, digit, special"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0 bg-white text-muted"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>

            {password.length > 0 && (
              <div className="mt-2 p-2 rounded bg-light border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted" style={{ fontSize: "11px" }}>Strength Level:</span>
                  <span className={`small fw-bold ${strength.color}`} style={{ fontSize: "11px" }}>
                    {strength.label}
                  </span>
                </div>
                <div className="progress mb-2" style={{ height: "5px" }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                      width: `${strength.percent}%`,
                      backgroundColor: strength.barColor,
                      transition: "width 0.3s ease, background-color 0.3s ease",
                    }}
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

          <div className="mb-4">
            <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
              Confirm Password <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-lock-fill"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className={`form-control border-start-0 ps-0 ${
                  confirmPassword && confirmPassword !== password
                    ? "is-invalid"
                    : confirmPassword && confirmPassword === password
                    ? "is-valid"
                    : ""
                }`}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            {confirmPassword && confirmPassword !== password && (
              <div className="text-danger small mt-1">
                <i className="bi bi-x-circle me-1"></i> Passwords do not match
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 mb-3 fw-semibold shadow"
            disabled={loading || strength.score < 4}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Creating Account...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i> Register Account
              </>
            )}
          </button>

          {strength.score < 4 && password.length > 0 && (
            <p className="text-muted text-center small mb-3" style={{ fontSize: "12px" }}>
              <i className="bi bi-info-circle me-1"></i>
              Please meet all password requirements before registering
            </p>
          )}
        </form>

        <div className="text-center pt-2">
          <p className="small text-muted mb-0">
            Already have an account?{" "}
            <Link href="/login" className="text-primary fw-semibold text-decoration-none">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
