"use client";

/**
 * src/app/(protected)/dashboard/projects/edit/[id]/page.tsx
 *
 * PURPOSE:
 * Edit page for updating GSAS Project records (Code, Project Name, Rating, etc.).
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GSASProjectForm from "@/components/dashboard/GSASProjectForm";
import { GSASProject } from "@/lib/types";

export default function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = decodeURIComponent(resolvedParams.id);
  const { returnTo: requestedReturnUrl } = use(searchParams);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<GSASProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const categoryFallback = project?.category === "CM"
    ? "/dashboard/projects/cm"
    : project?.category === "OP"
      ? "/dashboard/projects/op"
      : project?.category === "DB"
        ? "/dashboard/projects/db"
        : "/dashboard/projects";
  const isValidReturnUrl = Boolean(
    requestedReturnUrl &&
    requestedReturnUrl.startsWith("/dashboard/projects") &&
    !requestedReturnUrl.startsWith("//")
  );
  const returnUrl = isValidReturnUrl ? (requestedReturnUrl as string) : categoryFallback;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && projectId) {
      async function load() {
        setLoading(true);
        try {
          const res = await fetch(`/api/gsas/${encodeURIComponent(projectId)}`);
          if (!res.ok) throw new Error("Not found");
          const json = await res.json();
          setProject(json.data ?? json);
        } catch {
          setError("Failed to load project details.");
        } finally {
          setLoading(false);
        }
      }
      void load();
    }
  }, [authLoading, user, projectId, router]);

  if (authLoading || loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="apex-dashboard-layout">
        <DashboardSidebar activeTab="projects" />
        <main className="apex-main-content">
          <DashboardHeader />
          <div className="p-3 p-md-4">
            <div className="alert alert-danger">{error || "Project not found"}</div>
            <Link href={returnUrl} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab={project.category === "CM" ? "projects-cm" : project.category === "OP" ? "projects-op" : "projects-db"} />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-3 p-md-4">
          <GSASProjectForm
            mode="edit"
            projectId={project.id}
            initialData={project}
            defaultCategory={project.category}
            returnUrl={returnUrl}
          />
        </div>
      </main>
    </div>
  );
}
