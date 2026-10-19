"use client";








import { useEffect, useState } from "react";
import { GSASDashboardChartData } from "@/lib/types";
import GSASCertifiedRatingsChart from "./GSASCertifiedRatingsChart";

interface DashboardSummaryData {
  counts: {
    total: number;
    batches: number;
    inventory: number;
    iprint: number;
    issued: number;
    pending: number;
    completed: number;
  };
  chartData: GSASDashboardChartData;
}

export default function GSASProjectsDashboard() {
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/gsas/summary");
        if (!res.ok) throw new Error("Failed to load dashboard summary");
        const json = await res.json();
        setData(json.data ?? json);
      } catch {
        setError("Failed to load GSAS projects summary data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const counts = data?.counts ?? {
    total: 0,
    batches: 0,
    inventory: 0,
    iprint: 0,
    issued: 0,
    pending: 0,
    completed: 0,
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="apex-stat-card h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium mb-1">Total GSAS Projects</div>
                <h3 className="fw-bold mb-1">
                  {loading ? <span className="placeholder col-4 rounded" /> : counts.total.toLocaleString()}
                </h3>
              </div>
              <div className="apex-icon-badge" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                <i className="bi bi-buildings"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="apex-stat-card h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium mb-1">Completed / Issued</div>
                <h3 className="fw-bold mb-1 text-success">
                  {loading ? <span className="placeholder col-4 rounded" /> : counts.completed.toLocaleString()}
                </h3>
                <div className="text-success small fw-semibold">
                  <i className="bi bi-patch-check-fill me-1"></i>Certificates Issued
                </div>
              </div>
              <div className="apex-icon-badge" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
                <i className="bi bi-check-circle"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="apex-stat-card h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium mb-1">Pending Action</div>
                <h3 className="fw-bold mb-1 text-warning-emphasis">
                  {loading ? <span className="placeholder col-4 rounded" /> : counts.pending.toLocaleString()}
                </h3>
                <div className="text-muted small">
                  Audit, client form, or collection
                </div>
              </div>
              <div className="apex-icon-badge" style={{ backgroundColor: "#fefce8", color: "#ca8a04" }}>
                <i className="bi bi-hourglass-split"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="apex-stat-card h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-muted small fw-medium mb-1">Print &amp; Frame Stock</div>
                <h3 className="fw-bold mb-1 text-info">
                  {loading ? (
                    <span className="placeholder col-4 rounded" />
                  ) : (
                    (counts.batches + counts.inventory + counts.iprint).toLocaleString()
                  )}
                </h3>
                <div className="text-muted small">
                  {counts.batches.toLocaleString()} print · {counts.inventory.toLocaleString()} frames · {counts.iprint.toLocaleString()} iprints
                </div>
              </div>
              <div className="apex-icon-badge" style={{ backgroundColor: "#f0fdfa", color: "#0d9488" }}>
                <i className="bi bi-printer"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="fw-bold mb-0">Certified Projects Distribution</h4>
          <span className="badge bg-light text-dark border px-2 py-1">
            <i className="bi bi-arrow-repeat me-1 text-primary"></i>Live Database Synchronized
          </span>
        </div>
        <GSASCertifiedRatingsChart data={data?.chartData} loading={loading} />
      </div>
    </div>
  );
}
