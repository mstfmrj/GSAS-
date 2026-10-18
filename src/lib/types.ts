/**
 * src/lib/types.ts
 *
 * PURPOSE:
 * Comprehensive TypeScript type definitions for users, roles, permissions, projects, and inventory.
 */

export type BuiltinRole = "super_admin" | "admin" | "moderator" | "viewer";
export type UserRole = BuiltinRole | `custom:${string}`;
export type PermissionKey =
  | "dashboard.view"
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "projects.view"
  | "projects.create"
  | "projects.edit"
  | "projects.delete"
  | "projects.export"
  | "gsas.view"
  | "gsas.create"
  | "gsas.edit"
  | "gsas.delete"
  | "plaque.view"
  | "plaque.create"
  | "plaque.edit"
  | "plaque.delete";

export const PERMISSION_GROUPS: {
  title: string;
  permissions: { key: PermissionKey; label: string }[];
}[] = [
  {
    title: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "View dashboard" }],
  },
  {
    title: "User Management",
    permissions: [
      { key: "users.view", label: "View users" },
      { key: "users.create", label: "Create users" },
      { key: "users.edit", label: "Edit users" },
      { key: "users.delete", label: "Delete users" },
    ],
  },
  {
    title: "Projects",
    permissions: [
      { key: "projects.view", label: "View projects" },
      { key: "projects.create", label: "Create projects" },
      { key: "projects.edit", label: "Edit projects" },
      { key: "projects.delete", label: "Delete projects" },
      { key: "projects.export", label: "Export projects" },
    ],
  },
  {
    title: "GSAS Projects",
    permissions: [
      { key: "gsas.view", label: "View GSAS projects" },
      { key: "gsas.create", label: "Create GSAS projects" },
      { key: "gsas.edit", label: "Edit GSAS projects" },
      { key: "gsas.delete", label: "Delete GSAS projects" },
    ],
  },
  {
    title: "Plaque Management",
    permissions: [
      { key: "plaque.view", label: "View plaque records" },
      { key: "plaque.create", label: "Create plaque records" },
      { key: "plaque.edit", label: "Edit plaque records" },
      { key: "plaque.delete", label: "Delete plaque records" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key)
);

const PERMISSION_REQUIREMENTS: Partial<Record<PermissionKey, PermissionKey[]>> = {};

for (const group of PERMISSION_GROUPS) {
  const viewPermission = group.permissions.find(({ key }) => key.endsWith(".view"))?.key;
  if (!viewPermission || viewPermission === "dashboard.view") continue;

  PERMISSION_REQUIREMENTS[viewPermission] = ["dashboard.view"];
  for (const { key } of group.permissions) {
    if (key !== viewPermission) PERMISSION_REQUIREMENTS[key] = [viewPermission];
  }
}

export function normalizePermissions(permissions: readonly PermissionKey[]): PermissionKey[] {
  const normalized = new Set(permissions);
  let changed = true;
  while (changed) {
    changed = false;
    for (const permission of normalized) {
      for (const requirement of PERMISSION_REQUIREMENTS[permission] ?? []) {
        if (!normalized.has(requirement)) {
          normalized.add(requirement);
          changed = true;
        }
      }
    }
  }
  return ALL_PERMISSION_KEYS.filter((permission) => normalized.has(permission));
}

export function togglePermissionSelection(
  permissions: readonly PermissionKey[],
  permission: PermissionKey
): PermissionKey[] {
  const selected = new Set(permissions);
  if (selected.has(permission)) {
    const remove = new Set([permission]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of selected) {
        if (!remove.has(candidate) && (PERMISSION_REQUIREMENTS[candidate] ?? []).some((key) => remove.has(key))) {
          remove.add(candidate);
          changed = true;
        }
      }
    }
    return normalizePermissions([...selected].filter((key) => !remove.has(key)));
  }
  return normalizePermissions([...selected, permission]);
}

export const BUILTIN_ROLE_PERMISSIONS: Record<BuiltinRole, PermissionKey[]> = {
  super_admin: ALL_PERMISSION_KEYS,
  admin: [
    "dashboard.view",
    "users.view",
    "users.create",
    "users.edit",
    "projects.view",
    "projects.create",
    "projects.edit",
    "projects.delete",
    "projects.export",
    "gsas.view",
    "gsas.create",
    "gsas.edit",
    "gsas.delete",
    "plaque.view",
    "plaque.create",
    "plaque.edit",
    "plaque.delete",
  ],
  moderator: ["dashboard.view", "users.view", "users.create", "users.edit", "gsas.view", "plaque.view"],
  viewer: ["dashboard.view"],
};

export function isBuiltinRole(role: string): role is BuiltinRole {
  return Object.hasOwn(BUILTIN_ROLE_PERMISSIONS, role);
}

export function userHasPermission(
  user: Pick<User, "role" | "permissions">,
  permission: PermissionKey
): boolean {
  const permissions = user.permissions ?? (
    isBuiltinRole(user.role) ? BUILTIN_ROLE_PERMISSIONS[user.role] : []
  );
  return normalizePermissions(permissions).includes(permission);
}

