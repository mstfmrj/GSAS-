"use client";








import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { PlaqueBatchItem } from "@/lib/types";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProjectDateFilter from "@/components/dashboard/ProjectDateFilter";

function PlaqueBatchesContent() {
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

  const [rows, setRows] = useState<PlaqueBatchItem[]>([]);
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

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canEdit = user && ["super_admin", "admin"].includes(user.role as string);
  const canDelete = canEdit;

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
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (ratingFilter) params.set("rating", ratingFilter);
      if (sortBy && sortBy !== "sn_asc") params.set("sortBy", sortBy);
      if (yearFilter) params.set("year", yearFilter);
      if (monthFilter) params.set("month", monthFilter);
      if (dayFilter) params.set("day", dayFilter);
      const res = await fetch(`/api/plaque-batches?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const data = json.data ?? json;
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, ratingFilter, sortBy, yearFilter, monthFilter, dayFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      void fetchData();
    }
  }, [authLoading, user, fetchData, router]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plaque-batches/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteId(null);
      void fetchData();
    } catch {
      alert("Delete failed.");
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

  const currentParams = new URLSearchParams();
  if (page > 1) currentParams.set("page", String(page));
  if (search) currentParams.set("search", search);
  if (statusFilter) currentParams.set("status", statusFilter);
  if (ratingFilter) currentParams.set("rating", ratingFilter);
  if (sortBy && sortBy !== "sn_asc") currentParams.set("sortBy", sortBy);
  if (yearFilter) currentParams.set("year", yearFilter);
  if (monthFilter) currentParams.set("month", monthFilter);
  if (dayFilter) currentParams.set("day", dayFilter);
  const currentQs = currentParams.toString();
  const currentReturnUrl = currentQs ? `${pathname}?${currentQs}` : pathname;

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-batches" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="paged-list-content">
          <div className="paged-list-header d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <Link href="/dashboard/projects" className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <h2 className="fw-bold mb-0">For Designers-Printing</h2>
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
                  placeholder="Search…"
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
                <Link
                  href={`/dashboard/projects/batches/new?returnTo=${encodeURIComponent(currentReturnUrl)}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-plus-lg me-1"></i>Add Record
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
                <div style={{ minWidth: 180 }}>
                  <select
                    className="form-select form-select-sm"
                    value={statusFilter}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="">Status: All</option>
                    <option value="Printed">Printed</option>
                    <option value="For Collection">For Collection</option>
                    <option value="Collected">Collected</option>
                    <option value="Awarding">Awarding</option>
                    <option value="Pending (3 Copies)">Pending (3 Copies)</option>
                    <option value="2 Copies - For Printing">2 Copies - For Printing</option>
                    <option value="Certificate Only No Frame">Certificate Only No Frame</option>
                  </select>
                </div>
                <div style={{ minWidth: 150 }}>
                  <select
                    className="form-select form-select-sm"
                    value={ratingFilter}
                    onChange={(e) => handleRatingChange(e.target.value)}
                  >
                    <option value="">Rating: All</option>
                    <option value="CLASS A*">CLASS A*</option>
                    <option value="CLASS B">CLASS B</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                    <option value="SILVER">SILVER</option>
                    <option value="5 Stars">5 Stars</option>
                    <option value="4 Stars">4 Stars</option>
                    <option value="3 Stars">3 Stars</option>
                    <option value="2 Stars">2 Stars</option>
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
                      <option value="date_desc">Date (Newest first)</option>
                      <option value="date_asc">Date (Oldest first)</option>
                      <option value="status">Status</option>
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

          <div className="card border-0 shadow-sm paged-list-table-card">
            <div className="table-responsive paged-list-table-scroll">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Batch</th>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>Rating</th>
                    <th>Validity</th>
                    <th>Type</th>
                    <th>Status</th>
                    {(canEdit || canDelete) && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={canEdit ? 10 : 9} className="text-center py-5">
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                        Loading batch records…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 10 : 9} className="text-center text-muted py-5">
                        <i className="bi bi-inbox fs-1 d-block mb-2"></i>No records found
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const currentParams = new URLSearchParams();
                      if (page > 1) currentParams.set("page", String(page));
                      if (search) currentParams.set("search", search);
                      if (statusFilter) currentParams.set("status", statusFilter);
                      if (ratingFilter) currentParams.set("rating", ratingFilter);
                      if (sortBy && sortBy !== "sn_asc") currentParams.set("sortBy", sortBy);
                      const currentQs = currentParams.toString();
                      const currentReturnUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
                      const batchDetailHref = `/dashboard/projects/batches/${encodeURIComponent(row.id)}?returnTo=${encodeURIComponent(currentReturnUrl)}`;
                      const batchEditHref = `/dashboard/projects/batches/edit/${encodeURIComponent(row.id)}?returnTo=${encodeURIComponent(currentReturnUrl)}`;

                      return (
                        <tr
                          key={row.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => router.push(batchDetailHref)}
                        >
                          <td className="text-muted small">{row.sn ?? "—"}</td>
                          <td className="small">{row.batchDate || "—"}</td>
                          <td className="fw-semibold small">{row.batchName || "—"}</td>
                          <td>
                            <code className="small">{row.projectId || "—"}</code>
                          </td>
                          <td>
                            <Link
                              href={batchDetailHref}
                              className="small fw-semibold text-decoration-none text-dark"
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
                          <td>
                            {row.plaqueRating ? (
                              <span className="badge bg-primary bg-opacity-10 text-primary fw-semibold">
                                {row.plaqueRating}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="small">{row.validity || "—"}</td>
                          <td className="small">{row.projectType || "—"}</td>
                          <td>
                            {row.status ? (
                              <span className="badge bg-success bg-opacity-10 text-success fw-semibold">
                                {row.status}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          {(canEdit || canDelete) && (
                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex gap-1 justify-content-end">
                                {canEdit && (
                                  <Link
                                    href={batchEditHref}
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
                        const p =
                          totalPages <= 7
                            ? i + 1
                            : page <= 4
                            ? i + 1
                            : page >= totalPages - 3
                            ? totalPages - 6 + i
                            : page - 3 + i;
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

      {deleteId && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>Delete Batch
                </h5>
              </div>
              <div className="modal-body">Are you sure? This cannot be undone.</div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting && <span className="spinner-border spinner-border-sm me-1"></span>}
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

export default function PlaqueBatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <PlaqueBatchesContent />
    </Suspense>
  );
}
