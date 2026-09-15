import { AgentsLogPanel } from "@/components/admin/agents-log-panel";
import { RoleGuard } from "@/components/auth/role-guard";

export default function ControlPanelAgentsPage() {
  return (
    <RoleGuard allowedRoles={["root_admin"]}>
      <AgentsLogPanel />
    </RoleGuard>
  );
}
