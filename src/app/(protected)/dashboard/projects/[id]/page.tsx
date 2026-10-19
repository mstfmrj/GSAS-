"use client";








import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { GSASProject, getProjectCategoryLabel } from "@/lib/types";
import { getSimplifiedStatus, getStatusBadgeClass } from "@/lib/statusHelper";
import ProjectFilesSection from "@/components/dashboard/ProjectFilesSection";

export default function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string; page?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const projectId = decodeURIComponent(resolvedParams.id);
  const requestedReturnUrl = resolvedSearchParams?.returnTo;
  const fromPage = resolvedSearchParams?.page;

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<GSASProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = user && ["super_admin", "admin"].includes(user.role as string);

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
          if (!res.ok) throw new Error("Project not found");
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

  const backHref = isValidReturnUrl
    ? (requestedReturnUrl as string)
    : fromPage && parseInt(fromPage, 10) > 1
      ? `${categoryFallback}?page=${fromPage}`
      : categoryFallback;

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
            <Link href={backHref} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const simplifiedStatus = getSimplifiedStatus(project.status);

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab={project.category === "CM" ? "projects-cm" : project.category === "OP" ? "projects-op" : "projects-db"} />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-3 p-md-4">
          {                              }
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
            <div className="d-flex align-items-center gap-3">
              <Link href={backHref} className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                    {getProjectCategoryLabel(project.category)}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(simplifiedStatus)} fw-semibold`}>
                    {simplifiedStatus}
                  </span>
                  {project.rating && (
                    <span className="badge bg-success bg-opacity-10 text-success fw-bold">
                      {project.rating}
                    </span>
                  )}
                </div>
                <h4 className="fw-bold mb-0 mt-1">{project.projectNameEn || "Untitled Project"}</h4>
                {project.projectNameAr && (
                  <div className="text-muted fs-5" dir="rtl">
                    {project.projectNameAr}
                  </div>
                )}
              </div>
            </div>

            <div className="d-flex gap-2">
              <Link
                href={`/dashboard/projects/files/upload?type=gsas&id=${encodeURIComponent(project.id)}&returnTo=${encodeURIComponent(`/dashboard/projects/${encodeURIComponent(project.id)}${requestedReturnUrl ? `?returnTo=${encodeURIComponent(requestedReturnUrl)}` : ""}`)}`}
                className="btn btn-outline-primary"
              >
                <i className="bi bi-paperclip me-1"></i>Add File
              </Link>
              {canEdit && (
                <Link
                  href={`/dashboard/projects/edit/${encodeURIComponent(project.id)}?returnTo=${encodeURIComponent(backHref)}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-pencil-square me-1"></i>Edit Project
                </Link>
              )}
            </div>
          </div>

          <div className="row g-3">

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-primary">
                    <i className="bi bi-info-circle me-2"></i>General Information
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">Project ID</dt>
                    <dd className="col-sm-7 fw-semibold"><code>{project.projectId || "—"}</code></dd>

                    <dt className="col-sm-5 text-muted small">Category</dt>
                    <dd className="col-sm-7 fw-semibold">{getProjectCategoryLabel(project.category)} Projects</dd>

                    <dt className="col-sm-5 text-muted small">S/N</dt>
                    <dd className="col-sm-7">{project.sn ?? "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Name (English)</dt>
                    <dd className="col-sm-7 fw-medium" style={{ fontSize: "0.9rem" }}>{project.projectNameEn || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Name (Arabic)</dt>
                    <dd className="col-sm-7 fs-5" dir="rtl">{project.projectNameAr || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Name in GSASgate</dt>
                    <dd className="col-sm-7">{project.nameInGsasgate || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Country</dt>
                    <dd className="col-sm-7">{project.country || "QATAR"}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-success">
                    <i className="bi bi-award me-2"></i>Certification &amp; Status
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">Status</dt>
                    <dd className="col-sm-7">
                      <span className={`badge ${getStatusBadgeClass(simplifiedStatus)} fw-semibold`}>
                        {simplifiedStatus}
                      </span>
                      {project.status && project.status !== simplifiedStatus && (
                        <span className="text-muted small ms-2">({project.status})</span>
                      )}
                    </dd>

                    <dt className="col-sm-5 text-muted small">Rating</dt>
                    <dd className="col-sm-7 fw-bold text-success">{project.rating || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Scheme</dt>
                    <dd className="col-sm-7">{project.scheme || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Issued Status</dt>
                    <dd className="col-sm-7">{project.issuedStatus || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Advisory Date</dt>
                    <dd className="col-sm-7">{project.advisoryDate || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Advisory Year</dt>
                    <dd className="col-sm-7">{project.advisoryYear || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Issuance Month/Year</dt>
                    <dd className="col-sm-7">{project.issuanceMonthYear || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Certificate Collection Date</dt>
                    <dd className="col-sm-7">{project.certCollectionDate || "—"}</dd>
                  </dl>
                </div>
              </div>
            </div>

            {                                        }
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-info">
                    <i className="bi bi-people me-2"></i>Stakeholders &amp; Contacts
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">Owner / Client Developer</dt>
                    <dd className="col-sm-7 fw-semibold">{project.owner || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Sustainability Consultant</dt>
                    <dd className="col-sm-7">{project.consultant || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Consultant Email</dt>
                    <dd className="col-sm-7">
                      {project.consultantEmail ? (
                        <a href={`mailto:${project.consultantEmail}`} className="text-decoration-none">
                          {project.consultantEmail}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>

                    <dt className="col-sm-5 text-muted small">Main Contractor</dt>
                    <dd className="col-sm-7">{project.contractor || "—"}</dd>
                  </dl>
                </div>
              </div>
            </div>

            {                           }
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-warning">
                    <i className="bi bi-box-seam me-2"></i>Plaque &amp; Logistics
                  </h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5 text-muted small">GSO Plate</dt>
                    <dd className="col-sm-7">{project.gsoPlate || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Payment Status</dt>
                    <dd className="col-sm-7">
                      <span className={`badge ${project.paymentStatus?.toLowerCase().includes("paid") ? "bg-success" : "bg-secondary"} bg-opacity-15 text-dark fw-semibold`}>
                        {project.paymentStatus || "—"}
                      </span>
                    </dd>

                    <dt className="col-sm-5 text-muted small">Indoor Plaque Date</dt>
                    <dd className="col-sm-7">{project.indoorPlaqueDate || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Outdoor Plaque Date</dt>
                    <dd className="col-sm-7">{project.outdoorPlaqueDate || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Plaque Validity</dt>
                    <dd className="col-sm-7">{project.plaqueValidity || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Plaque Displayed</dt>
                    <dd className="col-sm-7">{project.plaqueDisplayed || "—"}</dd>

                    <dt className="col-sm-5 text-muted small">Plaque App Form</dt>
                    <dd className="col-sm-7">{project.plaqueAppForm || "—"}</dd>
                  </dl>
                </div>
              </div>
            </div>

            {                              }
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-transparent border-bottom py-3">
                  <h5 className="fw-bold mb-0 text-secondary">
                    <i className="bi bi-folder2-open me-2"></i>Media &amp; Documentation
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <div className="text-muted small mb-1">Link to Files / Archive</div>
                      {project.linkToFiles ? (
                        <a href={project.linkToFiles} target="_blank" rel="noreferrer" className="text-primary fw-medium text-break">
                          <i className="bi bi-link-45deg me-1"></i>{project.linkToFiles}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="text-muted small mb-1">Location / Loc</div>
                      <div className="fw-medium">{project.loc || "—"}</div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="text-muted small mb-1">Certificate Photo</div>
                      <div className="fw-medium text-muted">{project.certPhoto || "—"}</div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="text-muted small mb-1">Building Photo</div>
                      <div className="fw-medium text-muted">{project.buildingPhoto || "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-light border-0 py-2 px-3 d-flex justify-content-between text-muted small">
                  <span>Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "—"}</span>
                  <span>Updated: {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <ProjectFilesSection
            projectId={project.id}
            projectType="gsas"
            canEdit={Boolean(canEdit)}
            returnTo={`/dashboard/projects/${encodeURIComponent(project.id)}${requestedReturnUrl ? `?returnTo=${encodeURIComponent(requestedReturnUrl)}` : ""}`}
          />
        </div>
      </main>
    </div>
  );
}
