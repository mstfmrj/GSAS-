export type SimplifiedStatus = "Issued" | "Pending" | "Completed";

export function getSimplifiedStatus(rawStatus?: string | null): SimplifiedStatus {
  if (!rawStatus) return "Pending";

  const s = rawStatus.toLowerCase().trim();

  if (s.includes("issue")) return "Issued";

  if (
    s.includes("complete") ||
    s.includes("finish") ||
    s.includes("ready") ||
    s.includes("awarded") ||
    s.includes("printed") ||
    s.includes("collected")
  ) {
    return "Completed";
  }

  return "Pending";
}

export function getStatusBadgeClass(status: SimplifiedStatus): string {
  switch (status) {
    case "Issued":
      return "bg-success-subtle text-success border border-success-subtle";
    case "Completed":
      return "bg-info-subtle text-info-emphasis border border-info-subtle";
    case "Pending":
      return "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
  }
}
