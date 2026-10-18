"use client";

/**
 * src/app/(protected)/dashboard/projects/report/page.tsx
 *
 * PURPOSE:
 * GSAS Year-to-Date Report and pivot summaries breaking down certifications across all project types.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

type ProjectCategory = "DB" | "OP" | "CM";
type ReportRow = {
  category: ProjectCategory;
  year: string;
  rating: string;
  count: number;
};

const CATEGORY_INFO: Record<ProjectCategory, { label: string; icon: string; color: string }> = {
  DB: { label: "Design & Build", icon: "bi-buildings", color: "success" },
  OP: { label: "Operations", icon: "bi-gear-wide-connected", color: "warning" },
  CM: { label: "Construction Management", icon: "bi-building-check", color: "primary" },
};

const CATEGORIES: ProjectCategory[] = ["DB", "OP", "CM"];

export default function GSASReportPage() {
  const [activeCategory, setActiveCategory] = useState<ProjectCategory>("DB");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    try {
      const response = await fetch("/api/gsas/report", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load the project report.");
      }
      setRows(result.data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load the project report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => void loadReport(), 0);
    const intervalId = window.setInterval(() => void loadReport(), 30_000);
    window.addEventListener("focus", loadReport);

    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadReport);
    };
  }, [loadReport]);

  const years = useMemo(
    () =>
      [...new Set(rows.map((row) => row.year))].sort((left, right) => {
        if (left === "Unknown") return 1;
        if (right === "Unknown") return -1;
        return Number(left) - Number(right) || left.localeCompare(right);
      }),
    [rows]
  );

  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((category) => [
          category,
          rows
            .filter((row) => row.category === category)
            .reduce((total, row) => total + row.count, 0),
        ])
      ) as Record<ProjectCategory, number>,
    [rows]
  );

  const totalProjects = CATEGORIES.reduce((total, category) => total + categoryCounts[category], 0);
  const categoryRows = rows.filter((row) => row.category === activeCategory);
  const ratings = [...new Set(categoryRows.map((row) => row.rating))].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true })
  );
  const categoryTotal = categoryCounts[activeCategory];
  const categoryInfo = CATEGORY_INFO[activeCategory];

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-report" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-4 p-md-5">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
            <div className="d-flex align-items-center gap-3">
              <Link href="/dashboard/projects" className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>Back
              </Link>
              <div>
                <h2 className="fw-bold mb-0">Report</h2>
                <p className="text-muted small mb-0">
                  Live project totals and rating breakdowns by category and advisory year
                </p>
              </div>
            </div>
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => void loadReport()}
              disabled={loading}
            >
              <i className={`bi ${loading ? "bi-arrow-repeat" : "bi-arrow-clockwise"} me-1`}></i>
              Refresh
            </button>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
              <span>{error}</span>
              <button className="btn btn-sm btn-outline-danger" onClick={() => void loadReport()}>
                Try again
              </button>
            </div>
          )}

          <div className="row g-3 mb-4">
            <div className="col-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3 text-center">
                  <div className="fw-bold fs-3 text-primary">
                    {loading && rows.length === 0 ? "…" : totalProjects.toLocaleString()}
                  </div>
                  <div className="text-muted small fw-semibold">Total GSAS Projects</div>
                </div>
              </div>
            </div>
            {CATEGORIES.map((category) => {
              const info = CATEGORY_INFO[category];
              return (
                <div className="col-6 col-xl-3" key={category}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-3 text-center">
                      <div className={`fw-bold fs-3 text-${info.color}`}>
                        {loading && rows.length === 0 ? "…" : categoryCounts[category].toLocaleString()}
                      </div>
                      <div className="text-muted small fw-semibold">{info.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-2">
              <div className="nav nav-pills nav-fill gap-2">
                {CATEGORIES.map((category) => {
                  const info = CATEGORY_INFO[category];
                  return (
                    <button
                      key={category}
                      className={`nav-link py-2 fw-semibold ${activeCategory === category ? "active" : ""}`}
                      onClick={() => setActiveCategory(category)}
                    >
                      <i className={`bi ${info.icon} me-2`}></i>
                      {info.label} ({categoryCounts[category].toLocaleString()})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent border-0 pt-4 pb-2 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">{categoryInfo.label} Projects by Rating and Year</h5>
              <span className={`badge bg-${categoryInfo.color} bg-opacity-10 text-${categoryInfo.color} fw-bold px-3 py-2`}>
                {categoryTotal.toLocaleString()} Total Projects
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered table-hover mb-0 text-center align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="text-start">Rating</th>
                      {years.map((year) => <th key={year}>{year}</th>)}
                      <th className="table-primary fw-bold">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && rows.length === 0 ? (
                      <tr>
                        <td colSpan={years.length + 2} className="text-center py-5">
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                          Loading report…
                        </td>
                      </tr>
                    ) : ratings.length === 0 ? (
                      <tr>
                        <td colSpan={years.length + 2} className="text-center text-muted py-5">
                          No projects found for this category.
                        </td>
                      </tr>
                    ) : (
                      ratings.map((rating) => {
                        const ratingRows = categoryRows.filter((row) => row.rating === rating);
                        const ratingTotal = ratingRows.reduce((total, row) => total + row.count, 0);
                        const yearCounts = new Map(ratingRows.map((row) => [row.year, row.count]));

                        return (
                          <tr key={rating}>
                            <td className="text-start fw-semibold">{rating}</td>
                            {years.map((year) => {
                              const count = yearCounts.get(year) ?? 0;
                              return (
                                <td key={year} className={count ? "fw-bold text-dark" : "text-muted"}>
                                  {count || "—"}
                                </td>
                              );
                            })}
                            <td className="table-primary fw-bold">{ratingTotal}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td className="text-start">Grand Total</td>
                      {years.map((year) => {
                        const count = categoryRows
                          .filter((row) => row.year === year)
                          .reduce((total, row) => total + row.count, 0);
                        return <td key={year}>{count || "—"}</td>;
                      })}
                      <td className="table-primary fw-bold fs-6">{categoryTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
