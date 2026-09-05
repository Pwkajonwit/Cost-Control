import { DashboardSkeleton } from "@/components/skeletons";

const REPORTS_CARDS = [
  { title: "ยอดค่าใช้จ่ายรวม" },
  { title: "หมวดค่าใช้จ่าย" },
  { title: "จำนวนรายการบิล" },
  { title: "ยอดภาษีรวม" },
];

const REPORTS_COLUMNS = [
  "หมวดหมู่",
  "รายการ",
  "โครงการ",
  "ร้านค้า/ผู้ขาย",
  "ยอดเงินรวม",
  "ภาษี/หัก ณ ที่จ่าย",
  "ยอดสุทธิ",
  "สัดส่วน (%)"
];

export default function ReportsLoading() {
  return (
    <DashboardSkeleton
      statCards={REPORTS_CARDS}
      columns={REPORTS_COLUMNS}
      searchPlaceholder="ค้นหาในรายงาน..."
      chips={["ทั้งหมด", "ค่าวัสดุ", "ค่าแรง", "ค่าบริหาร"]}
      primaryButtonLabel="พิมพ์รายงาน"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
