import { UserManagementDashboardClient } from "@/components/dashboards/UserManagementDashboardClient";

export const dynamic = "force-dynamic";

export default function SettingsUsersPage() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <UserManagementDashboardClient />
    </div>
  );
}

