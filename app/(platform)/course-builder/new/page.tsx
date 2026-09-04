import { Suspense } from "react";

import { RolePlayBuilder } from "@/components/admin/role-play-builder";
import { RoleGuard } from "@/components/auth/role-guard";

export default function NewCourseBuilderRolePlayPage() {
  return (
    <RoleGuard allowedRoles={["root_admin", "course_admin"]}>
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">
            Loading role play builder...
          </div>
        }
      >
        <RolePlayBuilder embedded />
      </Suspense>
    </RoleGuard>
  );
}
