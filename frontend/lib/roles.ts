import type { RoleSummary } from "./types";

export const DEPARTMENT_ORDER = [
  "Engineering",
  "Data & ML",
  "Product",
  "Design",
  "General",
] as const;

export type Department = (typeof DEPARTMENT_ORDER)[number];

export function departmentRank(department: string): number {
  const index = DEPARTMENT_ORDER.indexOf(department as Department);
  return index === -1 ? DEPARTMENT_ORDER.length : index;
}

export interface RoleGroup {
  department: string;
  roles: RoleSummary[];
}

export function groupRolesByDepartment(roles: RoleSummary[]): RoleGroup[] {
  const buckets = new Map<string, RoleSummary[]>();
  for (const role of roles) {
    const department = role.department || "General";
    const list = buckets.get(department);
    if (list) list.push(role);
    else buckets.set(department, [role]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => departmentRank(a) - departmentRank(b))
    .map(([department, grouped]) => ({
      department,
      roles: [...grouped].sort((a, b) =>
        a.position_title.localeCompare(b.position_title),
      ),
    }));
}
