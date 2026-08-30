import { LoadingState } from "@/components/LoadingState";

export default function LineSystemLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดระบบแอดมิน LINE OA..." message="กำลังเชื่อมต่อและตรวจสอบสถานะโควต้าคำสั่ง LINE Bot" />
    </div>
  );
}
