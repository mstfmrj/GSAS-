"use client";








import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { GSASProject, getProjectCategoryLabel } from "@/lib/types";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProjectDateFilter from "@/components/dashboard/ProjectDateFilter";
import { getSimplifiedStatus, getStatusBadgeClass } from "@/lib/statusHelper";

interface Props {
  category: "CM" | "DB" | "OP";
}

const FIELDS: { key: keyof GSASProject; label: string; editable?: boolean }[] = [
  { key: "projectId", label: "Project ID", editable: true },
  { key: "projectNameEn", label: "Name (EN)", editable: true },
  { key: "projectNameAr", label: "Name (AR)", editable: true },
  { key: "owner", label: "Owner", editable: true },
  { key: "consultant", label: "Consultant", editable: true },
  { key: "consultantEmail", label: "Consultant Email", editable: true },
  { key: "contractor", label: "Contractor", editable: true },
  { key: "scheme", label: "Scheme", editable: true },
  { key: "rating", label: "Rating", editable: true },
  { key: "status", label: "Status", editable: true },
  { key: "issuedStatus", label: "Issued Status", editable: true },
  { key: "paymentStatus", label: "Payment", editable: true },
  { key: "country", label: "Country", editable: true },
  { key: "advisoryDate", label: "Advisory Date", editable: true },
  { key: "issuanceMonthYear", label: "Issuance", editable: true },
  { key: "plaqueValidity", label: "Plaque Validity", editable: true },
  { key: "plaqueDisplayed", label: "Plaque Displayed", editable: true },
  { key: "certCollectionDate", label: "Cert Date", editable: true },
];

const emptyForm = (category: "CM" | "DB" | "OP"): Partial<GSASProject> => ({
  category,
  projectId: "",
  projectNameEn: "",
  projectNameAr: "",
  country: "QATAR",
  owner: "",
  consultant: "",
  consultantEmail: "",
  contractor: "",
  scheme: "",
  status: "",
  issuedStatus: "",
  paymentStatus: "",
  rating: "",
  advisoryDate: "",
  issuanceMonthYear: "",
  plaqueValidity: "",
  plaqueDisplayed: "",
  certCollectionDate: "",
  indoorPlaqueDate: "",
  outdoorPlaqueDate: "",
});

