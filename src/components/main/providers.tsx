"use client";








import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import BootstrapClient from "@/components/BootstrapClient";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BootstrapClient />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
