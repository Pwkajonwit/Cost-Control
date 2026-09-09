import { DashboardSkeleton } from "@/components/skeletons";

const BILL_FOLLOW_CARDS = [
  { title: "ทั้งหมด" },
  { title: "ตาม VAT" },
  { title: "หัก 3% บุคคล" },
  { title: "หัก 3% บริษัท" },
  { title: "บิลเครดิต" },
];

const BILL_FOLLOW_COLUMNS = [
  "ลำดับ",
  "ว/ด/ป",
  "ID Project",
  "ชื่อ Project",
  "ร้าน/บุคคล",
  "สินค้า/ทำงาน",
  "ยอดเงิน",
  "ยอดโอน",
  "เงื่อนไข",
  "ผู้เบิก",
  "สถานะติดตาม",
  "จัดการ"
];

export default function BillFollowLoading() {
  return (
    <DashboardSkeleton
      statCards={BILL_FOLLOW_CARDS}
      columns={BILL_FOLLOW_COLUMNS}
      searchPlaceholder="ค้นหาบิล, ร้านค้า, เลขที่เอกสาร..."
      chips={["ทั้งหมด", "รอแนบบิล", "รอออก 3%", "รอจ่ายเครดิต"]}
      primaryButtonLabel="ส่งออกข้อมูล"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
