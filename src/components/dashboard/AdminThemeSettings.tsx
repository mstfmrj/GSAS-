/**
 * src/components/dashboard/AdminThemeSettings.tsx
 *
 * PURPOSE:
 * Admin interface for tweaking primary theme colors, dark/light modes, and layout styles.
 */

import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

const COLOR_SWATCHES = [
  { name: "Royal Blue", hex: "#0d6efd", hover: "#0b5ed7" },
  { name: "Emerald Green", hex: "#10b981", hover: "#059669" },
  { name: "Indigo Velvet", hex: "#6366f1", hover: "#4f46e5" },
  { name: "Purple Passion", hex: "#8b5cf6", hover: "#7c3aed" },
  { name: "Crimson Red", hex: "#ef4444", hover: "#dc2626" },
  { name: "Amber Gold", hex: "#f59e0b", hover: "#d97706" },
  { name: "Teal Cyan", hex: "#06b6d4", hover: "#0891b2" },
  { name: "Slate Charcoal", hex: "#334155", hover: "#1e293b" },
];

const FONTS_LIST = [
  { name: "System Default", value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { name: "Inter (Modern Sans)", value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  { name: "Poppins (Geometric)", value: "'Poppins', sans-serif" },
  { name: "Roboto (Clean Tech)", value: "'Roboto', 'Helvetica Neue', Arial, sans-serif" },
  { name: "Georgia (Classic Serif)", value: "Georgia, 'Times New Roman', Times, serif" },
  { name: "Monospace (Code / Terminal)", value: "SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
];

export default function AdminThemeSettings() {
  const { theme, updateTheme, resetTheme } = useTheme();
  const [savedNote, setSavedNote] = useState(false);

  const handleSave = () => {
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 3000);
  };

  return (
    <div id="admin-ui-settings" className="card shadow-sm border-2 border-primary mb-4">
      <div className="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-end align-items-center gap-2">
        <div className="d-flex gap-2 ms-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={resetTheme}
          >
            <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Defaults
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>
            <i className="bi bi-check-lg me-1"></i> Apply &amp; Save
          </button>
        </div>
      </div>

      <div className="card-body p-4">
        {savedNote && (
          <div className="alert alert-success d-flex align-items-center py-2 px-3 mb-4">
            <i className="bi bi-check-circle-fill me-2 fs-5"></i>
            <div>Settings successfully applied to current session!</div>
          </div>
        )}

        <div className="row g-4">
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fw-bold small text-uppercase text-muted">
              Primary Theme Color
            </label>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  className="rounded-circle border-0 p-0 shadow-sm"
                  style={{
                    width: "32px",
                    height: "32px",
                    backgroundColor: swatch.hex,
                    outline:
                      theme.primaryColor.toLowerCase() === swatch.hex.toLowerCase()
                        ? "3px solid #000"
                        : "none",
                    cursor: "pointer",
                  }}
                  title={swatch.name}
                  onClick={() =>
                    updateTheme({ primaryColor: swatch.hex, primaryHover: swatch.hover })
                  }
                />
              ))}
            </div>
            <div className="input-group input-group-sm">
              <input
                type="color"
                className="form-control form-control-color"
                value={theme.primaryColor}
                onChange={(e) =>
                  updateTheme({ primaryColor: e.target.value, primaryHover: e.target.value })
                }
              />
              <input
                type="text"
                className="form-control"
                value={theme.primaryColor}
                onChange={(e) => updateTheme({ primaryColor: e.target.value })}
              />
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fw-bold small text-uppercase text-muted">
              Font Family
            </label>
            <select
              className="form-select form-select-sm mb-3"
              value={theme.fontFamily}
              onChange={(e) => updateTheme({ fontFamily: e.target.value })}
            >
              {FONTS_LIST.map((font) => (
                <option key={font.name} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
            <div className="p-2 border rounded bg-light text-center small">
              Sample: The quick brown fox jumps over the lazy dog.
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fw-bold small text-uppercase text-muted">
              Font Size Scale ({theme.fontSize})
            </label>
            <div className="btn-group btn-group-sm w-100 mb-3" role="group">
              {[
                { label: "14px", value: "14px" },
                { label: "16px (Normal)", value: "16px" },
                { label: "18px (Large)", value: "18px" },
              ].map((size) => (
                <button
                  key={size.value}
                  type="button"
                  className={`btn ${
                    theme.fontSize === size.value ? "btn-primary" : "btn-outline-secondary"
                  }`}
                  onClick={() => updateTheme({ fontSize: size.value })}
                >
                  {size.label}
                </button>
              ))}
            </div>
            <small className="text-muted d-block">
              Adjusts typography readability across all pages.
            </small>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fw-bold small text-uppercase text-muted">
              Corner Radius
            </label>
            <div className="btn-group btn-group-sm w-100 mb-3" role="group">
              {[
                { label: "Sharp", value: "0px" },
                { label: "Subtle", value: "0.375rem" },
                { label: "Round", value: "0.75rem" },
                { label: "Pill", value: "1.5rem" },
              ].map((radius) => (
                <button
                  key={radius.label}
                  type="button"
                  className={`btn ${
                    theme.borderRadius === radius.value ? "btn-primary" : "btn-outline-secondary"
                  }`}
                  onClick={() => updateTheme({ borderRadius: radius.value })}
                >
                  {radius.label}
                </button>
              ))}
            </div>

            <label className="form-label fw-bold small text-uppercase text-muted">
              Left Nav Bar
            </label>
            <div className="btn-group btn-group-sm w-100 mb-2" role="group">
              {[
                { label: "Light Nav", value: "light" as const },
                { label: "Dark Nav", value: "dark" as const },
              ].map((navbar) => (
                <button
                  key={navbar.value}
                  type="button"
                  className={`btn ${
                    theme.sidebarTheme === navbar.value ? "btn-primary" : "btn-outline-secondary"
                  }`}
                  onClick={() => updateTheme({ sidebarTheme: navbar.value })}
                >
                  {navbar.label}
                </button>
              ))}
            </div>
            <small className="text-muted d-block">
              Active button highlights in selected Primary Color.
            </small>
          </div>
        </div>

      </div>
    </div>
  );
}
