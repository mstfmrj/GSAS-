"use client";

/**
 * src/components/main/layoutContent.tsx
 *
 * PURPOSE:
 * Wrapper managing navbar and footer visibility depending on route context.
 */

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-grow-1">{children}</main>
      <Footer />
    </>
  );
}
