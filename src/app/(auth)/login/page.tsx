"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const callbackError = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMicrosoftSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("microsoft-entra-id", {
        redirectTo: `/auth/complete?redirect=${encodeURIComponent(redirectPath)}`,
      });
    } catch {
      setLoading(false);
      setError("Microsoft sign-in could not be started. Please try again.");
    }
  };

  return (
    <div className="auth-modal-card p-4 p-md-5 mx-auto text-center" style={{ maxWidth: 460, width: "100%" }}>
      <Link href="/" className="d-inline-flex justify-content-center text-decoration-none mb-4">
        <img
          src="/gsas-seal.png"
          alt="Global Sustainability Assessment System"
          className="img-fluid"
          style={{ maxWidth: 180, height: "auto", objectFit: "contain" }}
        />
      </Link>
      <h1 className="h4 fw-bold mb-2">Sign in to GSAS</h1>
      <p className="text-muted small mb-4">Use your Microsoft account to continue.</p>
      {callbackError && (
        <div className="alert alert-danger small text-start" role="alert">
          Microsoft sign-in failed ({callbackError}). Check the development-server terminal for details.
        </div>
      )}
      {error && <div className="alert alert-danger small" role="alert">{error}</div>}
      <button
        type="button"
        className="btn btn-primary w-100 py-2 fw-semibold"
        onClick={() => void handleMicrosoftSignIn()}
        disabled={loading}
      >
        {loading ? (
          <><span className="spinner-border spinner-border-sm me-2" role="status" />Connecting to Microsoft…</>
        ) : (
          <><i className="bi bi-microsoft me-2" />Sign in with Microsoft</>
        )}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-scenery-page">
      <Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-light" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
