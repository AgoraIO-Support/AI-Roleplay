import { ActivityLogPanel } from "@/components/admin/activity-log-panel";
import { RoleGuard } from "@/components/auth/role-guard";

export default function ControlPanelActivityPage() {
  return (
    <RoleGuard allowedRoles={["root_admin"]}>
      <ActivityLogPanel />
    </RoleGuard>
  );
}
