






export function cleanString(value?: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function cleanEmail(value?: unknown): string {
  return cleanString(value).toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter((field) => {
    const val = data[field];
    return val === undefined || val === null || (typeof val === "string" && !val.trim());
  });
  return { valid: missing.length === 0, missing };
}
