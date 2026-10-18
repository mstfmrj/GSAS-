"use client";

/**
 * src/app/(protected)/dashboard/projects/inventory/new/page.tsx
 *
 * PURPOSE:
 * Form page for adding a new IKEA Frame inventory batch or item.
 */

import { use } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PlaqueInventoryForm from "@/components/dashboard/PlaqueInventoryForm";

export default function NewInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const returnTo = resolvedSearchParams?.returnTo;
  const isValidReturnUrl = returnTo && (returnTo.startsWith("/dashboard/projects") || returnTo.startsWith("/dashboard"));
  const returnUrl = isValidReturnUrl ? returnTo : "/dashboard/projects/inventory";

  return (
    <div className="apex-dashboard-layout">
      <DashboardSidebar activeTab="projects-inventory" />
      <main className="apex-main-content">
        <DashboardHeader />
        <div className="p-4 p-md-5">
          <PlaqueInventoryForm mode="create" returnUrl={returnUrl} />
        </div>
      </main>
    </div>
  );
}
