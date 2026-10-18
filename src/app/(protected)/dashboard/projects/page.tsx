"use client";

/**
 * src/app/(protected)/dashboard/projects/page.tsx
 *
 * PURPOSE:
 * Projects master hub displaying summary metrics, search filters, and navigation to project categories.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface Counts {
  cm: number;
  db: number;
  op: number;
  batches: number;
  inventory: number;
  iprint: number;
  medalmade: number;
}

export default function ProjectsHubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;

    async function fetchCounts() {
      try {
        const [cmRes, dbRes, opRes, batchRes, invRes, iprintRes, mmRes] = await Promise.all([
          fetch("/api/gsas?category=CM&pageSize=1"),
          fetch("/api/gsas?category=DB&pageSize=1"),
          fetch("/api/gsas?category=OP&pageSize=1"),
          fetch("/api/plaque-batches?pageSize=1"),
          fetch("/api/plaque-inventory?pageSize=1"),
          fetch("/api/iprint-inventory?pageSize=1"),
          fetch("/api/medalmade-inventory?pageSize=1"),
        ]);
        const [cm, db, op, batches, inventory, iprint, mm] = await Promise.all([
          cmRes.json(),
          dbRes.json(),
          opRes.json(),
          batchRes.json(),
          invRes.json(),
          iprintRes.json(),
          mmRes.json(),
        ]);
        setCounts({
          cm: cm.data?.total ?? cm.total ?? 0,
          db: db.data?.total ?? db.total ?? 0,
          op: op.data?.total ?? op.total ?? 0,
          batches: batches.data?.total ?? batches.total ?? 0,
          inventory: inventory.data?.total ?? inventory.total ?? 0,
          iprint: iprint.data?.total ?? iprint.total ?? 0,
          medalmade: mm.data?.total ?? mm.total ?? 0,
        });
      } catch {
        setCounts({ cm: 0, db: 0, op: 0, batches: 0, inventory: 0, iprint: 0, medalmade: 0 });
      } finally {
        setLoading(false);
      }
    }

    void fetchCounts();
  }, [user, authLoading, router]);

  const cards = [
    {
      title: "Construction Management Projects",
      subtitle: "GSAS Conformance Monitoring",
      href: "/dashboard/projects/cm",
      countKey: "cm" as keyof Counts,
      icon: "bi-building-check",
      color: "primary",
    },
    {
      title: "Design & Build Projects",
      subtitle: "GSAS Design & Build",
      href: "/dashboard/projects/db",
      countKey: "db" as keyof Counts,
      icon: "bi-buildings",
      color: "success",
    },
    {
      title: "Operations Projects",
      subtitle: "Operations Certification",
      href: "/dashboard/projects/op",
      countKey: "op" as keyof Counts,
      icon: "bi-gear-wide-connected",
      color: "warning",
    },
    {
      title: "For Designers-Printing",
      subtitle: "Dispatch records & print batch tracking",
      href: "/dashboard/projects/batches",
      countKey: "batches" as keyof Counts,
      icon: "bi-printer",
      color: "danger",
    },
    {
      title: "IKEA Frame",
      subtitle: "Stock in / out log",
      href: "/dashboard/projects/inventory",
      countKey: "inventory" as keyof Counts,
      icon: "bi-box-seam",
      color: "info",
    },
    {
      title: "Iprint Inventory",
      subtitle: "Certificate frame inventory with Iprints",
      href: "/dashboard/projects/iprint",
      countKey: "iprint" as keyof Counts,
      icon: "bi-card-checklist",
      color: "primary",
    },
    {
      title: "Outgoing Plaques",
      subtitle: "Plaque stock, deliveries & outgoing tracking",
      href: "/dashboard/projects/medalmade",
      countKey: "medalmade" as keyof Counts,
      icon: "bi-award",
      color: "success",
    },
    {
      title: "Report",
      subtitle: "Project totals and rating statistics by year",
      href: "/dashboard/projects/report",
      countKey: null,
      icon: "bi-bar-chart-line",
      color: "dark",
    },
  ];

  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const totalGSAS = (counts?.cm ?? 0) + (counts?.db ?? 0) + (counts?.op ?? 0);

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects" />
      <main className="apex-main-content">
        <DashboardHeader />

        <div className="p-4 p-md-5">

          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h2 className="fw-bold mb-1">Projects</h2>
              <p className="text-muted mb-0">
                GSAS certified projects, printing dispatches, IKEA frames, Iprints &amp; Medalmade inventory
              </p>
            </div>
          </div>

          <div className="row g-4">
            {cards.map((card) => (
              <div className="col-12 col-sm-6 col-xl-3" key={card.href}>
                <Link href={card.href} className="text-decoration-none">
                  <div className="card border-0 shadow-sm h-100 card-hover">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-start justify-content-between mb-3">
                        <div className={`rounded-3 p-3 bg-${card.color} bg-opacity-10`}>
                          <i className={`bi ${card.icon} fs-3 text-${card.color}`}></i>
                        </div>
                      </div>
                      <div className="mt-2">
                        <h3 className="fw-bold mb-0">
                          {loading ? (
                            <span className="placeholder col-4 rounded"></span>
                          ) : card.countKey ? (
                            (counts?.[card.countKey] ?? 0).toLocaleString()
                          ) : (
                            <span className="fs-5 text-muted">View</span>
                          )}
                        </h3>
                        <p className="fw-semibold text-dark mb-1 mt-1">{card.title}</p>
                        <p className="text-muted small mb-0">{card.subtitle}</p>
                      </div>
                    </div>
                    <div className="card-footer bg-transparent border-0 px-4 pb-3">
                      <span className={`text-${card.color} small fw-semibold`}>
                        View records <i className="bi bi-arrow-right ms-1"></i>
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Summary row */}
          {counts && (
            <div className="card border-0 shadow-sm mt-4">
              <div className="card-body">
                <div className="row text-center g-3">
                  <div className="col-6 col-md-3">
                    <div className="fw-bold fs-4 text-primary">{totalGSAS.toLocaleString()}</div>
                    <div className="text-muted small">Total Certified Projects</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="fw-bold fs-4 text-success">{counts.db.toLocaleString()}</div>
                    <div className="text-muted small">Design &amp; Build Certified</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="fw-bold fs-4 text-warning">{counts.op.toLocaleString()}</div>
                    <div className="text-muted small">Operations Certified</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="fw-bold fs-4 text-info">{counts.iprint.toLocaleString()}</div>
                    <div className="text-muted small">Iprint Entries</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .card-hover {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          cursor: pointer;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
        }
      `}</style>
    </div>
  );
}
