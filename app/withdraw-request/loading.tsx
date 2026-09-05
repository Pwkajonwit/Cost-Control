import { DashboardSkeleton } from "@/components/skeletons";

const WITHDRAW_CARDS = [
  { title: "รายการรอตั้งเบิก" },
  { title: "ยอดเงินรวม" },
  { title: "อนุมัติแล้ว" },
];

const WITHDRAW_COLUMNS = [
  "ลำดับ",
  "ID Project",
  "ชื่อ Project",
  "ร้าน/บุคคล",
  "สินค้า/ทำงาน",
  "บิล",
  "ประเภท",
  "ยอดเงิน",
  "ยอดโอน",
  "ผู้เบิก",
  "ว/ด/ป",
  "จัดการ"
];

export default function WithdrawRequestLoading() {
  return (
    <DashboardSkeleton
      statCards={WITHDRAW_CARDS}
      columns={WITHDRAW_COLUMNS}
      searchPlaceholder="ค้นหารายการ, ผู้เบิก, โครงการ..."
      chips={["ทั้งหมด", "รอตั้งเบิก", "ตั้งเบิกแล้ว", "อนุมัติแล้ว"]}
      primaryButtonLabel="ขอเบิกเงิน"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
