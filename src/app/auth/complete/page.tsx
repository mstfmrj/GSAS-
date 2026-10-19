"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function MicrosoftSignInCompletePage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [message, setMessage] = useState("Finishing Microsoft sign-in…");

  useEffect(() => {
    let active = true;
    const finish = async () => {
      try {
        const response = await fetch("/api/auth/microsoft-session", { method: "POST" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Sign-in failed");

        await refreshUser();
        const requestedPath = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
        const destination = requestedPath.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/dashboard";
        router.replace(destination);
        router.refresh();
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Microsoft sign-in failed");
      }
    };
    void finish();
    return () => { active = false; };
  }, [refreshUser, router]);

  return (
    <main className="auth-scenery-page">
      <div className="auth-modal-card p-4 mx-auto text-center" style={{ maxWidth: 460 }}>
        <div className="spinner-border text-primary mb-3" role="status" />
        <p className="mb-0">{message}</p>
        {message !== "Finishing Microsoft sign-in…" && (
          <a className="btn btn-primary mt-3" href="/login">Back to sign in</a>
        )}
      </div>
    </main>
  );
}