function GSASProjectsTableContent({ category }: Props) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const initialPage = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "";
  const initialRating = searchParams.get("rating") || "";
  const initialSort = searchParams.get("sortBy") || "sn_asc";
  const initialYear = searchParams.get("year") || "";
  const initialMonth = searchParams.get("month") || "";
  const initialDay = searchParams.get("day") || "";

  const [rows, setRows] = useState<GSASProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const PAGE_SIZE = 50;
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [ratingFilter, setRatingFilter] = useState(initialRating);
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [dayFilter, setDayFilter] = useState(initialDay);
  const [sortBy, setSortBy] = useState(initialSort);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<Partial<GSASProject>>(emptyForm(category));
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canEdit = user && ["super_admin", "admin"].includes(user.role as string);
  const canDelete = user && ["super_admin", "admin"].includes(user.role as string);


  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    const validPage = isNaN(p) || p < 1 ? 1 : p;
    setPage(validPage);

    const s = searchParams.get("search") || "";
    setSearch(s);
    setSearchInput(s);

    setStatusFilter(searchParams.get("status") || "");
    setRatingFilter(searchParams.get("rating") || "");
    setSortBy(searchParams.get("sortBy") || "sn_asc");
    setYearFilter(searchParams.get("year") || "");
    setMonthFilter(searchParams.get("month") || "");
    setDayFilter(searchParams.get("day") || "");
  }, [searchParams]);

  const updateUrl = useCallback(
    (
      newPage: number,
      newSearch = search,
      newStatus = statusFilter,
      newRating = ratingFilter,
      newSort = sortBy,
      newYear = yearFilter,
      newMonth = monthFilter,
      newDay = dayFilter
    ) => {
      const params = new URLSearchParams();
      if (newPage > 1) params.set("page", String(newPage));
      if (newSearch) params.set("search", newSearch);
      if (newStatus) params.set("status", newStatus);
      if (newRating) params.set("rating", newRating);
      if (newSort && newSort !== "sn_asc") params.set("sortBy", newSort);
      if (newYear) params.set("year", newYear);
      if (newMonth) params.set("month", newMonth);
      if (newDay) params.set("day", newDay);

      const qs = params.toString();
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router, search, statusFilter, ratingFilter, sortBy, yearFilter, monthFilter, dayFilter]
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl(newPage);
  };

  const handleSearchSubmit = () => {
    setSearch(searchInput);
    setPage(1);
    updateUrl(1, searchInput);
  };

  const handleSearchClear = () => {
    setSearch("");
    setSearchInput("");
    setPage(1);
    updateUrl(1, "");
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    updateUrl(1, search, newStatus);
  };

  const handleRatingChange = (newRating: string) => {
    setRatingFilter(newRating);
    setPage(1);
    updateUrl(1, search, statusFilter, newRating);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setPage(1);
    updateUrl(1, search, statusFilter, ratingFilter, newSort);
  };

  const handleDateFilterChange = ({ year, month, day }: { year: string; month: string; day: string }) => {
    setYearFilter(year);
    setMonthFilter(month);
    setDayFilter(day);
    setPage(1);
    updateUrl(1, search, statusFilter, ratingFilter, sortBy, year, month, day);
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setRatingFilter("");
    setYearFilter("");
    setMonthFilter("");
    setDayFilter("");
    setSortBy("sn_asc");
    setPage(1);
    updateUrl(1, search, "", "", "sn_asc", "", "", "");
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        category,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (ratingFilter) params.set("rating", ratingFilter);
      if (sortBy && sortBy !== "sn_asc") params.set("sortBy", sortBy);
      if (yearFilter) params.set("year", yearFilter);
      if (monthFilter) params.set("month", monthFilter);
      if (dayFilter) params.set("day", dayFilter);
      const res = await fetch(`/api/gsas?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      const data = json.data ?? json;
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [category, page, search, statusFilter, ratingFilter, sortBy, yearFilter, monthFilter, dayFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      void fetchData();
    }
  }, [authLoading, user, fetchData, router]);

  function openAdd() {
    setForm(emptyForm(category));
    setModalMode("add");
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(row: GSASProject) {
    setForm({ ...row });
    setModalMode("edit");
    setEditId(row.id);
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = modalMode === "add" ? "/api/gsas" : `/api/gsas/${editId}`;
      const method = modalMode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setShowModal(false);
      void fetchData();
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/gsas/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      void fetchData();
    } catch {
      alert("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab={category === "CM" ? "projects-cm" : category === "OP" ? "projects-op" : "projects-db"} />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="paged-list-content">
          {            }
          <div className="paged-list-header d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <Link href="/dashboard/projects" className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <h2 className="fw-bold mb-0">
                  {getProjectCategoryLabel(category)} Projects
                </h2>
                <p className="text-muted small mb-0">
                  {total.toLocaleString()} records · Page {page} of {totalPages || 1}
                </p>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <div className="input-group" style={{ width: 280 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search projects…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchSubmit();
                    }
                  }}
                />
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleSearchSubmit}
                >
                  <i className="bi bi-search"></i>
                </button>
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleSearchClear}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
              {canEdit && (
                <Link href={`/dashboard/projects/new?category=${category}`} className="btn btn-primary">
                  <i className="bi bi-plus-lg me-1"></i>Add Project
                </Link>
              )}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {                           }
          <div className="card border-0 shadow-sm mb-3 paged-list-filters">
            <div className="card-body py-2 px-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted small fw-semibold me-1">
                  <i className="bi bi-funnel me-1"></i>Filter:
                </span>
                <div style={{ minWidth: 160 }}>
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="">Status: All</option>
                    <option value="issued">Issued</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div style={{ minWidth: 150 }}>
                  <select
                    className="form-select form-select-sm"
                    value={ratingFilter}
                    onChange={(e) => handleRatingChange(e.target.value)}
                  >
                    <option value="">Rating: All</option>
                    {category === "CM" ? (
                      <>
                        <option value="CLASS A+">CLASS A+</option>
                        <option value="CLASS A*">CLASS A*</option>
                        <option value="CLASS A">CLASS A</option>
                        <option value="CLASS B">CLASS B</option>
                        <option value="CLASS C">CLASS C</option>
                        <option value="CLASS D">CLASS D</option>
                      </>
                    ) : category === "OP" ? (
                      <>
                        <option value="PLATINUM">Platinum</option>
                        <option value="GOLD">Gold</option>
                        <option value="SILVER">Silver</option>
                        <option value="BRONZE">Bronze</option>
                        <option value="DIAMOND">Diamond</option>
                      </>
                    ) : (
                      <>
                        <option value="6 Stars">6 Stars</option>
                        <option value="5 Stars">5 Stars</option>
                        <option value="4 Stars">4 Stars</option>
                        <option value="3 Stars">3 Stars</option>
                        <option value="2 Stars">2 Stars</option>
                        <option value="1 Star">1 Star</option>
                      </>
                    )}
                  </select>
                </div>

                <ProjectDateFilter
                  year={yearFilter}
                  month={monthFilter}
                  day={dayFilter}
                  onChange={handleDateFilterChange}
                />

                <div className="ms-md-auto d-flex align-items-center gap-2">
                  <span className="text-muted small fw-semibold">
                    <i className="bi bi-arrow-down-up me-1"></i>Sort:
                  </span>
                  <div style={{ minWidth: 200 }}>
                    <select
                      className="form-select form-select-sm"
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value)}
                    >
                      <option value="sn_asc">S/N (Ascending)</option>
                      <option value="sn_desc">S/N (Descending)</option>
                      <option value="date_desc">Advisory Date (Newest first)</option>
                      <option value="date_asc">Advisory Date (Oldest first)</option>
                      <option value="finished_first">Finished / Issued First</option>
                      <option value="unfinished_first">Unfinished First</option>
                      <option value="name_asc">Project Name (A-Z)</option>
                    </select>
                  </div>
                  {(statusFilter || ratingFilter || yearFilter || monthFilter || dayFilter || sortBy !== "sn_asc") && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleResetFilters}
                      title="Reset filters"
                    >
                      <i className="bi bi-x-circle me-1"></i>Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {           }
          <div className="card border-0 shadow-sm paged-list-table-card">
            <div className="table-responsive paged-list-table-scroll">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Project ID</th>
                    <th>Name (EN)</th>
                    <th>Owner</th>
                    <th>Scheme</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Payment</th>
                    {(canEdit || canDelete) && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={canEdit ? 9 : 8} className="text-center py-5">
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Loading project records…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 9 : 8} className="text-center text-muted py-5">
                        <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                        No projects found
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const simplifiedStatus = getSimplifiedStatus(row.status);
                      const currentParams = new URLSearchParams();
                      if (page > 1) currentParams.set("page", String(page));
                      if (search) currentParams.set("search", search);
                      if (statusFilter) currentParams.set("status", statusFilter);
                      if (ratingFilter) currentParams.set("rating", ratingFilter);
                      if (sortBy && sortBy !== "sn_asc") currentParams.set("sortBy", sortBy);
                      const currentQs = currentParams.toString();
                      const currentReturnUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
                      const projectDetailHref = `/dashboard/projects/${encodeURIComponent(row.id)}?returnTo=${encodeURIComponent(currentReturnUrl)}`;
                      const projectEditHref = `/dashboard/projects/edit/${encodeURIComponent(row.id)}?returnTo=${encodeURIComponent(currentReturnUrl)}`;

                      return (
                        <tr
                          key={row.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => router.push(projectDetailHref)}
                          className="hover-row"
                        >
                          <td className="text-muted small">{row.sn ?? "—"}</td>
                          <td>
                            <code className="small">{row.projectId || "—"}</code>
                          </td>
                          <td>
                            <Link
                              href={projectDetailHref}
                              className="fw-semibold small text-decoration-none text-dark"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.projectNameEn || "—"}
                            </Link>
                            {row.projectNameAr && (
                              <div className="text-muted small" dir="rtl">
                                {row.projectNameAr}
                              </div>
                            )}
                          </td>
                          <td className="small">{row.owner || "—"}</td>
                          <td className="small">{row.scheme || "—"}</td>
                          <td>
                            {row.rating ? (
                              <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold">
                                {row.rating}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(simplifiedStatus)} fw-semibold`}>
                              {simplifiedStatus}
                            </span>
                          </td>
                          <td className="small">{row.paymentStatus || "—"}</td>
                          {(canEdit || canDelete) && (
                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex gap-1 justify-content-end">
                                {canEdit && (
                                  <Link
                                    href={projectEditHref}
                                    className="btn btn-sm btn-outline-primary"
                                    title="Edit"
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </Link>
                                )}
                                {canDelete && (
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => setDeleteId(row.id)}
                                    title="Delete"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <div className="card-footer paged-list-footer">
                <span className="text-muted small">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{" "}
                  {total.toLocaleString()}
                </span>
                {totalPages > 1 && (
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                        <button className="page-link" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 7) p = i + 1;
                        else if (page <= 4) p = i + 1;
                        else if (page >= totalPages - 3) p = totalPages - 6 + i;
                        else p = page - 3 + i;
                        return (
                          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                            <button className="page-link" disabled={p === page} onClick={() => handlePageChange(p)}>
                              {p}
                            </button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
                        <button className="page-link" disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {                    }
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {modalMode === "add" ? "Add" : "Edit"} {getProjectCategoryLabel(category)} Project
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {FIELDS.map((f) => (
                    <div className="col-12 col-md-6 col-lg-4" key={f.key as string}>
                      <label className="form-label small fw-semibold">{f.label}</label>
                      <input
                        className="form-control form-control-sm"
                        value={(form[f.key] as string) ?? ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                  {modalMode === "add" ? "Add Project" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {                          }
      {deleteId && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>Delete Project
                </h5>
              </div>
              <div className="modal-body">
                Are you sure you want to delete this project? This action cannot be undone.
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GSASProjectsTable(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <GSASProjectsTableContent {...props} />
    </Suspense>
  );
}
