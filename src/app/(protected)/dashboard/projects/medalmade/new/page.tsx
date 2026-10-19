"use client";








import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default function NewMedalmadePage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const returnTo = resolvedSearchParams?.returnTo;
  const isValidReturnUrl = returnTo && (returnTo.startsWith("/dashboard/projects") || returnTo.startsWith("/dashboard"));
  const backHref = isValidReturnUrl ? returnTo : "/dashboard/projects/medalmade";

  const { loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    plaqueType: "",
    category: "D&B",
    stockOnHand: 0,
    firstOrder: 0,
    secondOrder: 0,
    totalMedalmadeOrder: 0,
    totalPlaques: 0,
    totalDelivered: 0,
    remainingMedalmade: 0,
    inhousePlaque: 0,
    remainingInhouse: 0,
    remainingStockTotal: 0,
    outgoing2025Total: 0,
    outgoing2026Total: 0,
    nextOrder: 0,
    status: "Completed",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const numField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: parseInt(e.target.value, 10) || 0 }));

  const textField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/medalmade-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push(backHref);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-medalmade" />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-4 p-md-5">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link href={backHref} className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
            <div>
              <span className="badge bg-primary bg-opacity-10 text-primary fw-bold mb-1">
                Outgoing Plaques
              </span>
              <h2 className="fw-bold mb-0">Add New Plaque Type</h2>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-0 pt-4 pb-0">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-card-heading me-2 text-primary"></i>Plaque Details
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-8">
                    <label className="form-label fw-semibold">
                      Plaque Type Name <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      value={form.plaqueType}
                      onChange={textField("plaqueType")}
                      required
                      placeholder="e.g. Design &amp; Build 3 Stars Plaque"
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">Category</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={textField("category")}
                    >
                      <option value="D&B">Design &amp; Build</option>
                      <option value="CM">Construction Management</option>
                      <option value="OP">Operations</option>
                      <option value="CERTIFIED">Certified</option>
                    </select>
                  </div>

                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Stock on Hand</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.stockOnHand}
                      onChange={numField("stockOnHand")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">1st Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.firstOrder}
                      onChange={numField("firstOrder")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">2nd Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.secondOrder}
                      onChange={numField("secondOrder")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Total Medalmade Orders</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.totalMedalmadeOrder}
                      onChange={numField("totalMedalmadeOrder")}
                    />
                  </div>

                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Total Plaques</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.totalPlaques}
                      onChange={numField("totalPlaques")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Total Delivered</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.totalDelivered}
                      onChange={numField("totalDelivered")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Remaining from Medalmade</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.remainingMedalmade}
                      onChange={numField("remainingMedalmade")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Combined Remaining Stock</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.remainingStockTotal}
                      onChange={numField("remainingStockTotal")}
                    />
                  </div>

                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">2025 Outgoing</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.outgoing2025Total}
                      onChange={numField("outgoing2025Total")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">2026 Outgoing</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.outgoing2026Total}
                      onChange={numField("outgoing2026Total")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Next Order Request</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.nextOrder}
                      onChange={numField("nextOrder")}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="form-label fw-semibold">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={textField("status")}
                    >
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Issued">Issued</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <span className="spinner-border spinner-border-sm me-1"></span>
                ) : (
                  <i className="bi bi-check-lg me-1"></i>
                )}
                Add Plaque
              </button>
              <Link href={backHref} className="btn btn-outline-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
