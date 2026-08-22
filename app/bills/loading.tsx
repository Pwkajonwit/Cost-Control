import { LoadingState } from "@/components/LoadingState";

export default function BillsLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดรายการตั้งเบิกและบิล..." message="กำลังจัดเตรียมข้อมูลตารางบิลและสถานะการอนุมัติ" />
    </div>
  );
}
