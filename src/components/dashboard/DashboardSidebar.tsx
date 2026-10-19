"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { can, userHasPermission } from "@/lib/types";
import type { UserRole } from "@/lib/types";

interface DashboardSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onlineCount?: number;
}

interface NavItemProps extends DashboardSidebarProps {
  tab: string;
  icon: string;
  label: string;
  badge?: React.ReactNode;
  href?: string;
  navigate?: boolean;
  subItem?: boolean;
}

function NavItem({
  tab,
  icon,
  label,
  badge,
  href,
  navigate = false,
  subItem = false,
  activeTab = "users",
  onTabChange,
}: NavItemProps) {
  const pathname = usePathname();

  const isPathActive = href
    ? href === "/dashboard" || href === "/dashboard/projects"
      ? pathname === href
      : pathname === href || (pathname ? pathname.startsWith(href + "/") : false)
    : false;

  const isActive = activeTab === tab || isPathActive;
  const cls = `apex-nav-item ${subItem ? "apex-nav-subitem" : ""} ${isActive ? "active" : ""}`;

  if (onTabChange && !navigate) {
    return (
      <button type="button" className={cls} onClick={() => onTabChange(tab)}>
        <i className={`${icon} ${subItem ? "" : "fs-5"}`}></i>
        <span className="flex-grow-1 text-truncate">{label}</span>
        {badge}
      </button>
    );
  }

  return (
    <Link href={href ?? "/dashboard"} className={cls}>
      <i className={`${icon} ${subItem ? "" : "fs-5"}`}></i>
      <span className="flex-grow-1 text-truncate">{label}</span>
      {badge}
    </Link>
  );
}

export default function DashboardSidebar({
  activeTab = "users",
  onTabChange,
  onlineCount = 0,
}: DashboardSidebarProps) {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;
  const navProps = { activeTab, onTabChange };

  return (
    <aside className="apex-sidebar">
      {                          }
      <div className="apex-sidebar-brand d-flex align-items-center">
        <Link href="/dashboard" className="d-flex align-items-center text-decoration-none">
          <span
            style={{
              color: "#007c02",
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "1.5px",
              lineHeight: 1,
            }}
          >
            GSAS
          </span>
        </Link>
      </div>

      {                                      }
      <div className="apex-sidebar-nav">
        {user && userHasPermission(user, "dashboard.view") && (
          <NavItem {...navProps} tab="analytics" icon="bi bi-house" label="Home" href="/dashboard" />
        )}

        {user && userHasPermission(user, "gsas.view") && (
          <>
            <NavItem {...navProps} tab="projects" icon="bi bi-kanban" label="Projects" href="/dashboard/projects" navigate />

            {                                 }
            <div className="ps-2 border-start ms-3 py-1" style={{ borderColor: "var(--sidebar-border, #e2e8f0)" }}>
              <NavItem {...navProps} subItem tab="projects-cm"        icon="bi bi-building-check"     label="Construction Management" href="/dashboard/projects/cm"        navigate />
              <NavItem {...navProps} subItem tab="projects-db"        icon="bi bi-buildings"           label="Design & Build"          href="/dashboard/projects/db"        navigate />
              <NavItem {...navProps} subItem tab="projects-op"        icon="bi bi-gear-wide-connected" label="Operations"              href="/dashboard/projects/op"        navigate />
              <NavItem {...navProps} subItem tab="projects-batches"   icon="bi bi-printer"             label="For Designers-Printing"  href="/dashboard/projects/batches"   navigate />
              <NavItem {...navProps} subItem tab="projects-inventory" icon="bi bi-box-seam"            label="IKEA Frame"              href="/dashboard/projects/inventory" navigate />
              <NavItem {...navProps} subItem tab="projects-iprint"    icon="bi bi-card-checklist"      label="Iprint Inventory"        href="/dashboard/projects/iprint"    navigate />
              <NavItem {...navProps} subItem tab="projects-medalmade" icon="bi bi-award"               label="Outgoing Plaques"        href="/dashboard/projects/medalmade" navigate />
              <NavItem {...navProps} subItem tab="projects-report"    icon="bi bi-bar-chart-line"      label="Report"                  href="/dashboard/projects/report"    navigate />
            </div>
          </>
        )}

        {user && userHasPermission(user, "users.view") && (
          <NavItem
            {...navProps}
            tab="users"
            icon="bi bi-people"
            label="User Management"
            href="/dashboard?tab=users"
            badge={
              onlineCount > 0 ? (
                <span className="badge bg-success rounded-pill px-2" style={{ fontSize: "10px" }}>
                  {onlineCount} live
                </span>
              ) : undefined
            }
          />
        )}

        {user && role && can.viewPermissions(role) &&
          userHasPermission(user, "users.view") && userHasPermission(user, "users.edit") && (
          <NavItem {...navProps} tab="permissions" icon="bi bi-shield-lock" label="Role Management" href="/dashboard/permissions" navigate />
        )}

        {user && (
          <NavItem {...navProps} tab="customizer" icon="bi bi-palette" label="Theme Customizer" href="/dashboard?tab=customizer" />
        )}

        <NavItem {...navProps} tab="profile" icon="bi bi-person-circle" label="My Profile" href="/dashboard?tab=profile" />
      </div>

      {                                            }
      <div className="apex-sidebar-footer">
        <img
          src="/gsas-seal.png"
          alt="Global Sustainability Assessment System"
          style={{
            maxHeight: "135px",
            maxWidth: "220px",
            width: "92%",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 3px 10px rgba(0, 0, 0, 0.18))",
          }}
        />
      </div>
    </aside>
  );
}
