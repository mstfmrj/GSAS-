/**
 * src/app/page.tsx
 *
 * PURPOSE:
 * Public root landing route; redirects incoming visitors to the main /dashboard.
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
