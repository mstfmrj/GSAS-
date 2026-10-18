import type { UserRole } from "@/lib/types";

export function prioritizeAdmins<T extends { role: UserRole; name?: string; username: string }>(
  users: T[]
): T[] {
  const priority = (role: UserRole) =>
    role === "super_admin" ? 0 : role === "admin" ? 1 : 2;

  return [...users].sort((a, b) =>
    priority(a.role) - priority(b.role) ||
    (a.name || a.username).localeCompare(b.name || b.username) ||
    a.username.localeCompare(b.username)
  );
}

export function formatMinutes(mins?: number): string {
  if (!mins || mins <= 0) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "Never";

  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function filterUsers<T extends { username: string; name?: string; email: string }>(
  users: T[],
  query: string
): T[] {
  if (!query || !query.trim()) return users;
  const q = query.trim().toLowerCase();
  return users.filter(
    (u) =>
      u.username.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q)
  );
}

export function getUserInitial(nameOrUsername?: string): string {
  if (!nameOrUsername || !nameOrUsername.trim()) return "?";
  return nameOrUsername.trim().charAt(0).toUpperCase();
}

export function getRoleBadgeClass(role?: string): string {
  switch (role) {
    case "super_admin":
      return "bg-dark text-warning border border-warning";
    case "admin":
      return "bg-dark text-white";
    case "moderator":
      return "bg-primary text-white";
    case "viewer":
      return "bg-info text-dark";
    default:
      return "bg-secondary text-white";
  }
}
