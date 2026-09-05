import { DashboardSkeleton } from "@/components/skeletons";

const WORK_STATUS_CARDS = [
  { title: "🔴 (งานใหญ่)" },
  { title: "🟢 (งานเล็ก)" },
  { title: "⚫ (เสร็จแล้ว)" },
  { title: "ยอดเบิกจ่ายรวม" },
];

const WORK_STATUS_COLUMNS = [
  "สถานะ",
  "ID Project",
  "ชื่อ Project",
  "ลูกค้า",
  "บริษัท",
  "งบประมาณ",
  "เบิกแล้ว",
  "คงเหลือ",
  "ความคืบหน้า",
  "จัดการ"
];

export default function WorkStatusLoading() {
  return (
    <DashboardSkeleton
      statCards={WORK_STATUS_CARDS}
      columns={WORK_STATUS_COLUMNS}
      searchPlaceholder="ค้นหาโครงการ, ลูกค้า..."
      chips={["ทั้งหมด", "งานใหญ่", "งานเล็ก", "เสร็จแล้ว"]}
      primaryButtonLabel="เพิ่มโครงการ"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
