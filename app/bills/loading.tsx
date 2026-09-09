import { DashboardSkeleton } from "@/components/skeletons";

const BILL_CARDS = [
  { title: "รายการบิลทั้งหมด" },
  { title: "รวมยอดเงินบิล" },
  { title: "ยอดอนุมัติ/เบิกแล้ว" },
  { title: "ยอดรออนุมัติ" },
];

const BILL_COLUMNS = [
  "ลำดับ",
  "ID Project",
  "ชื่อ Project",
  "รูปถ่ายบิล",
  "ร้าน/บุคคล",
  "สินค้า/ทำงาน",
  "บิล",
  "ประเภท",
  "ยอดเงิน",
  "เงื่อนไข",
  "ผู้เบิก",
  "ว/ด/ป",
  "สถานะ"
];

export default function BillsLoading() {
  return (
    <DashboardSkeleton
      statCards={BILL_CARDS}
      columns={BILL_COLUMNS}
      searchPlaceholder="ค้นหา Project, ร้านค้า, รายการ..."
      chips={["ทั้งหมด", "รออนุมัติ", "อนุมัติแล้ว", "เบิกแล้ว"]}
      primaryButtonLabel="เพิ่มบิล"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
