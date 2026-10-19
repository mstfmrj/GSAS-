"use client";








import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/")
  ) {
    return null;
  }

  return (
    <footer className="bg-white py-4 border-top mt-auto">
      <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="col-12 col-md-6 d-flex align-items-center">
          <span className="fw-bold me-2">GORD</span>
          <span className="text-muted small">
            &copy; {new Date().getFullYear()} All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
