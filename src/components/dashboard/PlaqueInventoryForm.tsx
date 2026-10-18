"use client";

/**
 * src/components/dashboard/PlaqueInventoryForm.tsx
 *
 * PURPOSE:
 * Reusable form component for IKEA Frame inventory item creation and updates.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlaqueInventoryItem } from "@/lib/types";

interface Props {
  initialData?: Partial<PlaqueInventoryItem>;
  mode: "create" | "edit";
  id?: string;
  returnUrl?: string;
}

const emptyItem = (): Partial<PlaqueInventoryItem> => ({
  logDate: new Date().toISOString().slice(0, 10),
  projectName: "",
  qtyIn: 0,
  qtyOut: 0,
  remaining: 0,
  totalUsed: 0,
  notes: "",
});

export default function PlaqueInventoryForm({ initialData, mode, id, returnUrl }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<PlaqueInventoryItem>>({
    ...emptyItem(),
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof PlaqueInventoryItem, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectName?.trim()) {
      setError("Project Name is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const url = mode === "create" ? "/api/plaque-inventory" : `/api/plaque-inventory/${id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Save failed");
      const json = await res.json();
      const saved = json.data ?? json;

      router.push(returnUrl ?? `/dashboard/projects/inventory/${saved.id || id}`);
    } catch {
      setError("Failed to save inventory entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="mb-3">
        <div>
          <h2 className="fw-bold mb-1">
            {mode === "create" ? "Add IKEA Frame Entry" : "Edit IKEA Frame Entry"}
          </h2>
          <p className="text-muted small mb-0">Record frame stock additions and issuances</p>
        </div>
      </div>

      <div className="project-form-actions d-flex justify-content-end gap-2 mb-3">
        <Link href={returnUrl ?? (mode === "edit" && id ? `/dashboard/projects/inventory/${id}` : "/dashboard/projects/inventory")} className="btn btn-outline-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-1" />}
          {mode === "create" ? "Create Entry" : "Save Changes"}
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">Log Date</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={form.logDate ?? ""}
                onChange={(e) => update("logDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">Project Name *</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={form.projectName ?? ""}
                onChange={(e) => update("projectName", e.target.value)}
                required
              />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold text-success">Quantity In</label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                value={form.qtyIn ?? 0}
                onChange={(e) => update("qtyIn", Number(e.target.value))}
              />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold text-danger">Quantity Out</label>
              <input
                type="number"
                min="0"
                className="form-control form-control-sm"
                value={form.qtyOut ?? 0}
                onChange={(e) => update("qtyOut", Number(e.target.value))}
              />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold">Remaining Balance</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={form.remaining ?? 0}
                onChange={(e) => update("remaining", Number(e.target.value))}
              />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold">Total Used</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={form.totalUsed ?? 0}
                onChange={(e) => update("totalUsed", Number(e.target.value))}
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Notes / Remarks</label>
              <textarea
                rows={3}
                className="form-control form-control-sm"
                value={form.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Optional details, recipient, invoice number..."
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
