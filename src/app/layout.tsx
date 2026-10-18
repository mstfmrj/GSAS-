/**
 * src/app/layout.tsx
 *
 * PURPOSE:
 * Root application layout injecting Bootstrap CSS/JS, global providers, navbar, and main content wrappers.
 */

import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import Providers from "@/components/main/providers";
import LayoutContent from "@/components/main/layoutContent";

export const metadata: Metadata = {
  title: "GSAS",
  description: "Global Sustainability Assessment System platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="d-flex flex-column min-vh-100 bg-light">
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}
