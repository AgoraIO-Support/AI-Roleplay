import { Suspense } from "react";

import { RoleGuard } from "@/components/auth/role-guard";
import { CourseBuilderWorkspace } from "@/components/admin/course-builder-workspace";

export default function CourseBuilderPage() {
  return (
    <RoleGuard allowedRoles={["root_admin", "course_admin"]}>
      <Suspense fallback={<div className="text-sm text-slate-500">Loading course builder...</div>}>
        <CourseBuilderWorkspace />
      </Suspense>
    </RoleGuard>
  );
}
