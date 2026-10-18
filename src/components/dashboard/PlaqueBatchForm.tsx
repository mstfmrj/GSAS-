"use client";

/**
 * src/components/dashboard/PlaqueBatchForm.tsx
 *
 * PURPOSE:
 * Reusable form component for adding and editing Plaque Printing Batch records.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlaqueBatchItem } from "@/lib/types";

interface Props {
  initialData?: Partial<PlaqueBatchItem>;
  mode: "create" | "edit";
  id?: string;
  returnUrl?: string;
}

const emptyItem = (): Partial<PlaqueBatchItem> => ({
  batchDate: "",
  batchName: "",
  projectId: "",
  projectNameEn: "",
  projectNameAr: "",
  plaqueRating: "",
  validity: "",
  projectType: "",
  status: "Printed",
});

export default function PlaqueBatchForm({ initialData, mode, id, returnUrl }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<PlaqueBatchItem>>({
    ...emptyItem(),
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof PlaqueBatchItem, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectNameEn?.trim()) {
      setError("Project Name (English) is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const url = mode === "create" ? "/api/plaque-batches" : `/api/plaque-batches/${id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Save failed");
      const json = await res.json();
      const saved = json.data ?? json;

      router.push(returnUrl ?? `/dashboard/projects/batches/${saved.id || id}`);
    } catch {
      setError("Failed to save record.");
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
            {mode === "create" ? "Add Print Record" : "Edit Print Record"}
          </h2>
          <p className="text-muted small mb-0">For Designers-Printing batch tracking record</p>
        </div>
      </div>

      <div className="project-form-actions d-flex justify-content-end gap-2 mb-3">
        <Link href={returnUrl ?? (mode === "edit" && id ? `/dashboard/projects/batches/${id}` : "/dashboard/projects/batches")} className="btn btn-outline-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-1" />}
          {mode === "create" ? "Create Record" : "Save Changes"}
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">Batch Name</label>
              <input
                className="form-control form-control-sm"
                value={form.batchName ?? ""}
                onChange={(e) => update("batchName", e.target.value)}
                placeholder="e.g. Batch 12"
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">Batch Date</label>
              <input
                className="form-control form-control-sm"
                value={form.batchDate ?? ""}
                onChange={(e) => update("batchDate", e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">Project ID</label>
              <input
                className="form-control form-control-sm"
                value={form.projectId ?? ""}
                onChange={(e) => update("projectId", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">Status</label>
              <select
                className="form-select form-select-sm"
                value={form.status ?? "Printed"}
                onChange={(e) => update("status", e.target.value)}
              >
                <option value="Printed">Printed</option>
                <option value="For Collection">For Collection</option>
                <option value="Collected">Collected</option>
                <option value="Awarding">Awarding</option>
                <option value="Pending (3 Copies)">Pending (3 Copies)</option>
                <option value="2 Copies - For Printing">2 Copies - For Printing</option>
                <option value="Certificate Only No Frame">Certificate Only No Frame</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Project Name (English) *</label>
              <input
                className="form-control form-control-sm"
                value={form.projectNameEn ?? ""}
                onChange={(e) => update("projectNameEn", e.target.value)}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label small fw-semibold">Project Name (Arabic)</label>
              <input
                dir="rtl"
                className="form-control form-control-sm"
                value={form.projectNameAr ?? ""}
                onChange={(e) => update("projectNameAr", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold">Plaque Rating</label>
              <input
                className="form-control form-control-sm"
                value={form.plaqueRating ?? ""}
                onChange={(e) => update("plaqueRating", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold">Validity</label>
              <input
                className="form-control form-control-sm"
                value={form.validity ?? ""}
                onChange={(e) => update("validity", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold">Project Type</label>
              <input
                className="form-control form-control-sm"
                value={form.projectType ?? ""}
                onChange={(e) => update("projectType", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
