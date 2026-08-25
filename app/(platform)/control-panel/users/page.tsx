import { RoleGuard } from "@/components/auth/role-guard";
import { ControlPanel } from "@/components/admin/control-panel";

export default function ControlPanelUsersPage() {
  return (
    <RoleGuard allowedRoles={["root_admin"]}>
      <ControlPanel section="users" />
    </RoleGuard>
  );
}
