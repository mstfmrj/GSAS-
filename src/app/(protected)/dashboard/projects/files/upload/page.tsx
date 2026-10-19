"use client";









import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { ProjectFile } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set([
  "mp4", "m4v", "mov", "avi", "mkv", "webm", "wmv", "flv", "3gp", "3g2",
  "ogv", "ts", "mts", "m2ts", "vob", "divx", "f4v"
]);

function isVideoFile(file: File): boolean {
  if (file.type && file.type.toLowerCase().startsWith("video/")) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return Boolean(ext && VIDEO_EXTENSIONS.has(ext));
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

function getFileIconClass(fileName: string, mimeType?: string): { icon: string; color: string; bgColor: string } {
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

export default function ProjectFileUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; type?: string; returnTo?: string }>;
}) {
  const resolvedSearchParams = use(searchParams);
  const projectId = resolvedSearchParams?.id || "";
  const projectType = resolvedSearchParams?.type || "gsas";
  const returnTo = resolvedSearchParams?.returnTo || "/dashboard/projects";

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [existingFiles, setExistingFiles] = useState<Omit<ProjectFile, "fileData">[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);


  const loadFiles = async () => {
    if (!projectId) return;
    try {
      setLoadingFiles(true);
      const res = await fetch(`/api/project-files?projectId=${encodeURIComponent(projectId)}&projectType=${encodeURIComponent(projectType)}`);
      if (res.ok) {
        const json = await res.json();
        setExistingFiles(json.data ?? json ?? []);
      }
    } catch (e) {
      console.error("Failed to load project files", e);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      void loadFiles();
    }
  }, [projectId, projectType]);

  const handleFileSelect = (file: File) => {
    setUploadError("");
    setUploadSuccess("");

    if (isVideoFile(file)) {
      setUploadError("Video files are not allowed. Please choose another file type.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size exceeds 10 MB limit.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !projectId) return;

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", projectId);
      formData.append("projectType", projectType);

      const res = await fetch("/api/project-files", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload file");
      }

      setUploadSuccess(`"${selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadFiles();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      setDeletingId(fileId);
      const res = await fetch(`/api/project-files/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
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

  const activeSidebarTab =
    projectType === "batches"
      ? "projects-batches"
      : projectType === "inventory"
      ? "projects-inventory"
      : projectType === "iprint"
      ? "projects-iprint"
      : projectType === "medalmade"
      ? "projects-medalmade"
      : "projects";

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab={activeSidebarTab} />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-3 p-md-4 d-flex justify-content-center">
          <div style={{ width: "100%", maxWidth: "680px" }}>
            {                        }
            <div className="d-flex align-items-center justify-content-between mb-4">
              <Link href={returnTo} className="btn btn-outline-secondary btn-sm">
                <i className="bi bi-arrow-left me-1"></i>Back to Project
              </Link>
              <div className="text-muted small">
                Project ID: <span className="fw-semibold text-dark">{projectId || "—"}</span>
              </div>
            </div>

            {                                           }
            <div
              className="card border-0 shadow-sm"
              style={{
                borderRadius: "20px",
                padding: "28px 24px",
                backgroundColor: "#ffffff",
              }}
            >
              {                  }
              <h3 className="fw-bold text-dark mb-4" style={{ fontSize: "1.65rem", letterSpacing: "-0.02em" }}>
                Upload Files
              </h3>

              {                      }
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="d-flex flex-column align-items-center justify-content-center"
                style={{
                  border: isDragging ? "2px dashed #007c02" : "2px dashed #d1d5db",
                  backgroundColor: isDragging ? "#f0fdf4" : "#fafafa",
                  borderRadius: "16px",
                  padding: "48px 20px",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {                      }
                <div
                  className="mb-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    color: "#4b5563",
                    fontSize: "2.2rem",
                  }}
                >
                  <i className="bi bi-plus-circle"></i>
                </div>

                {                            }
                <p className="mb-2 fw-medium" style={{ color: "#4b5563", fontSize: "1.05rem" }}>
                  Drag &amp; drop or click to choose files
                </p>

                {                        }
                <div className="d-flex align-items-center text-muted" style={{ fontSize: "0.9rem" }}>
                  <i className="bi bi-info-circle me-1" style={{ fontSize: "0.85rem" }}></i>
                  <span>Max file size: 10 MB</span>
                </div>
              </div>

              {            }
              {uploadError && (
                <div className="alert alert-danger d-flex align-items-center mt-3 mb-0" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>{uploadError}</div>
                </div>
              )}
              {uploadSuccess && (
                <div className="alert alert-success d-flex align-items-center mt-3 mb-0" role="alert">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <div>{uploadSuccess}</div>
                </div>
              )}

              {                                          }
              {selectedFile && (
                <div className="mt-4">
                  <div
                    className="p-3 d-flex align-items-center justify-content-between"
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "14px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-3 overflow-hidden">
                      {                     }
                      {(() => {
                        const iconMeta = getFileIconClass(selectedFile.name, selectedFile.type);
                        return (
                          <div
                            className="d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "10px",
                              backgroundColor: iconMeta.bgColor,
                              color: iconMeta.color,
                              fontSize: "1.4rem",
                            }}
                          >
                            <i className={`bi ${iconMeta.icon}`}></i>
                          </div>
                        );
                      })()}

                      {                  }
                      <div className="overflow-hidden">
                        <div className="fw-semibold text-dark text-truncate" style={{ fontSize: "0.98rem" }}>
                          {selectedFile.name}
                        </div>
                        <div className="text-muted small">
                          {getFileExt(selectedFile.name)} | {formatFileSize(selectedFile.size)}
                        </div>
                      </div>
                    </div>

                    {                             }
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          padding: 0,
                        }}
                        title="Remove selected file"
                      >
                        <i className="bi bi-trash3 text-muted"></i>
                      </button>
                    </div>
                  </div>

                  {                           }
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={handleUpload}
                      className="btn w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-2"
                      style={{
                        backgroundColor: "#007c02",
                        borderColor: "#007c02",
                        color: "#ffffff",
                        borderRadius: "12px",
                      }}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cloud-arrow-up"></i>
                          <span>Save &amp; Store in Database</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {                                    }
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold mb-0 text-dark">
                    Attached Files ({existingFiles.length})
                  </h6>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-sm btn-link text-decoration-none text-success p-0 fw-semibold"
                  >
                    <i className="bi bi-plus-lg me-1"></i>Add Another
                  </button>
                </div>

                {loadingFiles ? (
                  <div className="py-4 text-center text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Loading files...
                  </div>
                ) : existingFiles.length === 0 ? (
                  <div
                    className="py-4 text-center text-muted"
                    style={{
                      borderRadius: "12px",
                      backgroundColor: "#f9fafb",
                      border: "1px dashed #e5e7eb",
                    }}
                  >
                    <i className="bi bi-files fs-3 text-secondary d-block mb-1"></i>
                    No files uploaded yet for this project.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {existingFiles.map((file) => {
                      const iconMeta = getFileIconClass(file.fileName, file.mimeType);
                      return (
                        <div
                          key={file.id}
                          className="p-3 d-flex align-items-center justify-content-between"
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "14px",
                            backgroundColor: "#ffffff",
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          <div className="d-flex align-items-center gap-3 overflow-hidden">
                            {                    }
                            <div
                              className="d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "10px",
                                backgroundColor: iconMeta.bgColor,
                                color: iconMeta.color,
                                fontSize: "1.35rem",
                              }}
                            >
                              <i className={`bi ${iconMeta.icon}`}></i>
                            </div>

                            {                      }
                            <div className="overflow-hidden">
                              <div className="fw-semibold text-dark text-truncate" style={{ fontSize: "0.95rem" }}>
                                {file.fileName}
                              </div>
                              <div className="text-muted small">
                                {getFileExt(file.fileName)} | {formatFileSize(file.fileSize)}
                                {file.createdAt && (
                                  <span className="ms-2">
                                    • {new Date(file.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {                                            }
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            {                     }
                            <a
                              href={`/api/project-files/${encodeURIComponent(file.id)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                padding: 0,
                                borderColor: "#e5e7eb",
                              }}
                              title="View file"
                            >
                              <i className="bi bi-eye text-dark"></i>
                            </a>

                            {              }
                            <a
                              href={`/api/project-files/${encodeURIComponent(file.id)}?download=1`}
                              download={file.fileName}
                              className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                padding: 0,
                                borderColor: "#e5e7eb",
                              }}
                              title="Download file"
                            >
                              <i className="bi bi-download text-dark"></i>
                            </a>

                            {            }
                            <button
                              type="button"
                              disabled={deletingId === file.id}
                              onClick={() => handleDelete(file.id, file.fileName)}
                              className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                padding: 0,
                                borderColor: "#e5e7eb",
                              }}
                              title="Delete file"
                            >
                              {deletingId === file.id ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                              ) : (
                                <i className="bi bi-trash3 text-muted"></i>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {                                 }
              <div className="mt-4">
                <Link
                  href={returnTo}
                  className="btn btn-light w-100 py-2 fw-medium text-secondary"
                  style={{ borderRadius: "12px" }}
                >
                  <i className="bi bi-check2-circle me-1"></i>Done / Return to Project Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
