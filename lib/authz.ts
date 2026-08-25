import type { AppRole, NavItem } from "@/lib/types";

export function isAppRole(value: string | null): value is AppRole {
  return value === "root_admin" || value === "course_admin" || value === "trainee";
}

export function canAccessNavItem(role: AppRole, item: Pick<NavItem, "allowedRoles">) {
  return !item.allowedRoles || item.allowedRoles.includes(role);
}
