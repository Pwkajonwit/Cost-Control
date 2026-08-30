import { LoadingState } from "@/components/LoadingState";

export default function ProjectAnalyticsLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดรายงานวิเคราะห์โครงการ..." message="กำลังประมวลผลกราฟสรุปงบประมาณและยอดใช้จ่ายสะสม" />
    </div>
  );
}
