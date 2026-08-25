import { Suspense } from "react";

import { CourseAnalyticsPage } from "@/components/admin/course-analytics-page";
import { RoleGuard } from "@/components/auth/role-guard";

export default async function CourseBuilderAnalyticsRoute({
  params,
}: {
  params: Promise<{ rolePlayId: string }>;
}) {
  const { rolePlayId } = await params;

  return (
    <RoleGuard allowedRoles={["root_admin", "course_admin"]}>
      <Suspense fallback={<div className="text-sm text-slate-500">Loading course analytics...</div>}>
        <CourseAnalyticsPage rolePlayId={rolePlayId} />
      </Suspense>
    </RoleGuard>
  );
}
