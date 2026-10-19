"use client";








import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

const SERIES_OPTIONS = [
  "Series 1 (2025 - 100 pcs)",
  "Series 2 (2025/2026 - 100 pcs)",
  "Series 3 (2026 - 200 pcs)",
];

export default function NewIprintPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const returnTo = resolvedSearchParams?.returnTo;
  const isValidReturnUrl = returnTo && (returnTo.startsWith("/dashboard/projects") || returnTo.startsWith("/dashboard"));
  const backHref = isValidReturnUrl ? returnTo : "/dashboard/projects/iprint";

  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    series: "Series 3 (2026 - 200 pcs)",
    projectName: "",
    date: "",
    batch: "",
    remarks: "",
    type: "GSAS",
    count: "",
    countOrder: "",
    status: "Issued",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/iprint-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          count: form.count ? parseInt(form.count, 10) : null,
          countOrder: form.countOrder ? parseInt(form.countOrder, 10) : null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push(backHref);
    } catch { setError("Failed to save. Please try again."); }
    finally { setSaving(false); }
  }

  if (authLoading) return (
    <div className="d-flex align-items-center justify-content-center min-vh-100">
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-iprint" />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-4 p-md-5">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link href={backHref} className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
            <div>
              <span className="badge bg-primary bg-opacity-10 text-primary fw-bold mb-1">Iprint Inventory</span>
              <h2 className="fw-bold mb-0">Add New Entry</h2>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-0 pt-4 pb-0">
                <h5 className="fw-bold mb-0"><i className="bi bi-card-list me-2 text-primary"></i>Entry Details</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-8">
                    <label className="form-label fw-semibold">Project Name <span className="text-danger">*</span></label>
                    <input className="form-control" value={form.projectName} onChange={f("projectName")} required placeholder="Enter project name" />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">Date</label>
                    <input className="form-control" value={form.date} onChange={f("date")} placeholder="e.g. 11-Jun-26" />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">Series</label>
                    <select className="form-select" value={form.series} onChange={f("series")}>
                      {SERIES_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label fw-semibold">Batch</label>
                    <input className="form-control" value={form.batch} onChange={f("batch")} placeholder="e.g. 1A" />
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label fw-semibold">Type</label>
                    <select className="form-select" value={form.type} onChange={f("type")}>
                      <option value="GSAS">GSAS</option>
                      <option value="GSB">GSB</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label fw-semibold">Remaining Count</label>
                    <input type="number" className="form-control" value={form.count} onChange={f("count")} placeholder="e.g. 100" />
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label fw-semibold">Count Order</label>
                    <input type="number" className="form-control" value={form.countOrder} onChange={f("countOrder")} placeholder="e.g. 1" />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">Status</label>
                    <select className="form-select" value={form.status} onChange={f("status")}>
                      <option value="Completed">Completed</option>
                      <option value="Issued">Issued</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Remarks</label>
                    <input className="form-control" value={form.remarks} onChange={f("remarks")} placeholder="e.g. Batch 1 - 11 PCs, No Gold Foiling…" />
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-check-lg me-1"></i>}
                Add Entry
              </button>
              <Link href={backHref} className="btn btn-outline-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
