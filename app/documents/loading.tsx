import { DashboardSkeleton } from "@/components/skeletons";

const DOCUMENT_CARDS = [
  { title: "เอกสารทั้งหมด" },
  { title: "รอออก 3%" },
  { title: "รอรับบิลตัวจริง" },
  { title: "เอกสารสมบูรณ์" },
];

const DOCUMENT_COLUMNS = [
  "ลำดับ",
  "วันที่",
  "โครงการ",
  "ผู้รับเงิน / ร้านค้า",
  "ประเภทเอกสาร",
  "ยอดเงิน",
  "ภาษีหัก ณ ที่จ่าย",
  "สถานะเอกสาร",
  "จัดการ"
];

export default function DocumentsLoading() {
  return (
    <DashboardSkeleton
      statCards={DOCUMENT_CARDS}
      columns={DOCUMENT_COLUMNS}
      searchPlaceholder="ค้นหาเอกสาร, โครงการ, ร้านค้า..."
      chips={["ทั้งหมด", "หัก 3%", "บิล VAT", "บิลทั่วไป"]}
      primaryButtonLabel="สร้างเอกสาร"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
