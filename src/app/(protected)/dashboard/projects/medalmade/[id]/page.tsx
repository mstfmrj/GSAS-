"use client";

/**
 * src/app/(protected)/dashboard/projects/medalmade/[id]/page.tsx
 *
 * PURPOSE:
 * Detail view page displaying complete information for a selected Outgoing Plaque item.
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { MedalmadeInventoryItem, getProjectCategoryLabel } from "@/lib/types";
import ProjectFilesSection from "@/components/dashboard/ProjectFilesSection";

export default function MedalmadeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string; page?: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const returnTo = resolvedSearchParams?.returnTo;
  const fromPage = resolvedSearchParams?.page;

  const isValidReturnUrl = returnTo && (returnTo.startsWith("/dashboard/projects") || returnTo.startsWith("/dashboard"));
  const backHref = isValidReturnUrl
    ? returnTo
    : fromPage
      ? `/dashboard/projects/medalmade?page=${fromPage}`
      : "/dashboard/projects/medalmade";

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<MedalmadeInventoryItem | null>(null);
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
          const res = await fetch(`/api/medalmade-inventory/${id}`);
          if (!res.ok) throw new Error("Not found");
          const json = await res.json();
          setItem(json.data ?? json);
        } catch {
          setError("Failed to load plaque details.");
        } finally {
          setLoading(false);
        }
      }
      void load();
    }
  }, [authLoading, user, id, router]);

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
        <DashboardSidebar activeTab="projects-medalmade" />
        <main className="apex-main-content">
          <DashboardHeader />
          <div className="p-4 p-md-5">
            <div className="alert alert-danger">{error || "Plaque not found"}</div>
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
      <DashboardSidebar activeTab="projects-medalmade" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-3 p-md-4">
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div className="d-flex align-items-center gap-3">
              <Link href={backHref} className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                    {getProjectCategoryLabel(item.category)} Plaque
                  </span>
                  <span className="badge bg-success fw-semibold">
                    {item.status || "Completed"}
                  </span>
                </div>
                <h4 className="fw-bold mb-0 mt-1">{item.plaqueType}</h4>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Link
                href={`/dashboard/projects/files/upload?type=medalmade&id=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(backHref)}`}
                className="btn btn-outline-primary"
              >
                <i className="bi bi-paperclip me-1"></i>Add File
              </Link>
              {canEdit && (
                <Link
                  href={`/dashboard/projects/medalmade/edit/${item.id}?returnTo=${encodeURIComponent(backHref)}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-pencil-square me-1"></i>Edit Plaque
                </Link>
              )}
            </div>
          </div>

          <div className="row g-4">
            {/* Total Inventory section */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-0 pt-4 pb-0">
                  <h5 className="fw-bold mb-0 text-primary">
                    <i className="bi bi-box-seam me-2"></i>Total Inventory
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="small text-muted fw-semibold">Stock on Hand</div>
                      <div className="fw-bold fs-4">{item.stockOnHand}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted fw-semibold">Total Plaques</div>
                      <div className="fw-bold fs-4 text-primary">{item.totalPlaques}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted">1st Order</div>
                      <div className="fw-bold">{item.firstOrder}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted">2nd Order</div>
                      <div className="fw-bold">{item.secondOrder}</div>
                    </div>
                    <div className="col-12">
                      <div className="small text-muted">Total Medalmade Orders</div>
                      <div className="fw-bold fs-5 text-secondary">{item.totalMedalmadeOrder}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery & Stock section */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-0 pt-4 pb-0">
                  <h5 className="fw-bold mb-0 text-success">
                    <i className="bi bi-truck me-2"></i>Delivery &amp; In-House Stock
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="small text-muted fw-semibold">Total Delivered</div>
                      <div className="fw-bold fs-4 text-success">{item.totalDelivered}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted fw-semibold">Remaining from Medalmade</div>
                      <div className="fw-bold fs-4 text-warning">{item.remainingMedalmade}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted">In-House Plaque</div>
                      <div className="fw-bold">{item.inhousePlaque}</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted">Remaining In-House</div>
                      <div className="fw-bold">{item.remainingInhouse}</div>
                    </div>
                    <div className="col-12">
                      <div className="small text-muted">Combined Remaining Stock (In-House + Medalmade)</div>
                      <div className="fw-bold fs-5 text-info">{item.remainingStockTotal}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Outgoing & Future Orders section */}
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent border-0 pt-4 pb-0">
                  <h5 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-calendar-check me-2 text-primary"></i>Outgoing Plaques &amp; Future Orders
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6 col-md-3">
                      <div className="small text-muted">2025 Outgoing Total</div>
                      <div className="fw-bold fs-5">{item.outgoing2025Total}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted">2026 Outgoing Total</div>
                      <div className="fw-bold fs-5">{item.outgoing2026Total}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted">Next Planned Order Qty</div>
                      <div className="fw-bold fs-5 text-warning">{item.nextOrder > 0 ? `${item.nextOrder} pcs` : "—"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted">Status</div>
                      <div>
                        <span className="badge bg-success fw-semibold">{item.status || "Completed"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-top">
                  <div className="row g-2">
                    <div className="col-6 col-md-3">
                      <div className="small text-muted">Created</div>
                      <div className="small fw-semibold">{new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted">Last Updated</div>
                      <div className="small fw-semibold">{new Date(item.updatedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ProjectFilesSection
            projectId={item.id}
            projectType="medalmade"
            canEdit={Boolean(canEdit)}
            returnTo={backHref}
          />
        </div>
      </main>
    </div>
  );
}
