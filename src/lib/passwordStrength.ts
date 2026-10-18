/**
 * src/lib/passwordStrength.ts
 *
 * PURPOSE:
 * Client and server helper evaluating password complexity, strength score, and rule checks.
 */

export interface PasswordStrength {
  score: number;
  label: "Too Short" | "Weak" | "Fair" | "Strong" | "Very Strong";
  color: string;
  barColor: string;
  percent: number;
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;

  if (password.length === 0 || !checks.length) {
    return { score: 0, label: "Too Short", color: "text-danger", barColor: "#dc3545", percent: 0, checks };
  }

  if (passed === 1 || passed === 2) {
    return { score: 1, label: "Weak", color: "text-danger", barColor: "#dc3545", percent: 25, checks };
  }
  if (passed === 3) {
    return { score: 2, label: "Fair", color: "text-warning", barColor: "#ffc107", percent: 50, checks };
  }
  if (passed === 4) {
    return { score: 3, label: "Strong", color: "text-info", barColor: "#0dcaf0", percent: 75, checks };
  }
  return { score: 4, label: "Very Strong", color: "text-success", barColor: "#198754", percent: 100, checks };
}
