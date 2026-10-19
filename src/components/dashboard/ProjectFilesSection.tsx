"use client";









import { useState, useEffect } from "react";
import { ProjectFile } from "@/lib/types";

interface ProjectFilesSectionProps {
  projectId: string;
  projectType: "gsas" | "batches" | "inventory" | "iprint" | "medalmade";
  canEdit?: boolean;
  returnTo?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExt(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : "";
}

function getFileIconMeta(fileName: string, mimeType?: string): { icon: string; color: string; bgColor: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return { icon: "bi-file-earmark-zip", color: "#ea580c", bgColor: "#fff7ed" };
  }
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return { icon: "bi-file-earmark-pdf", color: "#dc2626", bgColor: "#fef2f2" };
  }
  if (["doc", "docx"].includes(ext) || mimeType?.includes("word")) {
    return { icon: "bi-file-earmark-word", color: "#2563eb", bgColor: "#eff6ff" };
  }
  if (["xls", "xlsx", "csv"].includes(ext) || mimeType?.includes("sheet")) {
    return { icon: "bi-file-earmark-excel", color: "#16a34a", bgColor: "#f0fdf4" };
  }
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mimeType?.startsWith("image/")) {
    return { icon: "bi-file-earmark-image", color: "#7c3aed", bgColor: "#faf5ff" };
  }
  if (["txt", "md", "json", "xml"].includes(ext)) {
    return { icon: "bi-file-earmark-text", color: "#4b5563", bgColor: "#f3f4f6" };
  }
  return { icon: "bi-file-earmark", color: "#ea580c", bgColor: "#fff7ed" };
}

export default function ProjectFilesSection({
  projectId,
  projectType,
  canEdit = true,
  returnTo,
}: ProjectFilesSectionProps) {
  const [files, setFiles] = useState<Omit<ProjectFile, "fileData">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFiles = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/project-files?projectId=${encodeURIComponent(projectId)}&projectType=${encodeURIComponent(projectType)}`
      );
      if (!res.ok) throw new Error("Failed to load files");
      const json = await res.json();
      setFiles(json.data ?? json ?? []);
    } catch (err: any) {
      setError(err?.message || "Failed to load project files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFiles();
  }, [projectId, projectType]);

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      setDeletingId(fileId);
      const res = await fetch(`/api/project-files/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        const json = await res.json();
        alert(json.error || "Failed to delete file");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting file");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header bg-transparent border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
          <i className="bi bi-paperclip text-primary"></i>
          <span>Project Files &amp; Attachments</span>
          <span className="badge bg-secondary bg-opacity-10 text-secondary fw-semibold fs-6">
            {files.length}
          </span>
        </h5>
      </div>

      <div className="card-body p-3 p-md-4">
        {loading ? (
          <div className="py-4 text-center text-muted">
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            Loading attached files...
          </div>
        ) : error ? (
          <div className="alert alert-danger mb-0 py-2 small">{error}</div>
        ) : files.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-folder2-open fs-2 text-secondary d-block mb-2"></i>
            <p className="mb-0">No files attached to this project yet.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {files.map((file) => {
              const meta = getFileIconMeta(file.fileName, file.mimeType);
              return (
                <div
                  key={file.id}
                  className="p-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden" style={{ minWidth: "220px" }}>
                    {                     }
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        backgroundColor: meta.bgColor,
                        color: meta.color,
                        fontSize: "1.35rem",
                      }}
                    >
                      <i className={`bi ${meta.icon}`}></i>
                    </div>

                    {                  }
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-dark text-truncate" title={file.fileName} style={{ fontSize: "0.95rem" }}>
                        {file.fileName}
                      </div>
                      <div className="text-muted small">
                        <span>{getFileExt(file.fileName)}</span>
                        <span className="mx-1">|</span>
                        <span>{formatFileSize(file.fileSize)}</span>
                        {file.createdAt && (
                          <span className="ms-2">
                            • {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {file.createdBy && (
                          <span className="ms-1 text-secondary">({file.createdBy})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {                                                  }
                  <div className="d-flex align-items-center gap-2 ms-auto">
                    {                       }
                    <a
                      href={`/api/project-files/${encodeURIComponent(file.id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      title="View file in browser"
                    >
                      <i className="bi bi-eye"></i>
                      <span>View</span>
                    </a>

                    {                     }
                    <a
                      href={`/api/project-files/${encodeURIComponent(file.id)}?download=1`}
                      download={file.fileName}
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      title="Download file"
                    >
                      <i className="bi bi-download"></i>
                    </a>

                    {                         }
                    {canEdit && (
                      <button
                        type="button"
                        disabled={deletingId === file.id}
                        onClick={() => handleDelete(file.id, file.fileName)}
                        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                        title="Delete file"
                      >
                        {deletingId === file.id ? (
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                        ) : (
                          <>
                            <i className="bi bi-trash3"></i>
                            <span>Delete</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