export interface CustomRole {
  roleKey: UserRole;
  name: string;
  permissions: PermissionKey[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type GSASCategory = "CM" | "DB" | "OP";

export function getProjectCategoryLabel(category: string): string {
  switch (category) {
    case "CM":
      return "Construction Management";
    case "DB":
    case "D&B":
      return "Design & Build";
    case "OP":
      return "Operations";
    case "CERTIFIED":
      return "Certified";
    default:
      return category;
  }
}

export interface GSASProject {
  id: string;
  category: GSASCategory;
  sn?: number;
  advisoryDate?: string;
  advisoryYear?: string;
  projectId: string;
  projectNameEn: string;
  projectNameAr: string;
  nameInGsasgate?: string;
  country: string;
  owner?: string;
  consultant?: string;
  consultantEmail?: string;
  contractor?: string;
  scheme?: string;
  status?: string;
  issuedStatus?: string;
  gsoPlate?: string;
  paymentStatus?: string;
  rating?: string;
  certCollectionDate?: string;
  indoorPlaqueDate?: string;
  outdoorPlaqueDate?: string;
  issuanceMonthYear?: string;
  linkToFiles?: string;
  loc?: string;
  plaqueAppForm?: string;
  certPhoto?: string;
  buildingPhoto?: string;
  plaqueDisplayed?: string;
  plaqueValidity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaqueBatchItem {
  id: string;
  sn?: number;
  batchDate?: string;
  batchName: string;
  projectId: string;
  projectNameEn: string;
  projectNameAr?: string;
  plaqueRating?: string;
  validity?: string;
  projectType?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaqueInventoryItem {
  id: string;
  sn?: number;
  logDate?: string;
  projectName: string;
  qtyIn: number;
  qtyOut: number;
  remaining: number;
  totalUsed: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IprintInventoryItem {
  id: string;
  series: string;
  sn?: number;
  date?: string;
  projectName: string;
  count?: number;
  batch?: string;
  remarks?: string;
  type?: string;
  countOrder?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedalmadeInventoryItem {
  id: string;
  plaqueType: string;
  category: string;
  stockOnHand: number;
  firstOrder: number;
  secondOrder: number;
  totalMedalmadeOrder: number;
  totalPlaques: number;
  totalDelivered: number;
  remainingMedalmade: number;
  inhousePlaque: number;
  remainingInhouse: number;
  remainingStockTotal: number;
  outgoing2025Total: number;
  outgoing2026Total: number;
  nextOrder: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingChartItem {
  label: string;
  count: number;
}

export interface CategoryChartData {
  title: string;
  category: "DB" | "CM" | "OP";
  ratingLabel: string;
  total: number;
  items: RatingChartItem[];
  maxScale: number;
  scaleSteps: number[];
  color: string;
}

export interface GSASDashboardChartData {
  db: CategoryChartData;
  cm: CategoryChartData;
  op: CategoryChartData;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  roleName?: string;
  permissions?: PermissionKey[];
  createdAt: string;
  lastSeen?: string;
  totalMinutesOnline?: number;
  sessionStart?: string;
  isBlocked?: boolean;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface SessionPayload {
  userId: string;
  username: string;
  email?: string;
  role: UserRole;
  roleName?: string;
  permissions?: PermissionKey[];
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface UserActivity {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  roleName?: string;
  permissions?: PermissionKey[];
  createdAt: string;
  lastSeen?: string;
  totalMinutesOnline: number;
  isOnline: boolean;
  isBlocked?: boolean;
}

export const ROLE_RANK: Record<BuiltinRole, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  viewer: 1,
};

export const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
  viewer: "Viewer",
};

export function getUserRoleLabel(role: UserRole, customRoleName?: string): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  if (role === "viewer") return "Viewer";
  if (role.startsWith("custom:") && customRoleName) return customRoleName;
  return "Viewer";
}

export function isBuiltinRoleLabel(name: string): boolean {
  const normalizedName = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
  return ["admin", "user", "super admin", "superadmin", "moderator", "viewer"].includes(normalizedName);
}

export function grantableRoles(granter: UserRole): UserRole[] {
  if (granter === "super_admin") return ["admin", "moderator", "viewer"];
  if (granter.startsWith("custom:")) return ["viewer"];
  if (granter === "admin") return ["moderator", "viewer"];
  if (granter === "moderator") return ["viewer"];
  return [];
}

export const can = {
  viewReportsAndStatus: (role: UserRole) => role === "super_admin",
  viewUserManagement: (role: UserRole) => ["super_admin", "admin", "moderator"].includes(role),
  deleteUser: (role: UserRole) => role === "super_admin",
  editUser: (role: UserRole) => ["super_admin", "admin"].includes(role),
  addUser: (role: UserRole) => ["super_admin", "admin", "moderator"].includes(role),
  blockUser: (role: UserRole) => ["super_admin", "admin", "moderator"].includes(role),
  viewPermissions: (role: UserRole) => role === "super_admin" || role === "admin",
  manageUser: (role: UserRole, targetRole: UserRole) =>
    role === "super_admin" ||
    (role.startsWith("custom:") && targetRole === "viewer") ||
    (isBuiltinRole(role) && isBuiltinRole(targetRole) && ROLE_RANK[role] > ROLE_RANK[targetRole]) ||
    (role === "admin" && targetRole.startsWith("custom:")),
  grantRole: (granter: UserRole, targetRole: UserRole) =>
    targetRole.startsWith("custom:")
      ? ["super_admin", "admin"].includes(granter)
      : grantableRoles(granter).includes(targetRole),
};

export interface ProjectFile {
  id: string;
  projectId: string;
  projectType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileData?: string;
  createdAt: string;
  createdBy?: string;
}
