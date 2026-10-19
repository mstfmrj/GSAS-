"use client";








import { useState } from "react";
import { useRouter } from "next/navigation";
import { GSASProject, GSASCategory } from "@/lib/types";

interface Props {
  initialData?: Partial<GSASProject>;
  mode: "create" | "edit";
  projectId?: string;
  defaultCategory?: GSASCategory;
  returnUrl?: string;
}

const emptyProject = (category: GSASCategory = "CM"): Partial<GSASProject> => ({
  category,
  projectId: "",
  projectNameEn: "",
  projectNameAr: "",
  nameInGsasgate: "",
  country: "QATAR",
  owner: "",
  consultant: "",
  consultantEmail: "",
  contractor: "",
  scheme: "",
  status: "Pending",
  issuedStatus: "",
  gsoPlate: "",
  paymentStatus: "Pending",
  rating: "",
  advisoryDate: "",
  advisoryYear: "",
  issuanceMonthYear: "",
  certCollectionDate: "",
  indoorPlaqueDate: "",
  outdoorPlaqueDate: "",
  plaqueValidity: "",
  plaqueDisplayed: "",
  plaqueAppForm: "",
  linkToFiles: "",
  loc: "",
  certPhoto: "",
  buildingPhoto: "",
});

export default function GSASProjectForm({
  initialData,
  mode,
  projectId,
  defaultCategory = "CM",
  returnUrl,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<GSASProject>>({
    ...emptyProject(defaultCategory),
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof GSASProject, value: GSASProject[keyof GSASProject] | undefined) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const backUrl =
    form.category === "CM"
      ? "/dashboard/projects/cm"
      : form.category === "OP"
      ? "/dashboard/projects/op"
      : "/dashboard/projects/db";
  const cancelUrl = returnUrl ?? (mode === "edit" && projectId
    ? `/dashboard/projects/${projectId}`
    : backUrl);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = mode === "create" ? "/api/gsas" : `/api/gsas/${encodeURIComponent(projectId ?? "")}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save project.");
      const json = await res.json();
      const saved = json.data ?? json;

      router.push(`/dashboard/projects/${encodeURIComponent(saved.id || projectId || "")}`);
    } catch {
      setError("Error saving project data. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="mb-3">
        <h2 className="fw-bold mb-1">{mode === "create" ? "Add New Project" : "Edit Project"}</h2>
        <p className="text-muted small mb-0">Fill in project details; fields may be left blank.</p>
      </div>

      <div
        className="project-form-actions d-flex justify-content-end gap-2 mb-3"
      >
          <button type="button" onClick={() => router.push(cancelUrl)} className="btn btn-outline-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-1" />}
            {mode === "create" ? "Create Project" : "Save Changes"}
          </button>
      </div>

      <div className="row g-4">
        {                            }
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <h5 className="fw-bold mb-0 text-primary">
                <i className="bi bi-info-circle me-2"></i>1. General Information
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Category *</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.category ?? "CM"}
                    onChange={(e) => update("category", e.target.value as GSASCategory)}
                  >
                    <option value="CM">Construction Management Projects</option>
                    <option value="DB">Design &amp; Build Projects</option>
                    <option value="OP">Operations Projects</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">S/N</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={form.sn ?? ""}
                    onChange={(e) => update("sn", e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Project ID</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.projectId ?? ""}
                    onChange={(e) => update("projectId", e.target.value)}
                    placeholder="e.g. GSAS-Project-1234"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Country</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.country ?? "QATAR"}
                    onChange={(e) => update("country", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Project Name (English)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.projectNameEn ?? ""}
                    onChange={(e) => update("projectNameEn", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Project Name (Arabic)</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="form-control form-control-sm"
                    value={form.projectNameAr ?? ""}
                    onChange={(e) => update("projectNameAr", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Name in GSASgate</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.nameInGsasgate ?? ""}
                    onChange={(e) => update("nameInGsasgate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {                               }
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <h5 className="fw-bold mb-0 text-success">
                <i className="bi bi-award me-2"></i>2. Certification &amp; Status
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Status *</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.status ?? "Pending"}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option value="Issued">Issued</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="7. ISSUED">7. ISSUED</option>
                    <option value="6. READY - FOR COLLECTION">6. READY - FOR COLLECTION</option>
                    <option value="4. PENDING - CLIENT APPROVAL">4. PENDING - CLIENT APPROVAL</option>
                    <option value="2. PENDING - JONATHAN">2. PENDING - JONATHAN</option>
                    <option value="1. PENDING - CLIENT FORM">1. PENDING - CLIENT FORM</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Rating</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.rating ?? ""}
                    onChange={(e) => update("rating", e.target.value)}
                  >
                    <option value="">Select Rating...</option>
                    <option value="PLATINUM">PLATINUM</option>
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                    <option value="BRONZE">BRONZE</option>
                    <option value="DIAMOND">DIAMOND</option>
                    <option value="CLASS A+">CLASS A+</option>
                    <option value="CLASS A*">CLASS A*</option>
                    <option value="CLASS A">CLASS A</option>
                    <option value="CLASS B">CLASS B</option>
                    <option value="CLASS C">CLASS C</option>
                    <option value="CLASS D">CLASS D</option>
                    <option value="6 Stars">6 Stars</option>
                    <option value="5 Stars">5 Stars</option>
                    <option value="4 Stars">4 Stars</option>
                    <option value="3 Stars">3 Stars</option>
                    <option value="2 Stars">2 Stars</option>
                    <option value="1 Star">1 Star</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Scheme</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.scheme ?? ""}
                    onChange={(e) => update("scheme", e.target.value)}
                    placeholder="e.g. Healthcare, Education, Sports"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Issued Status</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.issuedStatus ?? ""}
                    onChange={(e) => update("issuedStatus", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Advisory Date</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.advisoryDate ?? ""}
                    onChange={(e) => update("advisoryDate", e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Advisory Year</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.advisoryYear ?? ""}
                    onChange={(e) => update("advisoryYear", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Issuance Month/Year</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.issuanceMonthYear ?? ""}
                    onChange={(e) => update("issuanceMonthYear", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Certificate Collection Date</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.certCollectionDate ?? ""}
                    onChange={(e) => update("certCollectionDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {                                }
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <h5 className="fw-bold mb-0 text-info">
                <i className="bi bi-people me-2"></i>3. Stakeholders &amp; Contacts
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Owner / Client Developer</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.owner ?? ""}
                    onChange={(e) => update("owner", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Sustainability Consultant</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.consultant ?? ""}
                    onChange={(e) => update("consultant", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Consultant Email</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    value={form.consultantEmail ?? ""}
                    onChange={(e) => update("consultantEmail", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Main Contractor</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.contractor ?? ""}
                    onChange={(e) => update("contractor", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {                           }
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <h5 className="fw-bold mb-0 text-warning">
                <i className="bi bi-box-seam me-2"></i>4. Plaque &amp; Logistics
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">GSO Plate</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.gsoPlate ?? ""}
                    onChange={(e) => update("gsoPlate", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Payment Status</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.paymentStatus ?? "Pending"}
                    onChange={(e) => update("paymentStatus", e.target.value)}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Exempt">Exempt</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Indoor Plaque Date</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.indoorPlaqueDate ?? ""}
                    onChange={(e) => update("indoorPlaqueDate", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Outdoor Plaque Date</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.outdoorPlaqueDate ?? ""}
                    onChange={(e) => update("outdoorPlaqueDate", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Plaque Validity</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.plaqueValidity ?? ""}
                    onChange={(e) => update("plaqueValidity", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Plaque Displayed</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.plaqueDisplayed ?? ""}
                    onChange={(e) => update("plaqueDisplayed", e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold">Plaque Application Form</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.plaqueAppForm ?? ""}
                    onChange={(e) => update("plaqueAppForm", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {                              }
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom py-3">
              <h5 className="fw-bold mb-0 text-secondary">
                <i className="bi bi-folder2-open me-2"></i>5. Media &amp; Documentation
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Link to Files / Archive</label>
                  <input
                    type="url"
                    className="form-control form-control-sm"
                    value={form.linkToFiles ?? ""}
                    onChange={(e) => update("linkToFiles", e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Location / Loc</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.loc ?? ""}
                    onChange={(e) => update("loc", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Certificate Photo URL / File</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.certPhoto ?? ""}
                    onChange={(e) => update("certPhoto", e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold">Building Photo URL / File</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.buildingPhoto ?? ""}
                    onChange={(e) => update("buildingPhoto", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
