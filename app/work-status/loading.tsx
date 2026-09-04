import { LoadingState } from "@/components/LoadingState";

export default function WorkStatusLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-[65vh] flex items-center justify-center">
      <LoadingState title="กำลังโหลดสถานะโครงการ..." message="กำลังประมวลผลต้นทุนโครงการและความคืบหน้า" />
    </div>
  );
}
