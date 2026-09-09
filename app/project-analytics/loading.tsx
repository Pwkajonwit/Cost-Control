import { DashboardSkeleton } from "@/components/skeletons";

const ANALYTICS_CARDS = [
  { title: "โครงการทั้งหมด" },
  { title: "งบประมาณรวม" },
  { title: "ต้นทุนจริงรวม" },
  { title: "อัตรากำไรเฉลี่ย" },
];

const ANALYTICS_COLUMNS = [
  "โครงการ",
  "ลูกค้า",
  "งบประมาณ",
  "ต้นทุนจริง",
  "ผลต่าง (Variance)",
  "กำไรคาดการณ์",
  "สถานะสุขภาพงบ"
];

export default function ProjectAnalyticsLoading() {
  return (
    <DashboardSkeleton
      statCards={ANALYTICS_CARDS}
      columns={ANALYTICS_COLUMNS}
      searchPlaceholder="ค้นหาโครงการ, ลูกค้า..."
      chips={["ทั้งหมด", "งบปกติ", "งบตึง", "งบเกิน"]}
      primaryButtonLabel="รายงานสรุป"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
