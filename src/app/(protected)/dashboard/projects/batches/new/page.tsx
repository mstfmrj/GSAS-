"use client";








import { use } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PlaqueBatchForm from "@/components/dashboard/PlaqueBatchForm";

export default function NewBatchPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const returnTo = resolvedSearchParams?.returnTo;
  const isValidReturnUrl = returnTo && (returnTo.startsWith("/dashboard/projects") || returnTo.startsWith("/dashboard"));
  const returnUrl = isValidReturnUrl ? returnTo : "/dashboard/projects/batches";

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-batches" />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-4 p-md-5">
          <PlaqueBatchForm mode="create" returnUrl={returnUrl} />
        </div>
      </main>
    </div>
  );
}
