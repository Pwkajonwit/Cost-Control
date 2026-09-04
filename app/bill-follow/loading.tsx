import { LoadingState } from "@/components/LoadingState";

export default function BillFollowLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดรายการติดตามบิล..." message="กำลังประมวลผลสถานะ VAT, หัก ณ ที่จ่าย และเครดิต" />
    </div>
  );
}
