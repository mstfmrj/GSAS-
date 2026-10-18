"use client";

/**
 * src/app/(protected)/dashboard/projects/iprint/edit/[id]/page.tsx
 *
 * PURPOSE:
 * Edit page for modifying an existing Iprint Inventory item record.
 */

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { IprintInventoryItem } from "@/lib/types";

const SERIES_OPTIONS = [
  "Series 1 (2025 - 100 pcs)",
  "Series 2 (2025/2026 - 100 pcs)",
  "Series 3 (2026 - 200 pcs)",
];

export default function EditIprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const returnTo = resolvedSearchParams?.returnTo;
  const isValidReturnUrl = returnTo && (returnTo.startsWith("/dashboard/projects") || returnTo.startsWith("/dashboard"));
  const backHref = isValidReturnUrl ? returnTo : `/dashboard/projects/iprint/${id}`;

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && id) {
      async function load() {
        setLoading(true);
        try {
          const res = await fetch(`/api/iprint-inventory/${id}`);
          if (!res.ok) throw new Error("Not found");
          const json = await res.json();
          const item: IprintInventoryItem = json.data ?? json;
          setForm({
            series: item.series || "Series 3 (2026 - 200 pcs)",
            projectName: item.projectName || "",
            date: item.date || "",
            batch: item.batch || "",
            remarks: item.remarks || "",
            type: item.type || "GSAS",
            count: item.count != null ? String(item.count) : "",
            countOrder: item.countOrder != null ? String(item.countOrder) : "",
            status: item.status || "Issued",
          });
        } catch {
          setError("Failed to load entry details.");
        } finally {
          setLoading(false);
        }
      }
      void load();
    }
  }, [authLoading, user, id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/iprint-inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          count: form.count ? parseInt(form.count, 10) : null,
          countOrder: form.countOrder ? parseInt(form.countOrder, 10) : null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push(backHref);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

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
              <h2 className="fw-bold mb-0">Edit Entry</h2>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="project-form-actions d-flex justify-content-end gap-2 mb-3">
              <Link href={backHref} className="btn btn-outline-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <span className="spinner-border spinner-border-sm me-1"></span>
                ) : (
                  <i className="bi bi-check-lg me-1"></i>
                )}
                Save Changes
              </button>
            </div>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-0 pt-4 pb-0">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-pencil-square me-2 text-primary"></i>Entry Details
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-8">
                    <label className="form-label fw-semibold">
                      Project Name <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      value={form.projectName}
                      onChange={f("projectName")}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">Date</label>
                    <input className="form-control" value={form.date} onChange={f("date")} />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">Series</label>
                    <select className="form-select" value={form.series} onChange={f("series")}>
                      {SERIES_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label fw-semibold">Batch</label>
                    <input className="form-control" value={form.batch} onChange={f("batch")} />
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
                    <input
                      type="number"
                      className="form-control"
                      value={form.count}
                      onChange={f("count")}
                    />
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="form-label fw-semibold">Count Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.countOrder}
                      onChange={f("countOrder")}
                    />
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
                    <input className="form-control" value={form.remarks} onChange={f("remarks")} />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
