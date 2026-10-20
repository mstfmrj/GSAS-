"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AccessPendingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [message, setMessage] = useState("Waiting for an administrator to approve your access…");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const checkAccess = async () => {
      try {
        const response = await fetch("/api/auth/microsoft-session", {
          method: "POST",
          cache: "no-store",
        });
        const result = await response.json();
        if (!active) return;

        if (response.ok && result.success && result.data?.status === "active") {
          setMessage("Access approved. Opening GSAS…");
          await refreshUser();
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        if (!response.ok || !result.success) {
          setMessage(result.error || "Could not check your access. Please sign in again.");
          return;
        }
        setMessage("Your Microsoft account is signed in. Please wait while an administrator reviews your access request.");
        timer = setTimeout(checkAccess, 5000);
      } catch {
        if (!active) return;
        setMessage("Could not check your access right now. This page will try again shortly.");
        timer = setTimeout(checkAccess, 10000);
      }
    };

    void checkAccess();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refreshUser, router]);

  return (
    <main className="auth-scenery-page">
      <section className="auth-modal-card p-4 p-md-5 mx-auto text-center" style={{ maxWidth: 520 }}>
        <div className="rounded-circle bg-warning-subtle text-warning-emphasis d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64 }}>
          <i className="bi bi-hourglass-split fs-2" aria-hidden="true"></i>
        </div>
        <h1 className="h3 fw-bold mb-2">Waiting for access</h1>
        <p className="text-muted mb-3">Your Microsoft sign-in succeeded, but an administrator needs to approve your GSAS access.</p>
        <div className="small text-muted" role="status" aria-live="polite">{message}</div>
      </section>
    </main>
  );
}
