"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import GordLogo from "@/components/GordLogo";

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { theme } = useTheme();

  if (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  ) {
    return null;
  }

  let navClasses = "navbar navbar-expand-lg shadow-sm sticky-top ";
  let navStyle: React.CSSProperties = {};

  const isLightNav = theme.navbarStyle === "light";

  if (isLightNav) {
    navClasses += "navbar-light bg-white border-bottom";
  } else if (theme.navbarStyle === "primary") {
    navClasses += "navbar-dark";
    navStyle = { backgroundColor: theme.primaryColor };
  } else {
    navClasses += "navbar-dark bg-dark";
  }


  const authBtnClass = isLightNav
    ? "btn btn-sm px-3 fw-semibold text-dark border border-dark border-opacity-25 shadow-sm"
    : "btn btn-sm px-3 fw-semibold text-white border border-light border-opacity-50 shadow-sm";

  const authBtnBg = (isActive: boolean) => ({
    backgroundColor: isLightNav
      ? isActive
        ? "rgba(0, 0, 0, 0.12)"
        : "rgba(0, 0, 0, 0.05)"
      : isActive
      ? "rgba(255, 255, 255, 0.3)"
      : "rgba(255, 255, 255, 0.15)",
  });

  return (
    <nav className={navClasses} style={navStyle}>
      <div className="container">
        <Link href="/" className="navbar-brand d-flex align-items-center text-decoration-none">
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

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link
                href="/"
                className={`nav-link ${pathname === "/" ? "active fw-semibold" : ""}`}
              >
                <i className="bi bi-house me-1"></i> Home
              </Link>
            </li>
            {user?.role === "admin" && (
  <li className="nav-item">
    <Link
      href="/dashboard"
      className={`nav-link ${pathname === "/dashboard" ? "active fw-semibold" : ""}`}
    >
      <i className="bi bi-speedometer2 me-1"></i> Dashboard
    </Link>
  </li>
)}
            {user?.role === "admin" && (
              <li className="nav-item">
                <Link
                  href="/users"
                  className={`nav-link ${pathname === "/users" ? "active fw-semibold" : ""}`}
                >
                  <i className="bi bi-people me-1"></i> Users
                </Link>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2">
            {loading ? (
              <div className="spinner-border spinner-border-sm text-secondary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : user ? (
              <div className="dropdown">
                <button
                  className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2 text-reset border"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-person-circle fs-5" style={{ color: theme.primaryColor }}></i>
                  <span className="fw-semibold">{user.name || user.username}</span>
                  <span className="badge bg-dark text-white text-uppercase px-2">
                    <i className="bi bi-shield-check me-1" style={{ color: theme.primaryColor }}></i>
                    {user.role}
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow" aria-labelledby="userDropdown">
                  <li>
                    <h6 className="dropdown-header">Signed in as @{user.username}</h6>
                  </li>

{(user.role === "admin" || user.role === "super_admin") && (
  <li>
    <Link href="/dashboard" className="dropdown-item">
      <i className="bi bi-layout-text-window-reverse me-2"></i> Dashboard
    </Link>
  </li>
)}
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button
                      onClick={() => logout()}
                      className="dropdown-item text-danger d-flex align-items-center"
                    >
                      <i className="bi bi-box-arrow-right me-2"></i> Log Out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <Link
                href="/login"
                className={authBtnClass}
                style={authBtnBg(pathname === "/login")}
              >
                <i className="bi bi-box-arrow-in-right me-1"></i> Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
