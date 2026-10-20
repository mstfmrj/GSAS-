import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: [
      "src/app/(protected)/dashboard/edit-role/page.tsx",
      "src/app/(protected)/dashboard/edit-user/page.tsx",
      "src/app/(protected)/dashboard/projects/batches/page.tsx",
      "src/app/(protected)/dashboard/projects/files/upload/page.tsx",
      "src/app/(protected)/dashboard/projects/inventory/page.tsx",
      "src/app/(protected)/dashboard/projects/iprint/page.tsx",
      "src/app/(protected)/dashboard/projects/medalmade/page.tsx",
      "src/app/(protected)/users/page.tsx",
      "src/components/dashboard/GSASProjectsTable.tsx",
      "src/components/dashboard/ProjectFilesSection.tsx",
      "src/components/dashboard/UserProfileEditModal.tsx",
      "src/context/ThemeContext.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },

  globalIgnores([

    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
