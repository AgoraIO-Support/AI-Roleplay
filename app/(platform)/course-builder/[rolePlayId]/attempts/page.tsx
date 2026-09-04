import { Suspense } from "react";

import { CourseAttemptsPage } from "@/components/admin/course-attempts-page";
import { RoleGuard } from "@/components/auth/role-guard";

export default async function CourseBuilderAttemptsRoute({
  params,
}: {
  params: Promise<{ rolePlayId: string }>;
}) {
  const { rolePlayId } = await params;

  return (
    <RoleGuard allowedRoles={["root_admin", "course_admin"]}>
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">
            Loading course attempts...
          </div>
        }
      >
        <CourseAttemptsPage rolePlayId={rolePlayId} />
      </Suspense>
    </RoleGuard>
  );
}
