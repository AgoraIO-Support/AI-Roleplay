import { RoleGuard } from "@/components/auth/role-guard";
import { ControlPanel } from "@/components/admin/control-panel";

export default function ControlPanelCoursesPage() {
  return (
    <RoleGuard allowedRoles={["root_admin"]}>
      <ControlPanel section="courses" />
    </RoleGuard>
  );
}
