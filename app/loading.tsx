import { LoadingState } from "@/components/LoadingState";

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดข้อมูล..." message="ระบบกำลังประมวลผลและดึงข้อมูลภาพรวมสำหรับคุณ" />
    </div>
  );
}
