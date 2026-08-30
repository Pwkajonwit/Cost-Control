import { LoadingState } from "@/components/LoadingState";

export default function SettingsLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดการตั้งค่าระบบ..." message="กำลังจัดเตรียมพารามิเตอร์และการเชื่อมต่อข้อมูล" />
    </div>
  );
}
