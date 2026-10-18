/**
 * src/app/(protected)/dashboard/projects/op/page.tsx
 *
 * PURPOSE:
 * GSAS Operations (OP) Projects view displaying certified ratings, stages, and project statuses.
 */

import GSASProjectsTable from "@/components/dashboard/GSASProjectsTable";

export default function OPProjectsPage() {
  return <GSASProjectsTable category="OP" />;
}
