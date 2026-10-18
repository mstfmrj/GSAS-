"use client";

/**
 * src/components/BootstrapClient.tsx
 *
 * PURPOSE:
 * Client-only bootstrap initiator loading Bootstrap 5 JavaScript components dynamically.
 */

import { useEffect } from "react";

export default function BootstrapClient() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return null;
}
