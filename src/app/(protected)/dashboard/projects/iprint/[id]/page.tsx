"use client";








import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { IprintInventoryItem } from "@/lib/types";
import ProjectFilesSection from "@/components/dashboard/ProjectFilesSection";

export default function IprintDetailPage({
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
      ? `/dashboard/projects/iprint?page=${fromPage}`
      : "/dashboard/projects/iprint";

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<IprintInventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = user && ["super_admin", "admin"].includes(user.role as string);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user && id) {
      async function load() {
        setLoading(true);
        try {
          const res = await fetch(`/api/iprint-inventory/${id}`);
          if (!res.ok) throw new Error("Not found");
          const json = await res.json();
          setItem(json.data ?? json);
        } catch { setError("Failed to load entry details."); }
        finally { setLoading(false); }
      }
      void load();
    }
  }, [authLoading, user, id, router]);

  if (authLoading || loading) return (
    <div className="d-flex align-items-center justify-content-center min-vh-100">
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  if (error || !item) return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-iprint" />
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

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-iprint" />
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
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">Iprint Inventory</span>
                  {item.status && (
                    <span className={`badge fw-semibold ${item.status === "Completed" ? "bg-success" : item.status === "Issued" ? "bg-primary" : "bg-warning text-dark"}`}>
                      {item.status}
                    </span>
                  )}
                  {item.batch && <span className="badge bg-secondary fw-semibold">Batch {item.batch}</span>}
                </div>
                <h4 className="fw-bold mb-0 mt-1">{item.projectName || "Unnamed Entry"}</h4>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Link
                href={`/dashboard/projects/files/upload?type=iprint&id=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(backHref)}`}
                className="btn btn-outline-primary"
              >
                <i className="bi bi-paperclip me-1"></i>Add File
              </Link>
              {canEdit && (
                <Link
                  href={`/dashboard/projects/iprint/edit/${item.id}?returnTo=${encodeURIComponent(backHref)}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-pencil-square me-1"></i>Edit Entry
                </Link>
              )}
            </div>
          </div>

          {                  }
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent border-0 pt-4 pb-0">
                  <h5 className="fw-bold mb-0"><i className="bi bi-card-list me-2 text-primary"></i>Entry Details</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Serial No.</div>
                      <div className="fw-bold">{item.sn ?? "—"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Date</div>
                      <div className="fw-bold">{item.date || "—"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Batch</div>
                      <div className="fw-bold">{item.batch || "—"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Series</div>
                      <div className="fw-bold">{item.series || "—"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Remaining Count</div>
                      <div className="fw-bold fs-4 text-primary">{item.count ?? "—"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Count Order</div>
                      <div className="fw-bold">{item.countOrder ?? "—"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Type</div>
                      <div className="fw-bold">{item.type || "GSAS"}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="small text-muted fw-semibold mb-1">Status</div>
                      <div className="fw-bold">{item.status || "—"}</div>
                    </div>
                    <div className="col-12">
                      <div className="small text-muted fw-semibold mb-1">Project Name</div>
                      <div className="fw-bold fs-5">{item.projectName || "—"}</div>
                    </div>
                    <div className="col-12">
                      <div className="small text-muted fw-semibold mb-1">Remarks</div>
                      <div>{item.remarks || "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-top">
                  <div className="row g-2">
                    <div className="col-6 col-md-3">
                      <div className="small text-muted">Added</div>
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
            projectType="iprint"
            canEdit={Boolean(canEdit)}
            returnTo={backHref}
          />
        </div>
      </main>
    </div>
  );
}
