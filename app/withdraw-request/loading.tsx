import { LoadingState } from "@/components/LoadingState";

export default function WithdrawLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดรายการตั้งเบิกเงิน..." message="กำลังดึงข้อมูลบิลและสถานะผู้อนุมัติล่าสุด" />
    </div>
  );
}
