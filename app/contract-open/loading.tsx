import { LoadingState } from "@/components/LoadingState";

export default function ContractOpenLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดรายการเปิดจ้างรับเหมา..." message="กำลังประมวลผลสัญญางานและข้อมูลผู้รับเหมา" />
    </div>
  );
}
