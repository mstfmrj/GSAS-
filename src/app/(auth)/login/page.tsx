"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const TRIAL_ACCOUNTS = [
  { role: "Super Admin", email: "admin@example.com", password: "password123", icon: "bi-shield-fill-check" },
  { role: "Viewer", email: "viewer.trial@example.com", password: "password123", icon: "bi-person" },
  { role: "Manager", email: "mustafa@example.com", password: "password123", icon: "bi-person-gear" },
] as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const { login } = useAuth();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      router.push(redirectPath);
      router.refresh();
    } else {
      setError(result.error || "Invalid credentials. Please verify your login details.");
    }
  };

  const handleTrial = async (trial: (typeof TRIAL_ACCOUNTS)[number]) => {
    setError(null);
    setEmail(trial.email);
    setPassword(trial.password);
    setLoading(true);
    const result = await login(trial.email, trial.password);
    setLoading(false);
    if (result.success) {
      router.push(redirectPath);
      router.refresh();
    } else {
      setError(`${trial.role} trial sign-in failed. Please contact the administrator.`);
    }
  };

  return (
    <div className="auth-modal-card p-4 p-md-5 mx-auto" style={{ maxWidth: "460px", width: "100%" }}>

      {/* Brand logo */}
      <div className="text-center mb-4 d-flex justify-content-center">
        <Link href="/" className="d-inline-flex justify-content-center text-decoration-none">
          <img
            src="/gsas-seal.png"
            alt="Global Sustainability Assessment System"
            className="img-fluid d-block"
            style={{
              maxWidth: "180px",
              width: "100%",
              height: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))",
            }}
          />
        </Link>
      </div>

      {}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4 py-2 px-3 small" role="alert">
          <i className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"></i>
          <div>{error}</div>
        </div>
      )}

      {}
      <form onSubmit={handleSubmit}>
        {}
        <div className="mb-3">
          <label className="form-label fw-semibold small text-muted text-uppercase mb-1">
            Email Address
          </label>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0 text-muted">
              <i className="bi bi-envelope"></i>
            </span>
            <input
              type="email"
              className="form-control border-start-0 ps-0"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label fw-semibold small text-muted text-uppercase mb-0">Password</label>
            <Link href="/forgot-password" className="small text-decoration-none text-primary">
              Forgot password?
            </Link>
          </div>
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0 text-muted">
              <i className="bi bi-lock"></i>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              className="form-control border-start-0 border-end-0 ps-0"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary border-start-0 bg-white text-muted"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
            </button>
          </div>
        </div>

        {}
        <button
          type="submit"
          className="btn btn-primary w-100 py-2 mb-3 fw-semibold shadow"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Authenticating...
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-in-right me-2"></i> Sign In
            </>
          )}
        </button>
      </form>

      {}
      <div className="d-flex align-items-center gap-2 my-3">
        <hr className="flex-grow-1 m-0" />
        <span className="small text-muted px-1">or</span>
        <hr className="flex-grow-1 m-0" />
      </div>

      <div className="mb-2">
        <p className="text-center small fw-semibold text-muted mb-2">Try a role</p>
        <div className="d-grid gap-2">
          {TRIAL_ACCOUNTS.map((trial) => (
            <button
              key={trial.role}
              type="button"
              className="btn btn-outline-success py-2 fw-semibold"
              onClick={() => void handleTrial(trial)}
              disabled={loading}
            >
              {loading && email === trial.email && password === trial.password ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              ) : (
                <i className={`bi ${trial.icon} me-2`}></i>
              )}
              Try as {trial.role}
            </button>
          ))}
        </div>
        <p className="text-center text-muted mt-2 mb-0" style={{ fontSize: "11px" }}>
          Sign in instantly with a trial account; no sign-up needed.
        </p>
      </div>

      {}
      <div className="text-center mt-4 pt-2">
        <p className="small text-muted mb-0">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="text-primary fw-semibold text-decoration-none">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-scenery-page">
      <Suspense
        fallback={
          <div className="text-center py-5">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
