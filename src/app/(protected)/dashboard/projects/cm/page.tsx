/**
 * src/app/(protected)/dashboard/projects/cm/page.tsx
 *
 * PURPOSE:
 * GSAS Construction Management (CM) Projects listing page with full search and status filters.
 */

import GSASProjectsTable from "@/components/dashboard/GSASProjectsTable";

export default function CMProjectsPage() {
  return <GSASProjectsTable category="CM" />;
}
