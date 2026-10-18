/**
 * src/app/(protected)/dashboard/projects/db/page.tsx
 *
 * PURPOSE:
 * GSAS Design & Build (D&B) Projects list displaying ratings, certificates, and project progress.
 */

import GSASProjectsTable from "@/components/dashboard/GSASProjectsTable";

export default function DBProjectsPage() {
  return <GSASProjectsTable category="DB" />;
}
