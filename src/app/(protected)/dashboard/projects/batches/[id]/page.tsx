"use client";








import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { PlaqueBatchItem } from "@/lib/types";
import ProjectFilesSection from "@/components/dashboard/ProjectFilesSection";

export default function BatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string; page?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const id = resolvedParams.id;
  const requestedReturnUrl = resolvedSearchParams?.returnTo;
  const fromPage = resolvedSearchParams?.page;

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<PlaqueBatchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = user && ["super_admin", "admin"].includes(user.role as string);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && id) {
      async function load() {
        setLoading(true);
        try {
          const res = await fetch(`/api/plaque-batches/${id}`);
          if (!res.ok) throw new Error("Not found");
          const json = await res.json();
          setItem(json.data ?? json);
        } catch {
          setError("Failed to load record details.");
        } finally {
          setLoading(false);
        }
      }
      void load();
    }
  }, [authLoading, user, id, router]);

  const defaultBackHref = "/dashboard/projects/batches";
  const isValidReturnUrl = Boolean(
    requestedReturnUrl &&
    requestedReturnUrl.startsWith("/dashboard/projects") &&
    !requestedReturnUrl.startsWith("//")
  );
  const backHref = isValidReturnUrl
    ? (requestedReturnUrl as string)
    : fromPage && parseInt(fromPage, 10) > 1
      ? `${defaultBackHref}?page=${fromPage}`
      : defaultBackHref;

  if (authLoading || loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="apex-dashboard-layout">
        <DashboardSidebar activeTab="projects-batches" />
        <main className="apex-main-content">
          <DashboardHeader />
          <div className="p-3 p-md-4">
            <div className="alert alert-danger">{error || "Record not found"}</div>
            <Link href={backHref} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-batches" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-3 p-md-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div className="d-flex align-items-center gap-3">
              <Link href={backHref} className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                    {item.batchName || "Batch Record"}
                  </span>
                  {item.status && (
                    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle fw-semibold">
                      {item.status}
                    </span>
                  )}
                  {item.plaqueRating && (
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold">
                      {item.plaqueRating}
                    </span>
                  )}
                </div>
                <h4 className="fw-bold mb-0 mt-1">{item.projectNameEn || "Untitled Record"}</h4>
                {item.projectNameAr && (
                  <div className="text-muted fs-5" dir="rtl">{item.projectNameAr}</div>
                )}
              </div>
            </div>

            <div className="d-flex gap-2">
              <Link
                href={`/dashboard/projects/files/upload?type=batches&id=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(backHref)}`}
                className="btn btn-outline-primary"
              >
                <i className="bi bi-paperclip me-1"></i>Add File
              </Link>
              {canEdit && (
                <Link
                  href={`/dashboard/projects/batches/edit/${item.id}?returnTo=${encodeURIComponent(backHref)}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-pencil-square me-1"></i>Edit Record
                </Link>
              )}
            </div>
          </div>

          <div className="row g-3">
            {                               }
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-primary">
                    <i className="bi bi-printer me-2"></i>Batch &amp; Dispatch Details
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">S/N</dt>
                    <dd className="col-sm-7">{item.sn ?? "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Batch Name</dt>
                    <dd className="col-sm-7 fw-semibold">{item.batchName || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Batch Date</dt>
                    <dd className="col-sm-7">{item.batchDate || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Status</dt>
                    <dd className="col-sm-7">
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold">
                        {item.status || "—"}
                      </span>
                    </dd>

                    <dt className="col-sm-5 text-muted small">Validity</dt>
                    <dd className="col-sm-7">{item.validity || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Project Type</dt>
                    <dd className="col-sm-7">{item.projectType || "—"}</dd>
                  </dl>
                </div>
              </div>
            </div>

            {                         }
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-success">
                    <i className="bi bi-building me-2"></i>Project Information
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">Project ID</dt>
                    <dd className="col-sm-7 fw-semibold"><code>{item.projectId || "—"}</code></dd>

                    <dt className="col-sm-5 text-muted small">Name (English)</dt>
                    <dd className="col-sm-7 fw-medium" style={{ fontSize: "0.9rem" }}>{item.projectNameEn || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Name (Arabic)</dt>
                    <dd className="col-sm-7 fs-5" dir="rtl">{item.projectNameAr || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Plaque Rating</dt>
                    <dd className="col-sm-7 fw-bold text-success">{item.plaqueRating || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Created Date</dt>
                    <dd className="col-sm-7">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Last Updated</dt>
                    <dd className="col-sm-7">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "—"}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <ProjectFilesSection
            projectId={item.id}
            projectType="batches"
            canEdit={Boolean(canEdit)}
            returnTo={backHref}
          />
        </div>
      </main>
    </div>
  );
}
