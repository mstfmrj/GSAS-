"use client";

/**
 * src/app/(protected)/dashboard/projects/inventory/[id]/page.tsx
 *
 * PURPOSE:
 * Detail view page displaying full inventory metadata for an IKEA Frame item.
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { PlaqueInventoryItem } from "@/lib/types";
import ProjectFilesSection from "@/components/dashboard/ProjectFilesSection";

export default function InventoryDetailPage({
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

  const [item, setItem] = useState<PlaqueInventoryItem | null>(null);
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
          const res = await fetch(`/api/plaque-inventory/${id}`);
          if (!res.ok) throw new Error("Not found");
          const json = await res.json();
          setItem(json.data ?? json);
        } catch {
          setError("Failed to load inventory details.");
        } finally {
          setLoading(false);
        }
      }
      void load();
    }
  }, [authLoading, user, id, router]);

  const defaultBackHref = "/dashboard/projects/inventory";
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
        <DashboardSidebar activeTab="projects-inventory" />
        <main className="apex-main-content">
          <DashboardHeader />
          <div className="p-4 p-md-5">
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
      <DashboardSidebar activeTab="projects-inventory" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-4 p-md-5">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
            <div className="d-flex align-items-center gap-3">
              <Link href={backHref} className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                    IKEA Frame Log
                  </span>
                  {item.logDate && (
                    <span className="badge bg-light text-dark border fw-medium">
                      {item.logDate}
                    </span>
                  )}
                </div>
                <h4 className="fw-bold mb-0 mt-1">{item.projectName || "Unnamed Entry"}</h4>
              </div>
            </div>

            <div className="d-flex gap-2">
              <Link
                href={`/dashboard/projects/files/upload?type=inventory&id=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(backHref)}`}
                className="btn btn-outline-primary"
              >
                <i className="bi bi-paperclip me-1"></i>Add File
              </Link>
              {canEdit && (
                <Link
                  href={`/dashboard/projects/inventory/edit/${item.id}?returnTo=${encodeURIComponent(backHref)}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-pencil-square me-1"></i>Edit Entry
                </Link>
              )}
            </div>
          </div>

          <div className="row g-4">
            {/* Stock Movement Details */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-primary">
                    <i className="bi bi-box-seam me-2"></i>Stock Movement
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">S/N</dt>
                    <dd className="col-sm-7">{item.sn ?? "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Log Date</dt>
                    <dd className="col-sm-7 fw-semibold">{item.logDate || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Project Name</dt>
                    <dd className="col-sm-7 fw-medium">{item.projectName || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Quantity In</dt>
                    <dd className="col-sm-7">
                      <span className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-1">
                        +{item.qtyIn ?? 0}
                      </span>
                    </dd>

                    <dt className="col-sm-5 text-muted small">Quantity Out</dt>
                    <dd className="col-sm-7">
                      <span className="badge bg-danger-subtle text-danger fw-bold border border-danger-subtle px-2 py-1">
                        -{item.qtyOut ?? 0}
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Balances & Notes */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-success">
                    <i className="bi bi-clipboard-data me-2"></i>Stock Balance &amp; Notes
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">Current Remaining</dt>
                    <dd className="col-sm-7 fw-bold fs-5 text-primary">{item.remaining ?? 0}</dd>

                    <dt className="col-sm-5 text-muted small">Total Used</dt>
                    <dd className="col-sm-7 fw-semibold">{item.totalUsed ?? 0}</dd>

                    <dt className="col-sm-5 text-muted small">Notes / Remarks</dt>
                    <dd className="col-sm-7">{item.notes || "No notes provided"}</dd>

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
            projectType="inventory"
            canEdit={Boolean(canEdit)}
            returnTo={backHref}
          />
        </div>
      </main>
    </div>
  );
}
