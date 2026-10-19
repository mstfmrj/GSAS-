"use client";








import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PlaqueInventoryForm from "@/components/dashboard/PlaqueInventoryForm";
import { PlaqueInventoryItem } from "@/lib/types";

export default function EditInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const id = resolvedParams.id;
  const requestedReturnUrl = resolvedSearchParams?.returnTo;

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<PlaqueInventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const defaultBackHref = "/dashboard/projects/inventory";
  const isValidReturnUrl = Boolean(
    requestedReturnUrl &&
    requestedReturnUrl.startsWith("/dashboard/projects") &&
    !requestedReturnUrl.startsWith("//")
  );
  const returnUrl = isValidReturnUrl ? (requestedReturnUrl as string) : defaultBackHref;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user && id) {
      async function load() {
        setLoading(true);
        try {
          const res = await fetch(`/api/plaque-inventory/${id}`);
          if (!res.ok) throw new Error("Not found");
          const json = await res.json();
          setItem(json.data ?? json);
        } catch {
          setError("Failed to load inventory details.");
        } finally {
          setLoading(false);
        }
      }
      void load();
    }
  }, [authLoading, user, id, router]);

  if (authLoading || loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="apex-dashboard-layout">
        <DashboardSidebar activeTab="projects-inventory" />
        <main className="apex-main-content">
          <DashboardHeader />
          <div className="p-4 p-md-5">
            <div className="alert alert-danger">{error || "Record not found"}</div>
            <Link href={returnUrl} className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-inventory" />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-4 p-md-5">
          <PlaqueInventoryForm mode="edit" id={item.id} initialData={item} returnUrl={returnUrl} />
        </div>
      </main>
    </div>
  );
}
