"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ThemeSettings {
  primaryColor: string;
  primaryHover: string;
  fontFamily: string;
  fontSize: string; // '14px', '16px', '18px'
  borderRadius: string; // '4px', '8px', '14px', '24px'
  navbarStyle: "dark" | "light" | "primary";
  cardShadow: "none" | "sm" | "md" | "lg";
  mode: "light" | "dark";
  sidebarTheme: "light" | "dark" | "slate" | "green" | "custom";
  sidebarBg?: string;
  sidebarColor?: string;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  primaryColor: "#0d6efd",
  primaryHover: "#0b5ed7",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontSize: "16px",
  borderRadius: "0.75rem",
  navbarStyle: "dark",
  cardShadow: "sm",
  mode: "light",
  sidebarTheme: "light",
  sidebarBg: "#ffffff",
  sidebarColor: "#374151",
};

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (newSettings: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "nextauth_ui_theme_settings";


function hexToRgb(hex: string): string {
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  const num = parseInt(c, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        setTheme({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error("Failed to load theme settings:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));

      const root = document.documentElement;
      const rgb = hexToRgb(theme.primaryColor);

      // Bootstrap & typography variables
      root.style.setProperty("--bs-primary", theme.primaryColor);
      root.style.setProperty("--bs-primary-rgb", rgb);
      root.style.setProperty("--bs-link-color", theme.primaryColor);
      root.style.setProperty("--bs-link-hover-color", theme.primaryHover);
      root.style.setProperty("--bs-btn-primary-bg", theme.primaryColor);
      root.style.setProperty("--bs-btn-primary-border-color", theme.primaryColor);
      root.style.setProperty("--app-primary", theme.primaryColor);
      root.style.setProperty("--bs-body-font-family", theme.fontFamily);
      root.style.setProperty("--bs-body-font-size", theme.fontSize);
      root.style.setProperty("--bs-border-radius", theme.borderRadius);
      root.style.setProperty("--bs-border-radius-lg", theme.borderRadius);

      // Dark / Light mode attribute and variables
      const isDark = theme.mode === "dark";
      root.setAttribute("data-bs-theme", isDark ? "dark" : "light");

      if (isDark) {
        root.style.setProperty("--dashboard-bg", "#0f172a");
        root.style.setProperty("--dashboard-color", "#f8fafc");
        root.style.setProperty("--card-bg", "#1e293b");
        root.style.setProperty("--card-border", "#334155");
        root.style.setProperty("--card-footer-bg", "#1e293b");
        root.style.setProperty("--topbar-bg", "#1e293b");
        root.style.setProperty("--topbar-color", "#f8fafc");
        root.style.setProperty("--topbar-border", "#334155");
        root.style.setProperty("--table-header-bg", "#1e293b");
      } else {
        root.style.setProperty("--dashboard-bg", "#f8fafc");
        root.style.setProperty("--dashboard-color", "#0f172a");
        root.style.setProperty("--card-bg", "#ffffff");
        root.style.setProperty("--card-border", "#e2e8f0");
        root.style.setProperty("--card-footer-bg", "#ffffff");
        root.style.setProperty("--topbar-bg", "#ffffff");
        root.style.setProperty("--topbar-color", "#0f172a");
        root.style.setProperty("--topbar-border", "#e2e8f0");
        root.style.setProperty("--table-header-bg", "#f8fafc");
      }

      // Sidebar Theme Styling: Light or Dark, with active button matching selected Primary Theme Color
      const isSidebarDark = theme.sidebarTheme === "dark";
      if (isSidebarDark) {
        root.style.setProperty("--sidebar-bg", "#111827");
        root.style.setProperty("--sidebar-color", "#9ca3af");
        root.style.setProperty("--sidebar-border", "#1f2937");
        root.style.setProperty("--sidebar-brand-color", "#007c02");
        root.style.setProperty("--sidebar-item-color", "#9ca3af");
        root.style.setProperty("--sidebar-item-hover-bg", `rgba(${rgb}, 0.15)`);
        root.style.setProperty("--sidebar-item-hover-color", "#ffffff");
        root.style.setProperty("--sidebar-active-bg", `rgba(${rgb}, 0.24)`);
        root.style.setProperty("--sidebar-active-color", theme.primaryColor);
      } else {
        // default: light nav
        root.style.setProperty("--sidebar-bg", "#ffffff");
        root.style.setProperty("--sidebar-color", "#374151");
        root.style.setProperty("--sidebar-border", "#e5e7eb");
        root.style.setProperty("--sidebar-brand-color", "#007c02");
        root.style.setProperty("--sidebar-item-color", "#4b5563");
        root.style.setProperty("--sidebar-item-hover-bg", `rgba(${rgb}, 0.08)`);
        root.style.setProperty("--sidebar-item-hover-color", theme.primaryColor);
        root.style.setProperty("--sidebar-active-bg", `rgba(${rgb}, 0.14)`);
        root.style.setProperty("--sidebar-active-color", theme.primaryColor);
      }

      document.body.style.fontFamily = theme.fontFamily;
      document.body.style.fontSize = theme.fontSize;
    } catch (e) {
      console.error("Failed to apply theme:", e);
    }
  }, [theme, isLoaded]);

  const updateTheme = (newSettings: Partial<ThemeSettings>) => {
    setTheme((prev) => {
      const updated = { ...prev, ...newSettings };
    
      if (newSettings.primaryColor && !newSettings.primaryHover) {
        updated.primaryHover = newSettings.primaryColor;
      }
      return updated;
    });
  };

  const resetTheme = () => {
    setTheme(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
