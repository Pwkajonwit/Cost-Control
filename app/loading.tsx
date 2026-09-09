import { DashboardSkeleton } from "@/components/skeletons";

export default function RootLoading() {
  return (
    <DashboardSkeleton
      searchPlaceholder="ค้นหา..."
      primaryButtonLabel="เพิ่มข้อมูล"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
