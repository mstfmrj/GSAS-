"use client";

/**
 * src/app/(protected)/dashboard/projects/medalmade/page.tsx
 *
 * PURPOSE:
 * Outgoing Plaques (Medalmade) Inventory page tracking dispatch, recipient info, and delivery state.
 */

import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { MedalmadeInventoryItem, getProjectCategoryLabel } from "@/lib/types";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

function getBadgeClass(status?: string) {
  if (!status) return "bg-secondary";
  const s = status.toLowerCase();
  if (s.includes("completed") || s.includes("done")) return "bg-success";
  if (s.includes("issued")) return "bg-primary";
  return "bg-warning text-dark";
}

function MedalmadePageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlSearch = searchParams.get("search") || "";
  const urlCategory = searchParams.get("category") || "";
  const urlSortBy = searchParams.get("sortBy") || "id_asc";
  const urlView = (searchParams.get("view") as "all" | "delivery" | "outgoing") || "all";

  const [rows, setRows] = useState<MedalmadeInventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(urlPage > 0 ? urlPage : 1);
  const PAGE_SIZE = 50;
  const [search, setSearch] = useState(urlSearch);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [categoryFilter, setCategoryFilter] = useState(urlCategory);
  const [sortBy, setSortBy] = useState(urlSortBy);
  const [activeView, setActiveView] = useState<"all" | "delivery" | "outgoing">(
    ["all", "delivery", "outgoing"].includes(urlView) ? urlView : "all"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canEdit = user && ["super_admin", "admin"].includes(user.role as string);
  const canDelete = canEdit;

  useEffect(() => {
    const qPage = parseInt(searchParams.get("page") || "1", 10);
    const qSearch = searchParams.get("search") || "";
    const qCategory = searchParams.get("category") || "";
    const qSortBy = searchParams.get("sortBy") || "id_asc";
    const qView = (searchParams.get("view") as "all" | "delivery" | "outgoing") || "all";

    setPage(qPage > 0 ? qPage : 1);
    setSearch(qSearch);
    setSearchInput(qSearch);
    setCategoryFilter(qCategory);
    setSortBy(qSortBy);
    setActiveView(["all", "delivery", "outgoing"].includes(qView) ? qView : "all");
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (newParams: {
      page?: number;
      search?: string;
      category?: string;
      sortBy?: string;
      view?: string;
    }) => {
      const q = new URLSearchParams();
      const targetPage = newParams.page !== undefined ? newParams.page : page;
      const targetSearch = newParams.search !== undefined ? newParams.search : search;
      const targetCategory = newParams.category !== undefined ? newParams.category : categoryFilter;
      const targetSortBy = newParams.sortBy !== undefined ? newParams.sortBy : sortBy;
      const targetView = newParams.view !== undefined ? newParams.view : activeView;

      if (targetPage > 1) q.set("page", String(targetPage));
      if (targetSearch) q.set("search", targetSearch);
      if (targetCategory) q.set("category", targetCategory);
      if (targetSortBy && targetSortBy !== "id_asc") q.set("sortBy", targetSortBy);
      if (targetView && targetView !== "all") q.set("view", targetView);

      const qs = q.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [page, search, categoryFilter, sortBy, activeView, pathname, router]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (sortBy) params.set("sortBy", sortBy);
      const res = await fetch(`/api/medalmade-inventory?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const data = json.data ?? json;
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load outgoing plaques.");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, sortBy]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) void fetchData();
  }, [authLoading, user, fetchData, router]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/medalmade-inventory/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteId(null);
      void fetchData();
    } catch {
      alert("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

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
  if (categoryFilter) currentParams.set("category", categoryFilter);
  if (sortBy && sortBy !== "id_asc") currentParams.set("sortBy", sortBy);
  if (activeView && activeView !== "all") currentParams.set("view", activeView);
  const currentQs = currentParams.toString();
  const currentReturnUrl = currentQs ? `${pathname}?${currentQs}` : pathname;

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-medalmade" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="paged-list-content">
          {/* Header */}
          <div className="paged-list-header d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <Link href="/dashboard/projects" className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <h2 className="fw-bold mb-0">Outgoing Plaques</h2>
                <p className="text-muted small mb-0">
                  Total inventory, batch deliveries &amp; in-house stock tracking · {total} plaque types
                </p>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <div className="input-group" style={{ width: 280 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search plaque type…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearch(searchInput);
                      setPage(1);
                      updateUrlParams({ search: searchInput, page: 1 });
                    }
                  }}
                />
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearch(searchInput);
                    setPage(1);
                    updateUrlParams({ search: searchInput, page: 1 });
                  }}
                >
                  <i className="bi bi-search"></i>
                </button>
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setSearch("");
                      setSearchInput("");
                      setPage(1);
                      updateUrlParams({ search: "", page: 1 });
                    }}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
              {canEdit && (
                <Link
                  href={`/dashboard/projects/medalmade/new?returnTo=${encodeURIComponent(currentReturnUrl)}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-plus-lg me-1"></i>Add Plaque
                </Link>
              )}
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* View switcher & Filters */}
          <div className="card border-0 shadow-sm mb-3 paged-list-filters">
            <div className="card-body py-2 px-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="btn-group btn-group-sm">
                    <button
                      className={`btn ${activeView === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => {
                        setActiveView("all");
                        updateUrlParams({ view: "all" });
                      }}
                    >
                      Total Inventory
                    </button>
                    <button
                      className={`btn ${activeView === "delivery" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => {
                        setActiveView("delivery");
                        updateUrlParams({ view: "delivery" });
                      }}
                    >
                      Delivery &amp; Stock
                    </button>
                    <button
                      className={`btn ${activeView === "outgoing" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => {
                        setActiveView("outgoing");
                        updateUrlParams({ view: "outgoing" });
                      }}
                    >
                      Outgoing &amp; Orders
                    </button>
                  </div>

                  <div style={{ minWidth: 150 }}>
                    <select
                      className="form-select form-select-sm"
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setPage(1);
                        updateUrlParams({ category: e.target.value, page: 1 });
                      }}
                    >
                      <option value="">Category: All</option>
                      <option value="D&B">Design &amp; Build Plaques</option>
                      <option value="CM">Construction Management Plaques</option>
                      <option value="OP">Operations Plaques</option>
                      <option value="CERTIFIED">Certified</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small fw-semibold">
                    <i className="bi bi-arrow-down-up me-1"></i>Sort:
                  </span>
                  <div style={{ minWidth: 180 }}>
                    <select
                      className="form-select form-select-sm"
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setPage(1);
                        updateUrlParams({ sortBy: e.target.value, page: 1 });
                      }}
                    >
                      <option value="id_asc">Default Order</option>
                      <option value="plaques_desc">Total Plaques (High to Low)</option>
                      <option value="remaining_desc">Remaining Stock (High to Low)</option>
                      <option value="delivered_desc">Total Delivered (High to Low)</option>
                      <option value="name_asc">Plaque Name (A-Z)</option>
                    </select>
                  </div>
                  {(categoryFilter || sortBy !== "id_asc") && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setCategoryFilter("");
                        setSortBy("id_asc");
                        setPage(1);
                        updateUrlParams({ category: "", sortBy: "id_asc", page: 1 });
                      }}
                    >
                      <i className="bi bi-x-circle me-1"></i>Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card border-0 shadow-sm paged-list-table-card">
            <div className="table-responsive paged-list-table-scroll">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  {activeView === "all" ? (
                    <tr>
                      <th>Plaque Type</th>
                      <th>Category</th>
                      <th className="text-center">Stock on Hand</th>
                      <th className="text-center">1st Order</th>
                      <th className="text-center">2nd Order</th>
                      <th className="text-center">Total Order</th>
                      <th className="text-center">Total Plaques</th>
                      <th>Status</th>
                      {(canEdit || canDelete) && <th className="text-end">Actions</th>}
                    </tr>
                  ) : activeView === "delivery" ? (
                    <tr>
                      <th>Plaque Type</th>
                      <th className="text-center">Total Order</th>
                      <th className="text-center">Total Delivered</th>
                      <th className="text-center">Medalmade Remaining</th>
                      <th className="text-center">In-House Stock</th>
                      <th className="text-center">Total Combined Stock</th>
                      <th>Status</th>
                      {(canEdit || canDelete) && <th className="text-end">Actions</th>}
                    </tr>
                  ) : (
                    <tr>
                      <th>Plaque Type</th>
                      <th className="text-center">2025 Outgoing</th>
                      <th className="text-center">2026 Outgoing</th>
                      <th className="text-center">In-House Remaining</th>
                      <th className="text-center">Total Combined Remaining</th>
                      <th className="text-center">Next Order Qty</th>
                      <th>Status</th>
                      {(canEdit || canDelete) && <th className="text-end">Actions</th>}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j}>
                            <span className="placeholder col-8 rounded"></span>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-5">
                        <i className="bi bi-inbox fs-1 d-block mb-2"></i>No records found
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const currentParams = new URLSearchParams();
                      if (page > 1) currentParams.set("page", String(page));
                      if (search) currentParams.set("search", search);
                      if (categoryFilter) currentParams.set("category", categoryFilter);
                      if (sortBy && sortBy !== "id_asc") currentParams.set("sortBy", sortBy);
                      if (activeView && activeView !== "all") currentParams.set("view", activeView);
                      const currentQs = currentParams.toString();
                      const currentReturnUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
                      const itemDetailHref = `/dashboard/projects/medalmade/${encodeURIComponent(row.id)}?returnTo=${encodeURIComponent(currentReturnUrl)}`;
                      const itemEditHref = `/dashboard/projects/medalmade/edit/${encodeURIComponent(row.id)}?returnTo=${encodeURIComponent(currentReturnUrl)}`;

                      return (
                        <tr
                          key={row.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => router.push(itemDetailHref)}
                        >
                          <td>
                            <Link
                              href={itemDetailHref}
                              className="fw-bold small text-decoration-none text-dark"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.plaqueType}
                            </Link>
                          </td>

                          {activeView === "all" ? (
                            <>
                              <td>
                                <span className="badge bg-secondary text-white fw-semibold">
                                  {getProjectCategoryLabel(row.category)}
                                </span>
                              </td>
                              <td className="text-center fw-semibold">{row.stockOnHand}</td>
                              <td className="text-center">{row.firstOrder}</td>
                              <td className="text-center">{row.secondOrder}</td>
                              <td className="text-center fw-bold">{row.totalMedalmadeOrder}</td>
                              <td className="text-center">
                                <span className="badge bg-primary bg-opacity-10 text-primary fw-bold fs-6">
                                  {row.totalPlaques}
                                </span>
                              </td>
                            </>
                          ) : activeView === "delivery" ? (
                            <>
                              <td className="text-center">{row.totalMedalmadeOrder}</td>
                              <td className="text-center fw-bold text-success">{row.totalDelivered}</td>
                              <td className="text-center text-warning fw-semibold">{row.remainingMedalmade}</td>
                              <td className="text-center">{row.remainingInhouse}</td>
                              <td className="text-center">
                                <span className="badge bg-info bg-opacity-10 text-info fw-bold">
                                  {row.remainingStockTotal}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="text-center">{row.outgoing2025Total}</td>
                              <td className="text-center">{row.outgoing2026Total}</td>
                              <td className="text-center fw-semibold">{row.remainingInhouse}</td>
                              <td className="text-center">
                                <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                                  {row.remainingStockTotal}
                                </span>
                              </td>
                              <td className="text-center">
                                {row.nextOrder > 0 ? (
                                  <span className="badge bg-warning bg-opacity-25 text-warning fw-bold">
                                    {row.nextOrder} pcs
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </>
                          )}

                          <td>
                            <span className={`badge ${getBadgeClass(row.status)} fw-semibold`}>
                              {row.status || "Completed"}
                            </span>
                          </td>

                          {(canEdit || canDelete) && (
                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                              <div className="d-flex gap-1 justify-content-end">
                                {canEdit && (
                                  <Link
                                    href={itemEditHref}
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
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
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
                            <button className="page-link" disabled={p === page} onClick={() => handlePageChange(p)}>{p}</button>
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
                  <i className="bi bi-exclamation-triangle me-2"></i>Delete Entry
                </h5>
              </div>
              <div className="modal-body">
                Are you sure you want to delete this plaque record? This action cannot be undone.
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

export default function MedalmadePage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center min-vh-100">
          <div className="spinner-border text-primary" role="status" />
        </div>
      }
    >
      <MedalmadePageContent />
    </Suspense>
  );
}
