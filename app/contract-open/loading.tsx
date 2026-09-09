import { DashboardSkeleton } from "@/components/skeletons";

const CONTRACT_CARDS = [
  { title: "สัญญาจ้างทั้งหมด" },
  { title: "ยอดรวมสัญญา" },
  { title: "จ่ายแล้ว" },
];

const CONTRACT_COLUMNS = [
  "ลำดับ",
  "ID Project",
  "ชื่อ Project",
  "ผู้รับเหมา",
  "รายการจ้าง",
  "ยอดสัญญา",
  "จ่ายแล้ว",
  "คงเหลือ",
  "สถานะ",
  "จัดการ"
];

export default function ContractOpenLoading() {
  return (
    <DashboardSkeleton
      statCards={CONTRACT_CARDS}
      columns={CONTRACT_COLUMNS}
      searchPlaceholder="ค้นหาสัญญา, ผู้รับเหมา, โครงการ..."
      chips={["ทั้งหมด", "รอเปิดสัญญา", "กำลังดำเนินการ", "เสร็จสิ้น"]}
      primaryButtonLabel="เปิดสัญญาจ้าง"
      loadingMessage="กำลังโหลดข้อมูล..."
    />
  );
}
