import { supabaseAdmin } from "@/lib/supabase-admin";
export { supabaseAdmin };
import { normalizeDateToIso } from "@/lib/dates";
import { cached, clearCache } from "@/lib/cache";

export type SheetRow = Record<string, any>;

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && !url.includes("placeholder") && key && !key.includes("placeholder"));
}

function hasValue(val: unknown) {
  return val !== null && val !== undefined && String(val).trim() !== "";
}

function toNumber(val: unknown) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const num = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

const TABLE_MAP: Record<string, string> = {
  Data: "bills",
  data: "bills",
  bills: "bills",
  Project: "projects",
  project: "projects",
  projects: "projects",
  ร้านค้า: "stores",
  store: "stores",
  stores: "stores",
  รับเหมา: "contractors",
  contractor: "contractors",
  contractors: "contractors",
  งานรับเหมา: "contract_works",
  Contract_work: "contract_works",
  Contract_Work: "contract_works",
  contract_work: "contract_works",
  ContractWork: "contract_works",
  CONTRACT_WORK: "contract_works",
  contractWork: "contract_works",
  contractwork: "contract_works",
  contract_works: "contract_works",
  Tasks: "tasks",
  Works: "works",
  Plan: "plans",
  "Master Member": "master_members",
  รายชื่อ: "master_members",
  PEOPLE: "master_members",
  people: "master_members",
  master_members: "master_members",
  ธนาคาร: "banks",
  BANK: "banks",
  bank: "banks",
  banks: "banks",
  ทะเบียน: "cars",
  CAR: "cars",
  car: "cars",
  cars: "cars",
  ประเภท: "categories",
  CATEGORY: "categories",
  category: "categories",
  categories: "categories",
  ลูกค้า: "customers",
  CUSTOMER: "customers",
  customer: "customers",
  customers: "customers",
  บริษัท: "companies",
  COMPANY: "companies",
  company: "companies",
  companies: "companies",
  ยืมเงิน: "loans",
  LOAN: "loans",
  loan: "loans",
  loans: "loans",
  เบิกเงิน: "bills",
  WITHDRAW: "bills",
  ตัวเลือกระบบ: "system_options",
  ระบบLog: "audit_logs",
  สินค้า: "products",
  PRODUCT: "products",
  product: "products",
  products: "products",
  "ประเภทสินค้า": "products"
};

export function getDbTableName(tableName: string): string {
  if (!tableName) return "";
  if (TABLE_MAP[tableName]) return TABLE_MAP[tableName];
  const normalized = tableName.trim().toLowerCase().replace(/[-_]/g, "");
  if (normalized === "contractwork" || normalized === "contractworks" || normalized === "conwork" || tableName === "งานรับเหมา") {
    return "contract_works";
  }
  if (normalized === "data" || normalized === "bills" || normalized === "bill") {
    return "bills";
  }
  if (normalized === "project" || normalized === "projects") {
    return "projects";
  }
  if (normalized === "store" || normalized === "stores" || tableName === "ร้านค้า") {
    return "stores";
  }
  if (normalized === "contractor" || normalized === "contractors" || tableName === "รับเหมา") {
    return "contractors";
  }
  if (normalized === "people" || normalized === "mastermember" || normalized === "mastermembers" || tableName === "รายชื่อ") {
    return "master_members";
  }
  if (normalized === "bank" || normalized === "banks" || tableName === "ธนาคาร") {
    return "banks";
  }
  if (normalized === "car" || normalized === "cars" || tableName === "ทะเบียน") {
    return "cars";
  }
  if (normalized === "category" || normalized === "categories" || tableName === "ประเภท") {
    return "categories";
  }
  if (normalized === "customer" || normalized === "customers" || tableName === "ลูกค้า") {
    return "customers";
  }
  if (normalized === "company" || normalized === "companies" || tableName === "บริษัท") {
    return "companies";
  }
  if (normalized === "loan" || normalized === "loans" || tableName === "ยืมเงิน") {
    return "loans";
  }
  if (normalized === "product" || normalized === "products" || tableName === "สินค้า" || tableName === "ประเภทสินค้า") {
    return "products";
  }
  return TABLE_MAP[tableName] || tableName.toLowerCase();
}

export const DEFAULT_PRODUCT_CATEGORIES: SheetRow[] = [
  { _sheetRow: 1, id_product: "1", รหัสสินค้า: "1", ชื่อประเภทสินค้า: "เหล็กเส้น", หมายเหตุ: "" },
  { _sheetRow: 2, id_product: "2", รหัสสินค้า: "2", ชื่อประเภทสินค้า: "รูปพรรณ", หมายเหตุ: "" },
  { _sheetRow: 3, id_product: "3", รหัสสินค้า: "3", ชื่อประเภทสินค้า: "คอนกรีต", หมายเหตุ: "" },
  { _sheetRow: 4, id_product: "4", รหัสสินค้า: "4", ชื่อประเภทสินค้า: "ไม้แบบ", หมายเหตุ: "" },
  { _sheetRow: 5, id_product: "5", รหัสสินค้า: "5", ชื่อประเภทสินค้า: "วัสดุมุง", หมายเหตุ: "" },
  { _sheetRow: 6, id_product: "6", รหัสสินค้า: "6", ชื่อประเภทสินค้า: "ฝ้าผนัง", หมายเหตุ: "" },
  { _sheetRow: 7, id_product: "7", รหัสสินค้า: "7", ชื่อประเภทสินค้า: "ปูพื้น", หมายเหตุ: "" },
  { _sheetRow: 8, id_product: "8", รหัสสินค้า: "8", ชื่อประเภทสินค้า: "กระจก", หมายเหตุ: "" },
  { _sheetRow: 9, id_product: "9", รหัสสินค้า: "9", ชื่อประเภทสินค้า: "ไฟฟ้า", หมายเหตุ: "" },
  { _sheetRow: 10, id_product: "10", รหัสสินค้า: "10", ชื่อประเภทสินค้า: "ประปา", หมายเหตุ: "" },
  { _sheetRow: 11, id_product: "11", รหัสสินค้า: "11", ชื่อประเภทสินค้า: "อื่นๆ", หมายเหตุ: "" },
  { _sheetRow: 12, id_product: "12", รหัสสินค้า: "12", ชื่อประเภทสินค้า: "สีเคมี", หมายเหตุ: "" },
  { _sheetRow: 13, id_product: "13", รหัสสินค้า: "13", ชื่อประเภทสินค้า: "สุขภัณฑ์", หมายเหตุ: "" },
  { _sheetRow: 14, id_product: "14", รหัสสินค้า: "14", ชื่อประเภทสินค้า: "นั่งร้าน", หมายเหตุ: "" },
  { _sheetRow: 15, id_product: "15", รหัสสินค้า: "15", ชื่อประเภทสินค้า: "แอร์", หมายเหตุ: "" },
  { _sheetRow: 16, id_product: "16", รหัสสินค้า: "16", ชื่อประเภทสินค้า: "ดิน", หมายเหตุ: "" },
  { _sheetRow: 17, id_product: "17", รหัสสินค้า: "17", ชื่อประเภทสินค้า: "หินทราย", หมายเหตุ: "" },
  { _sheetRow: 18, id_product: "18", รหัสสินค้า: "18", ชื่อประเภทสินค้า: "เตรียมงาน", หมายเหตุ: "" },
  { _sheetRow: 19, id_product: "101", รหัสสินค้า: "101", ชื่อประเภทสินค้า: "น้ำมัน", หมายเหตุ: "" },
  { _sheetRow: 20, id_product: "102", รหัสสินค้า: "102", ชื่อประเภทสินค้า: "ค่าขนส่ง", หมายเหตุ: "" },
  { _sheetRow: 21, id_product: "103", รหัสสินค้า: "103", ชื่อประเภทสินค้า: "เครื่องจักร", หมายเหตุ: "" },
  { _sheetRow: 22, id_product: "200", รหัสสินค้า: "200", ชื่อประเภทสินค้า: "ดำเนินการ(อื่นๆ)", หมายเหตุ: "" },
  { _sheetRow: 23, id_product: "non", รหัสสินค้า: "non", ชื่อประเภทสินค้า: "non (7.เครื่องมือ 8.อื่นๆ ที่พัก)", หมายเหตุ: "" }
];

export function mapSupabaseRowToSheetRow(dbTable: string, row: Record<string, any>, idx: number = 0): SheetRow {
  if (!row) return {};
  const dataObj = (row.data && typeof row.data === "object") ? row.data : {};
  const res: SheetRow = { ...dataObj, ...row };

  if (dbTable === "bills") {
    res["ลำดับ"] = row.id ?? row["ลำดับ"] ?? dataObj["ลำดับ"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ID Project"] = row.project_id ?? row["ID Project"] ?? dataObj["ID Project"];
    res["ชื่อ Project"] = row.project_name ?? row["ชื่อ Project"] ?? dataObj["ชื่อ Project"];
    res["ร้าน/บุคคล"] = row.vendor_or_person ?? row["ร้าน/บุคคล"] ?? dataObj["ร้าน/บุคคล"];
    res["สินค้า/ทำงาน"] = row.description ?? row["สินค้า/ทำงาน"] ?? dataObj["สินค้า/ทำงาน"];
    res["บิล"] = row.bill_no ?? row["บิล"] ?? dataObj["บิล"];
    res["ประเภท"] = row.category ?? row["ประเภท"] ?? dataObj["ประเภท"];
    res["ยอดเงิน"] = row.amount ?? row["ยอดเงิน"] ?? dataObj["ยอดเงิน"];
    res["vat"] = row.vat_amount ?? row["vat"] ?? dataObj["vat"];
    res["หัก"] = row.withholding_tax ?? row["หัก"] ?? dataObj["หัก"];
    res["เครดิต"] = row.credit_days ?? row["เครดิต"] ?? dataObj["เครดิต"];
    res["ผู้เบิก"] = row.requester ?? row["ผู้เบิก"] ?? dataObj["ผู้เบิก"];
    res["ผู้สร้างบิล"] = row.created_by ?? row["ผู้สร้างบิล"] ?? dataObj["ผู้สร้างบิล"] ?? dataObj["ผู้บันทึก"] ?? "";
    res["created_by"] = res["ผู้สร้างบิล"];
    res["รูปถ่ายบิล"] = row.image_url ?? row["รูปถ่ายบิล"] ?? dataObj["รูปถ่ายบิล"];
    res["สถานะ"] = row.status ?? row["สถานะ"] ?? dataObj["สถานะ"];
    res["ว/ด/ป"] = row.bill_date ? String(row.bill_date) : row["ว/ด/ป"] ?? dataObj["ว/ด/ป"] ?? (row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : "");

    res["ค่าของ"] = row.material_cost ?? row["ค่าของ"] ?? dataObj["ค่าของ"] ?? "";
    res["ค่าแรง"] = row.labor_cost ?? row["ค่าแรง"] ?? dataObj["ค่าแรง"] ?? "";
    res["พนักงาน"] = row.staff_cost ?? row["พนักงาน"] ?? dataObj["พนักงาน"] ?? "";
    res["น้ำมัน"] = row.fuel_cost ?? row["น้ำมัน"] ?? dataObj["น้ำมัน"] ?? "";
    res["ซ่อมรถ"] = row.repair_cost ?? row["ซ่อมรถ"] ?? dataObj["ซ่อมรถ"] ?? "";
    res["เครื่องจักร"] = row.machine_cost ?? row["เครื่องจักร"] ?? dataObj["เครื่องจักร"] ?? "";
    res["เครื่องมือ"] = row.tool_cost ?? row["เครื่องมือ"] ?? dataObj["เครื่องมือ"] ?? "";
    res["อื่นๆ"] = row.other_cost ?? row["อื่นๆ"] ?? dataObj["อื่นๆ"] ?? "";
    res["statusค่าแรง"] = row.labor_status ?? row.status_labor ?? row["statusค่าแรง"] ?? dataObj["statusค่าแรง"] ?? "";
    res["ยอดโอน"] = row.transfer_amount ?? row["ยอดโอน"] ?? dataObj["ยอดโอน"] ?? "";
    res["วันได้บิล"] = row.bill_received_date ?? row["วันได้บิล"] ?? dataObj["วันได้บิล"] ?? "";
    res["วันออก 3%"] = row.wht_issued_date ?? row["วันออก 3%"] ?? dataObj["วันออก 3%"] ?? "";
    res["วันจ่าย"] = row.paid_date ?? row["วันจ่าย"] ?? dataObj["วันจ่าย"] ?? "";

    res["ร้านค้า"] = row.store_id ?? row["ร้านค้า"] ?? dataObj["ร้านค้า"] ?? "";
    res["ผู้รับเหมา"] = row.contractor_id ?? row["ผู้รับเหมา"] ?? dataObj["ผู้รับเหมา"] ?? "";
    res["ร้านค้า/ผู้รับเหมา"] = row.vendor_type ?? row["ร้านค้า/ผู้รับเหมา"] ?? dataObj["ร้านค้า/ผู้รับเหมา"] ?? "";
    res["สินค้า"] = row.product ?? row["สินค้า"] ?? dataObj["สินค้า"] ?? "";
    res["รายละเอียดงาน"] = row.work_details ?? row["รายละเอียดงาน"] ?? dataObj["รายละเอียดงาน"] ?? "";
  } else if (dbTable === "projects") {
    res["ID Project"] = row.id ?? row["ID Project"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่อ Project"] = row.name ?? row["ชื่อ Project"];
    res["ชื่อลูกค้า"] = row.customer_name ?? row["ชื่อลูกค้า"];
    res["สถานที่"] = row.location ?? row.place ?? row["สถานที่"];
    res["ยอดงาน"] = row.work_amount ?? row["ยอดงาน"];
    res["งบไม่เกิน"] = row.budget ?? row["งบไม่เกิน"];
    res["ยอดรวม vat"] = row.vat_total ?? row["ยอดรวม vat"];
    res["วันที่"] = row.start_date ? String(row.start_date) : (row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : "");
    res["color"] = row.color ?? row["color"];
    res["บริษัท"] = row.company ?? row["บริษัท"];
    res["รับผิดชอบ"] = row.responsible_person ?? row["รับผิดชอบ"];
  } else if (dbTable === "stores") {
    res["id_store"] = row.id ?? row["id_store"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่อร้านค้า"] = row.name ?? row["ชื่อร้านค้า"];
    res["ชื่อเต็ม"] = row.full_name ?? row["ชื่อเต็ม"];
    res["เลขบัญชี"] = row.bank_account ?? row["เลขบัญชี"];
    res["ธนาคาร"] = row.bank_name ?? row.bank ?? row["ธนาคาร"];
    res["เบอร์โทร"] = row.phone ?? row["เบอร์โทร"];
    res["ที่อยู่"] = row.address ?? row["ที่อยู่"];
    res["เลขที่ผู้เสียภาษี"] = row.tax_id ?? row["เลขที่ผู้เสียภาษี"];
  } else if (dbTable === "contractors") {
    res["id_Contractor"] = row.id ?? row["id_Contractor"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่อเล่น"] = row.nickname ?? row["ชื่อเล่น"];
    res["ชื่อ-นามสกุล"] = row.full_name ?? row["ชื่อ-นามสกุล"];
    res["เลขบัญชี"] = row.bank_account ?? row["เลขบัญชี"];
    res["ธนาคาร"] = row.bank_name ?? row.bank ?? row["ธนาคาร"];
    res["บัตรประจำตัวประชาชน"] = row.id_card ?? row["บัตรประจำตัวประชาชน"];
    res["เบอร์โทรศัพท์"] = row.phone ?? row["เบอร์โทรศัพท์"];
    res["ที่อยู่"] = row.address ?? row["ที่อยู่"];
    res["จำกัดยอด/ปี"] = row.annual_limit ?? row["จำกัดยอด/ปี"];
  } else if (dbTable === "contract_works") {
    res["id_Conwork"] = row.id ?? row["id_Conwork"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["id_Contractor"] = row.contractor_id ?? row["id_Contractor"];
    res["ID Project"] = row.project_id ?? row["ID Project"];
    res["ชื่อ Project"] = row.project_name ?? row["ชื่อ Project"];
    res["ยอดเงินจ้าง"] = row.total_contract_amount ?? row["ยอดเงินจ้าง"];
    res["รายละเอียดงาน"] = row.work_details ?? row["รายละเอียดงาน"];
    res["เบอร์โทรศัพท์"] = row.phone ?? row["เบอร์โทรศัพท์"];
    res["ยอดเงินจ่าย"] = row.paid_amount ?? row["ยอดเงินจ่าย"];
  } else if (dbTable === "master_members") {
    res["รหัสพนักงาน"] = row.id ?? row["รหัสพนักงาน"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่อเล่น"] = row.nickname ?? row["ชื่อเล่น"];
    res["ชื่อ-นามสกุล"] = row.full_name ?? row["ชื่อ-นามสกุล"];
    res["เลขบัญชี"] = row.bank_account ?? row["เลขบัญชี"];
    res["ธนาคาร"] = row.bank_name ?? row.bank ?? row["ธนาคาร"];
    res["เบอร์โทร"] = row.phone ?? row["เบอร์โทร"];
    res["ที่อยู่"] = row.address ?? row["ที่อยู่"];
    res["เลขที่บัตรประชาชน"] = row.id_card ?? row["เลขที่บัตรประชาชน"];
    res["สิทธิ์การใช้งาน"] = row.role ?? row["สิทธิ์การใช้งาน"];
  } else if (dbTable === "banks") {
    res["id_bank"] = row.id ?? row["id_bank"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่อธนาคาร"] = row.name ?? row["ชื่อธนาคาร"];
    res["image"] = row.image ?? row.image_url ?? row["image"];
    res["รูปภาพ"] = row.image ?? row.image_url ?? row["รูปภาพ"];
  } else if (dbTable === "cars") {
    res["id_car"] = row.id ?? row["id_car"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["หมายเลขทะเบียน"] = row.plate_no ?? row["หมายเลขทะเบียน"];
    res["ยี่ห้อรถ"] = row.brand ?? row["ยี่ห้อรถ"];
    res["สี"] = row.color ?? row["สี"];
    res["รับผิดชอบ"] = row.responsible_person ?? row["รับผิดชอบ"];
    res["รถของ"] = row.owner ?? row["รถของ"];
  } else if (dbTable === "customers") {
    res["id_cus"] = row.id ?? row["id_cus"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่อลูกค้า"] = row.name ?? row["ชื่อลูกค้า"];
    res["ที่อยู่"] = row.address ?? row["ที่อยู่"];
    res["เลขที่ผู้เสียภาษี"] = row.tax_id ?? row["เลขที่ผู้เสียภาษี"];
    delete res.name;
    delete res.address;
    delete res.tax_id;
  } else if (dbTable === "companies") {
    res["id_Company"] = row.id ?? row["id_Company"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่ออังกฤษ"] = row.name_en ?? row["ชื่ออังกฤษ"];
    res["ชื่อบริษัท"] = row.name_th ?? row["ชื่อบริษัท"];
    res["สำนักงาน"] = row.branch ?? row["สำนักงาน"];
    res["ที่อยู่"] = row.address ?? row["ที่อยู่"];
    res["เลขที่สียภาษี "] = row.tax_id ?? row["เลขที่สียภาษี "];
    res["เบอร์โทร"] = row.phone ?? row["เบอร์โทร"];
  } else if (dbTable === "loans") {
    res["id"] = row.id ?? row["id"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ชื่อ"] = row.borrower_name ?? row["ชื่อ"];
    res["type"] = row.type ?? row["type"];
    res["จำนวนเงิน"] = row.amount ?? row["จำนวนเงิน"];
  } else if (dbTable === "categories") {
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["ประเภท Name1"] = row.name1 ?? row.contractor_type ?? row["ประเภท Name1"];
    res["ประเภท Name2"] = row.name2 ?? row.store_type ?? row["ประเภท Name2"];
    res["ประเภท Name3"] = row.name3 ?? row.store_item_type ?? row["ประเภท Name3"];
  } else if (dbTable === "products") {
    res["id_product"] = row.id ?? row["id_product"];
    res["_sheetRow"] = row.id ?? row._sheetRow;
    res["รหัสสินค้า"] = row.code ?? row["รหัสสินค้า"];
    res["ชื่อประเภทสินค้า"] = row.name ?? row["ชื่อประเภทสินค้า"];
    res["หมายเหตุ"] = row.note ?? row["หมายเหตุ"];
  }

  const sheetRowVal = Number(res["_sheetRow"] ?? row._sheetRow ?? row.id);
  if (Number.isInteger(sheetRowVal) && sheetRowVal >= 1) {
    res["_sheetRow"] = sheetRowVal;
  } else {
    res["_sheetRow"] = idx + 2;
  }

  return res;
}

export function mapSheetRowToSupabaseRow(tableName: string, row: Record<string, any>): Record<string, any> {
  const dbTable = getDbTableName(tableName);
  const dbRow: Record<string, any> = {};

  if (dbTable === "bills") {
    const rawId = row["ลำดับ"] ?? row.id;
    if (hasValue(rawId)) {
      const numId = Number(rawId);
      if (Number.isFinite(numId)) dbRow.id = numId;
    }

    const rawProjectId = row["ID Project"] ?? row.project_id;
    if (hasValue(rawProjectId)) dbRow.project_id = String(rawProjectId).trim();

    const rawProjectName = row["ชื่อ Project"] ?? row.project_name;
    if (hasValue(rawProjectName)) dbRow.project_name = String(rawProjectName).trim();

    const rawVendor = row["ร้าน/บุคคล"] ?? row.vendor_or_person;
    if (hasValue(rawVendor)) dbRow.vendor_or_person = String(rawVendor).trim();

    const rawDesc = row["สินค้า/ทำงาน"] ?? row.description;
    if (hasValue(rawDesc)) dbRow.description = String(rawDesc).trim();

    const rawBillNo = row["บิล"] ?? row.bill_no;
    if (hasValue(rawBillNo)) dbRow.bill_no = String(rawBillNo).trim();

    const rawCategory = row["ประเภท"] ?? row.category;
    if (hasValue(rawCategory)) dbRow.category = String(rawCategory).trim();

    const rawAmount = row["ยอดเงิน"] ?? row.amount;
    if (hasValue(rawAmount)) dbRow.amount = toNumber(rawAmount);

    const rawVat = row["vat"] ?? row.vat_amount;
    if (hasValue(rawVat)) dbRow.vat_amount = String(rawVat).trim();

    const rawDeduct = row["หัก"] ?? row.withholding_tax;
    if (hasValue(rawDeduct)) dbRow.withholding_tax = String(rawDeduct).trim();

    const rawCredit = row["เครดิต"] ?? row.credit_days;
    if (hasValue(rawCredit)) dbRow.credit_days = String(rawCredit).trim();

    const rawRequester = row["ผู้เบิก"] ?? row.requester;
    if (hasValue(rawRequester)) dbRow.requester = String(rawRequester).trim();

    const rawCreatedBy = row["ผู้สร้างบิล"] ?? row.created_by ?? row["ผู้บันทึก"];
    if (hasValue(rawCreatedBy)) {
      dbRow.created_by = String(rawCreatedBy).trim();
      dbRow["ผู้สร้างบิล"] = String(rawCreatedBy).trim();
    }

    const rawImage = row["รูปถ่ายบิล"] ?? row.image_url;
    if (hasValue(rawImage)) dbRow.image_url = String(rawImage).trim();

    const rawStatus = row["สถานะ"] ?? row.status;
    if (hasValue(rawStatus)) dbRow.status = String(rawStatus).trim();

    const rawDate = row["ว/ด/ป"] ?? row.bill_date;
    if (hasValue(rawDate)) dbRow.bill_date = normalizeDateToIso(rawDate);

    const rawBillReceived = row["วันได้บิล"] ?? row.bill_received_date;
    if (hasValue(rawBillReceived)) {
      const iso = normalizeDateToIso(rawBillReceived) || String(rawBillReceived).trim();
      dbRow.bill_received_date = iso;
      dbRow["วันได้บิล"] = iso;
    }

    const rawWhtIssued = row["วันออก 3%"] ?? row.wht_issued_date;
    if (hasValue(rawWhtIssued)) {
      const iso = normalizeDateToIso(rawWhtIssued) || String(rawWhtIssued).trim();
      dbRow.wht_issued_date = iso;
      dbRow["วันออก 3%"] = iso;
    }

    const rawPaidDate = row["วันจ่าย"] ?? row.paid_date;
    if (hasValue(rawPaidDate)) {
      const iso = normalizeDateToIso(rawPaidDate) || String(rawPaidDate).trim();
      dbRow.paid_date = iso;
      dbRow["วันจ่าย"] = iso;
    }

    if (hasValue(row["ค่าของ"] ?? row.material_cost)) dbRow.material_cost = toNumber(row["ค่าของ"] ?? row.material_cost);
    if (hasValue(row["ค่าแรง"] ?? row.labor_cost)) dbRow.labor_cost = toNumber(row["ค่าแรง"] ?? row.labor_cost);
    if (hasValue(row["พนักงาน"] ?? row.staff_cost)) dbRow.staff_cost = toNumber(row["พนักงาน"] ?? row.staff_cost);
    if (hasValue(row["น้ำมัน"] ?? row.fuel_cost)) dbRow.fuel_cost = toNumber(row["น้ำมัน"] ?? row.fuel_cost);
    if (hasValue(row["ซ่อมรถ"] ?? row.repair_cost)) dbRow.repair_cost = toNumber(row["ซ่อมรถ"] ?? row.repair_cost);
    if (hasValue(row["เครื่องจักร"] ?? row.machine_cost)) dbRow.machine_cost = toNumber(row["เครื่องจักร"] ?? row.machine_cost);
    if (hasValue(row["เครื่องมือ"] ?? row.tool_cost)) dbRow.tool_cost = toNumber(row["เครื่องมือ"] ?? row.tool_cost);
    if (hasValue(row["อื่นๆ"] ?? row.other_cost)) dbRow.other_cost = toNumber(row["อื่นๆ"] ?? row.other_cost);
    if (hasValue(row["statusค่าแรง"] ?? row.labor_status)) dbRow.labor_status = String(row["statusค่าแรง"] ?? row.labor_status).trim();
    if (hasValue(row["ยอดโอน"] ?? row.transfer_amount)) dbRow.transfer_amount = toNumber(row["ยอดโอน"] ?? row.transfer_amount);

    if (hasValue(row["ร้านค้า"] ?? row.store_id)) dbRow.store_id = String(row["ร้านค้า"] ?? row.store_id).trim();
    if (hasValue(row["ผู้รับเหมา"] ?? row.contractor_id)) dbRow.contractor_id = String(row["ผู้รับเหมา"] ?? row.contractor_id).trim();
    if (hasValue(row["ร้านค้า/ผู้รับเหมา"] ?? row.vendor_type)) dbRow.vendor_type = String(row["ร้านค้า/ผู้รับเหมา"] ?? row.vendor_type).trim();
    if (hasValue(row["สินค้า"] ?? row.product)) dbRow.product = String(row["สินค้า"] ?? row.product).trim();
    if (hasValue(row["รายละเอียดงาน"] ?? row.work_details)) dbRow.work_details = String(row["รายละเอียดงาน"] ?? row.work_details).trim();
  } else if (dbTable === "projects") {
    if (row["ID Project"] !== undefined) dbRow.id = row["ID Project"];
    if (row["ชื่อ Project"] !== undefined) dbRow.name = row["ชื่อ Project"];
    if (row["ชื่อลูกค้า"] !== undefined) dbRow.customer_name = row["ชื่อลูกค้า"];
    if (row["สถานที่"] !== undefined) dbRow.location = row["สถานที่"];
    if (row["ยอดงาน"] !== undefined) dbRow.work_amount = row["ยอดงาน"];
    if (row["งบไม่เกิน"] !== undefined) dbRow.budget = row["งบไม่เกิน"];
    if (row["ยอดรวม vat"] !== undefined) dbRow.vat_total = row["ยอดรวม vat"];
    if (row["วันที่"] !== undefined) dbRow.start_date = row["วันที่"] || null;
    if (row["color"] !== undefined) dbRow.color = row["color"];
    if (row["บริษัท"] !== undefined) dbRow.company = row["บริษัท"];
    if (row["รับผิดชอบ"] !== undefined) dbRow.responsible_person = row["รับผิดชอบ"];
  } else if (dbTable === "stores") {
    if (row["id_store"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["id_store"] ?? row["id"];
    }
    if (row["ชื่อร้านค้า"] !== undefined) dbRow.name = row["ชื่อร้านค้า"];
    if (row["ชื่อเต็ม"] !== undefined) dbRow.full_name = row["ชื่อเต็ม"];
    if (row["เลขบัญชี"] !== undefined) dbRow.bank_account = row["เลขบัญชี"];
    if (row["ธนาคาร"] !== undefined) dbRow.bank_name = row["ธนาคาร"];
    if (row["เบอร์โทร"] !== undefined) dbRow.phone = row["เบอร์โทร"];
    if (row["ที่อยู่"] !== undefined) dbRow.address = row["ที่อยู่"];
    if (row["เลขที่ผู้เสียภาษี"] !== undefined) dbRow.tax_id = row["เลขที่ผู้เสียภาษี"];
  } else if (dbTable === "contractors") {
    if (row["id_Contractor"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["id_Contractor"] ?? row["id"];
    }
    if (row["ชื่อเล่น"] !== undefined) dbRow.nickname = row["ชื่อเล่น"];
    if (row["ชื่อ-นามสกุล"] !== undefined) dbRow.full_name = row["ชื่อ-นามสกุล"];
    if (row["เลขบัญชี"] !== undefined) dbRow.bank_account = row["เลขบัญชี"];
    if (row["ธนาคาร"] !== undefined) dbRow.bank_name = row["ธนาคาร"];
    if (row["บัตรประจำตัวประชาชน"] !== undefined) dbRow.id_card = row["บัตรประจำตัวประชาชน"];
    if (row["เบอร์โทรศัพท์"] !== undefined) dbRow.phone = row["เบอร์โทรศัพท์"];
    if (row["ที่อยู่"] !== undefined) dbRow.address = row["ที่อยู่"];
    if (row["จำกัดยอด/ปี"] !== undefined) dbRow.annual_limit = row["จำกัดยอด/ปี"];
  } else if (dbTable === "banks") {
    if (row["id_bank"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["id_bank"] ?? row["id"];
    }
    if (row["ชื่อธนาคาร"] !== undefined) dbRow.name = row["ชื่อธนาคาร"];
    if (row["image"] !== undefined || row["รูปภาพ"] !== undefined || row["image_url"] !== undefined) {
      dbRow.image = row["image"] ?? row["รูปภาพ"] ?? row["image_url"];
    }
  } else if (dbTable === "cars") {
    if (row["id_car"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["id_car"] ?? row["id"];
    }
    if (row["หมายเลขทะเบียน"] !== undefined) dbRow.plate_no = row["หมายเลขทะเบียน"];
    if (row["ยี่ห้อรถ"] !== undefined) dbRow.brand = row["ยี่ห้อรถ"];
    if (row["สี"] !== undefined) dbRow.color = row["สี"];
    if (row["รับผิดชอบ"] !== undefined) dbRow.responsible_person = row["รับผิดชอบ"];
    if (row["รถของ"] !== undefined) dbRow.owner = row["รถของ"];
  } else if (dbTable === "customers") {
    if (row["id_cus"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["id_cus"] ?? row["id"];
    }
    if (row["ชื่อลูกค้า"] !== undefined) dbRow.name = row["ชื่อลูกค้า"];
    if (row["ที่อยู่"] !== undefined) dbRow.address = row["ที่อยู่"];
    if (row["เลขที่ผู้เสียภาษี"] !== undefined) dbRow.tax_id = row["เลขที่ผู้เสียภาษี"];
  } else if (dbTable === "companies") {
    if (row["id_Company"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["id_Company"] ?? row["id"];
    }
    if (row["ชื่ออังกฤษ"] !== undefined) dbRow.name_en = row["ชื่ออังกฤษ"];
    if (row["ชื่อบริษัท"] !== undefined) dbRow.name_th = row["ชื่อบริษัท"];
    if (row["สำนักงาน"] !== undefined) dbRow.branch = row["สำนักงาน"];
    if (row["ที่อยู่"] !== undefined) dbRow.address = row["ที่อยู่"];
    if (row["เลขที่สียภาษี "] !== undefined || row["เลขที่ผู้เสียภาษี"] !== undefined) dbRow.tax_id = row["เลขที่สียภาษี "] ?? row["เลขที่ผู้เสียภาษี"];
    if (row["เบอร์โทร"] !== undefined) dbRow.phone = row["เบอร์โทร"];
  } else if (dbTable === "master_members") {
    if (row["รหัสพนักงาน"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["รหัสพนักงาน"] ?? row["id"];
    }
    if (row["ชื่อเล่น"] !== undefined) dbRow.nickname = row["ชื่อเล่น"];
    if (row["ชื่อ-นามสกุล"] !== undefined) dbRow.full_name = row["ชื่อ-นามสกุล"];
    if (row["เลขบัญชี"] !== undefined) dbRow.bank_account = row["เลขบัญชี"];
    if (row["ธนาคาร"] !== undefined) dbRow.bank_name = row["ธนาคาร"];
    if (row["เบอร์โทร"] !== undefined) dbRow.phone = row["เบอร์โทร"];
    if (row["ที่อยู่"] !== undefined) dbRow.address = row["ที่อยู่"];
    if (row["เลขที่บัตรประชาชน"] !== undefined) dbRow.id_card = row["เลขที่บัตรประชาชน"];
    if (row["สิทธิ์การใช้งาน"] !== undefined) dbRow.role = row["สิทธิ์การใช้งาน"];
  } else if (dbTable === "contract_works") {
    if (row["id_Conwork"] !== undefined || row["id"] !== undefined) {
      dbRow.id = row["id_Conwork"] ?? row["id"];
    }
    if (row["id_Contractor"] !== undefined) dbRow.contractor_id = row["id_Contractor"];
    if (row["ID Project"] !== undefined) dbRow.project_id = row["ID Project"];
    if (row["ชื่อ Project"] !== undefined) dbRow.project_name = row["ชื่อ Project"];
    if (row["ยอดเงินจ้าง"] !== undefined) dbRow.total_contract_amount = row["ยอดเงินจ้าง"];
    if (row["รายละเอียดงาน"] !== undefined) dbRow.work_details = row["รายละเอียดงาน"];
    if (row["เบอร์โทรศัพท์"] !== undefined) dbRow.phone = row["เบอร์โทรศัพท์"];
    if (row["ยอดเงินจ่าย"] !== undefined) dbRow.paid_amount = row["ยอดเงินจ่าย"];
  } else if (dbTable === "loans") {
    if (row["id"] !== undefined) dbRow.id = row["id"];
    if (row["ชื่อ"] !== undefined) dbRow.borrower_name = row["ชื่อ"];
    if (row["type"] !== undefined) dbRow.type = row["type"];
    if (row["จำนวนเงิน"] !== undefined) dbRow.amount = row["จำนวนเงิน"];
  } else if (dbTable === "categories") {
    if (row["id"] !== undefined) dbRow.id = row["id"];
    if (row["ประเภท Name1"] !== undefined) dbRow.name1 = row["ประเภท Name1"];
    if (row["ประเภท Name2"] !== undefined) dbRow.name2 = row["ประเภท Name2"];
    if (row["ประเภท Name3"] !== undefined) dbRow.name3 = row["ประเภท Name3"];
  } else {
    Object.entries(row).forEach(([k, v]) => {
      if (!k.startsWith("_")) dbRow[k] = v;
    });
  }

  return dbRow;
}

export async function saveEntityBankOption(entityId: string, bankVal: string) {
  if (!isSupabaseConfigured() || !entityId || !bankVal) return;
  try {
    const { data } = await supabaseAdmin.from("system_options").select("*").eq("id", "entity_banks").maybeSingle();
    const existingMap = (data?.data && typeof data.data === "object") ? { ...data.data } : {};
    existingMap[String(entityId).trim()] = String(bankVal).trim();
    await supabaseAdmin.from("system_options").upsert({
      id: "entity_banks",
      data: existingMap,
      updated_at: new Date().toISOString()
    });
    clearCache("sys_opt:entity_banks");
    clearCache("sys_opt:all");
  } catch (e) {
    console.warn("Failed to persist entity bank in system_options:", e);
  }
}

export async function saveEntityBanksBatch(bankMap: Record<string, string>) {
  if (!isSupabaseConfigured() || !Object.keys(bankMap).length) return;
  try {
    const { data } = await supabaseAdmin.from("system_options").select("*").eq("id", "entity_banks").maybeSingle();
    const existing = (data?.data && typeof data.data === "object") ? { ...data.data } : {};
    for (const [k, v] of Object.entries(bankMap)) {
      if (k && v) existing[String(k).trim()] = String(v).trim();
    }
    await supabaseAdmin.from("system_options").upsert({
      id: "entity_banks",
      data: existing,
      updated_at: new Date().toISOString()
    });
    clearCache("sys_opt:entity_banks");
    clearCache("sys_opt:all");
  } catch (e) {
    console.warn("Failed to persist entity banks batch in system_options:", e);
  }
}

export async function getEntityBankMapFromSupabase(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};
  return cached("sys_opt:entity_banks", 10_000, async () => {
    try {
      const { data } = await supabaseAdmin.from("system_options").select("*").eq("id", "entity_banks").maybeSingle();
      return (data?.data && typeof data.data === "object") ? data.data : {};
    } catch (e) {
      return {};
    }
  });
}

export async function saveBillFollowDate(billId: string, patch: Record<string, any>) {
  if (!isSupabaseConfigured() || !billId) return;
  const followKeys = ["วันได้บิล", "วันออก 3%", "วันจ่าย"];
  const datesToSave: Record<string, string> = {};
  for (const k of followKeys) {
    if (patch[k]) datesToSave[k] = String(patch[k]);
  }
  if (!Object.keys(datesToSave).length) return;

  try {
    const { data } = await supabaseAdmin.from("system_options").select("*").eq("id", "bill_follow_dates").maybeSingle();
    const existingMap = (data?.data && typeof data.data === "object") ? { ...data.data } : {};
    
    const mainKey = String(billId).trim();
    if (mainKey) {
      existingMap[mainKey] = {
        ...(existingMap[mainKey] || {}),
        ...datesToSave
      };
    }

    const altSeq = String(patch["ลำดับ"] || patch.id || patch._sheetRow || "").trim();
    if (altSeq && altSeq !== mainKey) {
      existingMap[altSeq] = {
        ...(existingMap[altSeq] || {}),
        ...datesToSave
      };
    }

    await supabaseAdmin.from("system_options").upsert({
      id: "bill_follow_dates",
      data: existingMap,
      updated_at: new Date().toISOString()
    });
    clearCache("sys_opt:bill_follow_dates");
    clearCache("sys_opt:all");
  } catch (e) {
    console.warn("Failed to persist bill follow dates in system_options:", e);
  }
}

export async function getBillFollowDatesFromSupabase(): Promise<Record<string, Record<string, string>>> {
  if (!isSupabaseConfigured()) return {};
  return cached("sys_opt:bill_follow_dates", 10_000, async () => {
    try {
      const { data } = await supabaseAdmin.from("system_options").select("*").eq("id", "bill_follow_dates").maybeSingle();
      return (data?.data && typeof data.data === "object") ? data.data : {};
    } catch {
      return {};
    }
  });
}

export async function saveProjectBudgetAllocation(projectId: string, patch: Record<string, any>) {
  if (!isSupabaseConfigured() || !projectId) return;
  const budgetKeys = Object.keys(patch).filter(k => k.startsWith("งบไม่เกิน") || k === "คุมงบประเภทงาน");
  if (!budgetKeys.length) return;

  try {
    const { data } = await supabaseAdmin.from("system_options").select("*").eq("id", "project_budget_allocations").maybeSingle();
    const existingMap = (data?.data && typeof data.data === "object") ? { ...data.data } : {};

    const mainKey = String(projectId).trim();
    const currentBudgets = existingMap[mainKey] && typeof existingMap[mainKey] === "object" ? { ...existingMap[mainKey] } : {};

    for (const k of budgetKeys) {
      if (patch[k] !== undefined) {
        currentBudgets[k] = patch[k];
      }
    }
    existingMap[mainKey] = currentBudgets;

    const altKey = String(patch["ID Project"] || patch.id || "").trim();
    if (altKey && altKey !== mainKey) {
      existingMap[altKey] = currentBudgets;
    }

    await supabaseAdmin.from("system_options").upsert({
      id: "project_budget_allocations",
      data: existingMap,
      updated_at: new Date().toISOString()
    });
    clearCache("sys_opt:project_budget_allocations");
    clearCache("sys_opt:all");
  } catch (e) {
    console.warn("Failed to persist project budget allocations in system_options:", e);
  }
}

export async function getProjectBudgetAllocationsFromSupabase(): Promise<Record<string, Record<string, any>>> {
  if (!isSupabaseConfigured()) return {};
  return cached("sys_opt:project_budget_allocations", 10_000, async () => {
    try {
      const { data } = await supabaseAdmin.from("system_options").select("*").eq("id", "project_budget_allocations").maybeSingle();
      return (data?.data && typeof data.data === "object") ? data.data : {};
    } catch {
      return {};
    }
  });
}

export async function updateRowInSupabase(tableName: string, keyColumn: string, keyValue: any, patch: Record<string, any>) {
  if (!isSupabaseConfigured()) return null;

  const dbTable = getDbTableName(tableName);
  const dbPatch = mapSheetRowToSupabaseRow(tableName, patch);
  delete dbPatch._sheetRow;
  delete dbPatch.id;

  const rawVal = patch.id ?? patch[keyColumn] ?? patch["id_bank"] ?? patch["id_store"] ?? patch["id_Contractor"] ?? patch["id_Conwork"] ?? patch["id_cus"] ?? patch["id_Company"] ?? patch["id_car"] ?? keyValue;
  const numId = Number(rawVal);
  const primaryVal = Number.isFinite(numId) && String(rawVal).trim() !== "" ? numId : rawVal;

  const bankVal = patch["ธนาคาร"] || patch["bank_name"];
  if (bankVal && primaryVal) {
    saveEntityBankOption(String(primaryVal), String(bankVal));
  }

  const followKeys = ["วันได้บิล", "วันออก 3%", "วันจ่าย"];
  if (followKeys.some(k => k in patch)) {
    const targetBillId = String(patch["ลำดับ"] ?? patch.id ?? primaryVal ?? keyValue);
    await saveBillFollowDate(targetBillId, patch);
  }

  if (dbTable === "projects" || tableName === "Project" || tableName === "PROJECT") {
    const targetProjId = String(patch["ID Project"] ?? patch.id ?? primaryVal ?? keyValue);
    await saveProjectBudgetAllocation(targetProjId, patch);
  }

  await syncCustomOptionsFromRow(patch);

  try {
    const { data: currentRecord } = await supabaseAdmin.from(dbTable).select("data").eq("id", primaryVal).maybeSingle();
    const existingData = (currentRecord && currentRecord.data && typeof currentRecord.data === "object") ? currentRecord.data : {};
    dbPatch.data = { ...existingData, ...patch };
  } catch {
    dbPatch.data = { ...patch };
  }

  try {
    let res = await supabaseAdmin
      .from(dbTable)
      .update(dbPatch)
      .eq("id", primaryVal)
      .select();

    if ((res.error || !res.data || res.data.length === 0) && typeof primaryVal === "number") {
      const resStr = await supabaseAdmin
        .from(dbTable)
        .update(dbPatch)
        .eq("id", String(primaryVal))
        .select();
      if (!resStr.error && resStr.data && resStr.data.length > 0) {
        res = resStr;
      }
    }

    let retries = 0;
    while (res.error && retries < 10) {
      retries++;
      if (res.error.message.includes("ALWAYS AS IDENTITY") || res.error.message.includes("identity") || res.error.message.includes("DEFAULT")) {
        delete dbPatch.id;
        res = await supabaseAdmin.from(dbTable).update(dbPatch).eq("id", primaryVal).select();
        continue;
      }
      if (res.error.message.includes("invalid input syntax")) {
        Object.keys(dbPatch).forEach(k => {
          if (dbPatch[k] === "" || dbPatch[k] === undefined) delete dbPatch[k];
        });
        res = await supabaseAdmin.from(dbTable).update(dbPatch).eq("id", primaryVal).select();
        continue;
      }
      const missingCol = extractMissingColumnName(res.error.message);
      if (missingCol) {
        const matchingKey = Object.keys(dbPatch).find(k => k === missingCol || k.startsWith(missingCol) || missingCol.startsWith(k));
        if (matchingKey) {
          delete dbPatch[matchingKey];
          res = await supabaseAdmin.from(dbTable).update(dbPatch).eq("id", primaryVal).select();
          continue;
        }
      }
      if (res.error.message.includes("bank_name") && "bank_name" in dbPatch) {
        delete dbPatch.bank_name;
        res = await supabaseAdmin.from(dbTable).update(dbPatch).eq("id", primaryVal).select();
        continue;
      }
      break;
    }

    if (res.error) {
      console.warn(`Failed to update Supabase '${dbTable}': ${res.error.message}`);
    }

    return res.data;
  } catch (err) {
    console.warn(`Exception updating Supabase '${dbTable}':`, err);
    return null;
  }
}

export async function deleteRowsFromSupabase(tableName: string, targetVals: (string | number)[]) {
  if (!isSupabaseConfigured() || !targetVals.length) return null;

  const dbTable = getDbTableName(tableName);
  try {
    const numVals = targetVals.map(v => Number(v)).filter(n => Number.isFinite(n));
    const strVals = targetVals.map(v => String(v).trim()).filter(Boolean);

    await Promise.all([
      numVals.length ? supabaseAdmin.from(dbTable).delete().in("id", numVals) : Promise.resolve(),
      strVals.length ? supabaseAdmin.from(dbTable).delete().in("id", strVals) : Promise.resolve(),
    ]);
  } catch (err) {
    console.warn(`Exception deleting batch from Supabase '${dbTable}':`, err);
  }
}

export async function deleteRowFromSupabase(tableName: string, keyColumn: string, keyValue: any, row?: Record<string, any>) {
  if (!isSupabaseConfigured()) return null;

  const dbTable = getDbTableName(tableName);
  const rawVal = row?.id ?? row?.[keyColumn] ?? row?.id_Conwork ?? row?.id_bank ?? row?.id_store ?? row?.id_Contractor ?? row?.id_cus ?? row?.id_Company ?? row?.id_car ?? keyValue;
  const numId = Number(rawVal);
  const targetVal = Number.isFinite(numId) && String(rawVal).trim() !== "" ? numId : rawVal;

  try {
    const res = await supabaseAdmin
      .from(dbTable)
      .delete()
      .eq("id", targetVal);

    if (res.error && typeof targetVal === "number") {
      await supabaseAdmin
        .from(dbTable)
        .delete()
        .eq("id", String(targetVal));
    }
  } catch (err) {
    console.warn(`Exception deleting from Supabase '${dbTable}':`, err);
  }
}

export async function getRowsFromSupabase(tableName: string, maxRows = 10_000): Promise<SheetRow[]> {
  if (!isSupabaseConfigured()) return [];

  const dbTable = getDbTableName(tableName);

  try {
    const isAscending = dbTable !== "bills";
    const rangeEnd = Math.max(0, maxRows - 1);
    const [mainResult, entityBankMap, billFollowDatesMap, projectBudgetsMap] = await Promise.all([
      supabaseAdmin.from(dbTable).select("*").order("id", { ascending: isAscending }).range(0, rangeEnd),
      (dbTable === "stores" || dbTable === "contractors" || dbTable === "master_members")
        ? getEntityBankMapFromSupabase()
        : Promise.resolve({} as Record<string, string>),
      dbTable === "bills"
        ? getBillFollowDatesFromSupabase()
        : Promise.resolve({} as Record<string, Record<string, string>>),
      dbTable === "projects"
        ? getProjectBudgetAllocationsFromSupabase()
        : Promise.resolve({} as Record<string, Record<string, any>>)
    ]);

    const { data, error } = mainResult;

    if (error) {
      console.warn(`Could not fetch rows from Supabase table '${dbTable}' (requested '${tableName}'): ${error.message}`);
    }

    const mapped = (data || []).map((row, idx) => {
      const res = mapSupabaseRowToSheetRow(dbTable, row, idx);
      const entityId = res.id_store || res.id_Contractor || res.รหัสพนักงาน || res.id;
      if ((!res["ธนาคาร"] || res["ธนาคาร"] === "-") && entityId && entityBankMap[entityId]) {
        res["ธนาคาร"] = entityBankMap[entityId];
      }

      if (dbTable === "bills") {
        const bId = String(res["ลำดับ"] || res._sheetRow || res.id || "");
        if (bId && billFollowDatesMap[bId]) {
          const dates = billFollowDatesMap[bId];
          if (dates["วันได้บิล"]) res["วันได้บิล"] = dates["วันได้บิล"];
          if (dates["วันออก 3%"]) res["วันออก 3%"] = dates["วันออก 3%"];
          if (dates["วันจ่าย"]) res["วันจ่าย"] = dates["วันจ่าย"];
        }
      }

      if (dbTable === "projects") {
        const pId = String(res["ID Project"] || res.id || res._sheetRow || "");
        if (pId && projectBudgetsMap[pId]) {
          Object.assign(res, projectBudgetsMap[pId]);
        }
      }

      return res;
    });

    if ((tableName === "ประเภท" || dbTable === "categories") && mapped.length === 0) {
      const options = await getSystemOptionsFromSupabase();
      const list1 = options["ประเภท (ผู้รับเหมา)"] || options["ประเภท_ผู้รับเหมา"] || ["2.ค่าแรง", "3.พนักงาน", "8.อื่นๆ"];
      const list2 = options["ประเภท (ร้านค้า)"] || options["ประเภท_ร้านค้า"] || ["1.ค่าของ", "4.น้ำมัน", "5.ซ่อมรถ", "6.เครื่องจักร", "7.เครื่องมือ", "8.อื่นๆ"];
      const list3 = options["ประเภท (ร้านค้า+เลือกสินค้า)"] || options["ประเภท_ร้านค้า_สินค้า"] || ["4.น้ำมัน", "5.ซ่อมรถ", "6.เครื่องจักร"];

      const maxLen = Math.max(list1.length, list2.length, list3.length);
      const generatedRows: SheetRow[] = [];
      for (let i = 0; i < maxLen; i++) {
        generatedRows.push({
          _sheetRow: i + 1,
          "ประเภท Name1": list1[i] || "",
          "ประเภท Name2": list2[i] || "",
          "ประเภท Name3": list3[i] || ""
        });
      }
      return generatedRows;
    }

    if ((tableName === "สินค้า" || dbTable === "products") && mapped.length === 0) {
      const options = await getSystemOptionsFromSupabase();
      if (Array.isArray(options["PRODUCT_MASTER_DATA"]) && options["PRODUCT_MASTER_DATA"].length > 0) {
        return options["PRODUCT_MASTER_DATA"].map((item: any, idx: number) => ({
          _sheetRow: idx + 2,
          id_product: item.id || item.code || String(idx + 1),
          "รหัสสินค้า": item.code || String(idx + 1),
          "ชื่อประเภทสินค้า": item.name || "",
          "หมายเหตุ": item.description || ""
        }));
      }
      return DEFAULT_PRODUCT_CATEGORIES;
    }

    return mapped;
  } catch (err) {
    console.warn(`Exception fetching rows from Supabase table '${dbTable}':`, err);
    return [];
  }
}

export async function getSystemOptionsFromSupabase(): Promise<Record<string, string[]>> {
  if (!isSupabaseConfigured()) return {};

  return cached("sys_opt:all", 2_000, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from("system_options")
        .select("*");

      if (error || !data || data.length === 0) return {};

      const singleDoc = data.find(row => row.id === "system_options");
      if (singleDoc && singleDoc.data && Object.keys(singleDoc.data).length > 0) {
        return singleDoc.data;
      }

      const result: Record<string, string[]> = {};
      for (const row of data) {
        for (const [col, val] of Object.entries(row)) {
          if (col === "id" || col === "created_at" || col === "updated_at" || col === "data") continue;
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            const strVal = String(val).trim();
            if (!result[col]) result[col] = [];
            if (!result[col].includes(strVal)) result[col].push(strVal);
          }
        }
      }
      return result;
    } catch (err) {
      console.warn("Failed to load system_options from Supabase", err);
      return {};
    }
  });
}

const SYNCABLE_OPTION_FIELDS = [
  "ชื่อเครื่องมือ",
  "รายละเอียดงาน",
  "สินค้า",
  "รายการ",
  "ยี่ห้อรถ",
  "ยี่ห้อ",
  "รถของ",
  "รับผิดชอบ",
  "บิล",
  "ประเภทบิล"
];

const OPTION_KEY_MAP: Record<string, string> = {
  "ยี่ห้อ": "ยี่ห้อรถ",
  "บิล": "ประเภทบิล"
};

export async function syncCustomOptionsFromRow(row: Record<string, any>) {
  if (!isSupabaseConfigured() || !row || typeof row !== "object") return;

  const newEntries: Record<string, string[]> = {};

  for (const fieldName of SYNCABLE_OPTION_FIELDS) {
    const rawVal = row[fieldName];
    if (!rawVal || typeof rawVal !== "string") continue;

    const items = rawVal
      .split(",")
      .map(s => s.trim())
      .filter(s => s && s !== "-" && s !== "0" && s !== "non");

    if (items.length > 0) {
      const targetKey = OPTION_KEY_MAP[fieldName] || fieldName;
      newEntries[targetKey] = items;
    }
  }

  if (Object.keys(newEntries).length === 0) return;

  try {
    const currentOptions = await getSystemOptionsFromSupabase();
    let hasChanges = false;
    const updatedOptions: Record<string, string[]> = { ...currentOptions };

    for (const [field, items] of Object.entries(newEntries)) {
      const existingList = Array.isArray(updatedOptions[field]) ? [...updatedOptions[field]] : [];
      let fieldChanged = false;

      for (const item of items) {
        if (!existingList.includes(item)) {
          existingList.push(item);
          fieldChanged = true;
        }
      }

      if (fieldChanged) {
        updatedOptions[field] = existingList;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await supabaseAdmin.from("system_options").upsert({
        id: "system_options",
        data: updatedOptions,
        updated_at: new Date().toISOString()
      });
      clearCache("sys_opt:all");
      clearCache("sys_opt:all_options");
    }
  } catch (err) {
    console.warn("Failed to auto-sync new custom options to system_options:", err);
  }
}

function extractMissingColumnName(errorMessage: string): string | null {
  if (!errorMessage) return null;

  const m1 = errorMessage.match(/Could not find the '([^']+)' column/i);
  if (m1 && m1[1]) return m1[1];

  const m2 = errorMessage.match(/column\s+(?:[^\s.]+\.)?["']?([^"'\s,;]+)["']?\s+does not exist/i);
  if (m2 && m2[1]) return m2[1];

  const m3 = errorMessage.match(/column\s+["']?([^"'\s,;]+)["']?\s+of relation/i);
  if (m3 && m3[1]) return m3[1];

  return null;
}

export async function insertRowToSupabase(tableName: string, rowData: Record<string, any>) {
  if (!isSupabaseConfigured()) return null;

  const dbTable = getDbTableName(tableName);
  const dbRow = mapSheetRowToSupabaseRow(tableName, rowData);

  const bankVal = rowData["ธนาคาร"] || rowData["bank_name"];
  const entityId = dbRow.id || rowData["id_store"] || rowData["id_Contractor"] || rowData["รหัสพนักงาน"];
  if (bankVal && entityId) {
    saveEntityBankOption(String(entityId), String(bankVal));
  }

  if (dbTable === "projects" || tableName === "Project" || tableName === "PROJECT") {
    const targetProjId = String(rowData["ID Project"] ?? rowData.id ?? dbRow.id);
    await saveProjectBudgetAllocation(targetProjId, rowData);
  }

  await syncCustomOptionsFromRow(rowData);

  try {
    let res = await supabaseAdmin.from(dbTable).insert(dbRow).select();
    let retries = 0;

    while (res.error && retries < 25) {
      retries++;
      if (res.error.message.includes("duplicate key") || res.error.message.includes("unique constraint") || res.error.message.includes("already exists")) {
        res = await supabaseAdmin.from(dbTable).upsert(dbRow).select();
        if (!res.error) break;
      }
      if (res.error.message.includes("cannot insert a non-DEFAULT value") || res.error.message.includes("ALWAYS AS IDENTITY") || res.error.message.includes("identity")) {
        delete dbRow.id;
        res = await supabaseAdmin.from(dbTable).insert(dbRow).select();
        continue;
      }
      if (res.error.message.includes("invalid input syntax")) {
        Object.keys(dbRow).forEach(k => {
          if (dbRow[k] === "" || dbRow[k] === undefined) delete dbRow[k];
        });
        res = await supabaseAdmin.from(dbTable).insert(dbRow).select();
        continue;
      }
      const missingCol = extractMissingColumnName(res.error.message);
      if (missingCol) {
        const matchingKey = Object.keys(dbRow).find(k => k === missingCol || k.startsWith(missingCol) || missingCol.startsWith(k));
        if (matchingKey) {
          delete dbRow[matchingKey];
          res = await supabaseAdmin.from(dbTable).insert(dbRow).select();
          continue;
        }
      }
      if (res.error.message.includes("bank_name") && "bank_name" in dbRow) {
        delete dbRow.bank_name;
        res = await supabaseAdmin.from(dbTable).insert(dbRow).select();
        continue;
      }
      break;
    }

    if (res.error) {
      console.warn(`Failed to insert into Supabase '${dbTable}': ${res.error.message}`);
      throw new Error(`บันทึกลงตาราง '${dbTable}' ไม่สำเร็จ: ${res.error.message}`);
    }

    return res.data;
  } catch (err) {
    console.warn(`Exception inserting into Supabase '${dbTable}':`, err);
    throw err;
  }
}

function getBusinessKey(dbTable: string, row: Record<string, any>): string {
  if (!row || typeof row !== "object") return "";

  if (dbTable === "banks") {
    return String(row.name || row["ชื่อธนาคาร"] || "").trim().toLowerCase();
  }
  if (dbTable === "stores") {
    return String(row.name || row.full_name || row["ชื่อร้านค้า"] || row["ชื่อเต็ม"] || "").trim().toLowerCase();
  }
  if (dbTable === "contractors") {
    const idCard = String(row.id_card || row["บัตรประจำตัวประชาชน"] || "").trim();
    if (idCard && idCard.length >= 5) return `idcard:${idCard}`;
    return String(row.full_name || row.nickname || row["ชื่อ-นามสกุล"] || row["ชื่อเล่น"] || "").trim().toLowerCase();
  }
  if (dbTable === "master_members") {
    const phone = String(row.phone || row["เบอร์โทร"] || "").replace(/\D/g, "");
    if (phone.length >= 9) return `phone:${phone}`;
    const idCard = String(row.id_card || row["เลขที่บัตรประชาชน"] || "").trim();
    if (idCard && idCard.length >= 5) return `idcard:${idCard}`;
    return String(row.full_name || row.nickname || row["ชื่อ-นามสกุล"] || row["ชื่อเล่น"] || "").trim().toLowerCase();
  }
  if (dbTable === "cars") {
    return String(row.plate_no || row["หมายเลขทะเบียน"] || "").trim().toLowerCase().replace(/\s+/g, "");
  }
  if (dbTable === "products") {
    const code = String(row.code || row["รหัสสินค้า"] || "").trim();
    if (code) return `code:${code.toLowerCase()}`;
    return String(row.name || row["ชื่อประเภทสินค้า"] || "").trim().toLowerCase();
  }
  if (dbTable === "customers") {
    return String(row.name || row["ชื่อลูกค้า"] || "").trim().toLowerCase();
  }
  if (dbTable === "companies") {
    return String(row.name_th || row.name_en || row["ชื่อบริษัท"] || row["ชื่ออังกฤษ"] || "").trim().toLowerCase();
  }
  if (dbTable === "projects") {
    return String(row.name || row["ชื่อ Project"] || "").trim().toLowerCase();
  }
  if (dbTable === "bills") {
    const proj = String(row.project_id || row["ID Project"] || "").trim();
    const bill = String(row.bill_no || row["บิล"] || "").trim();
    const amount = String(row.amount || row["ยอดเงิน"] || "").trim();
    const date = String(row.bill_date || row["ว/ด/ป"] || "").trim();
    if (proj && bill) return `bill:${proj}:${bill}:${amount}:${date}`.toLowerCase();
    return "";
  }
  return "";
}

function getPrefixForTable(dbTable: string): string {
  switch (dbTable) {
    case "banks": return "Ba";
    case "stores": return "St";
    case "contractors": return "Con";
    case "contract_works": return "CW";
    case "master_members": return "U";
    case "cars": return "Car";
    case "customers": return "Cus";
    case "companies": return "Comp";
    case "loans": return "L";
    default: return "";
  }
}

export async function bulkInsertRowsToSupabase(tableName: string, rowsData: Record<string, any>[]) {
  if (!isSupabaseConfigured() || !rowsData.length) return [];

  const dbTable = getDbTableName(tableName);
  const rawDbRows = rowsData
    .map(r => mapSheetRowToSupabaseRow(tableName, r))
    .filter(r => Object.keys(r).length > 0);

  if (!rawDbRows.length) return [];

  try {
    // 1. Fetch existing records to prevent duplicates and match IDs
    const { data: existingRecords } = await supabaseAdmin.from(dbTable).select("*");
    const existingList = existingRecords || [];

    const existingById = new Map<string, Record<string, any>>();
    const existingByBusinessKey = new Map<string, Record<string, any>>();

    let maxNum = 100;
    const prefix = getPrefixForTable(dbTable);

    for (const record of existingList) {
      if (record.id !== undefined && record.id !== null) {
        existingById.set(String(record.id).trim().toLowerCase(), record);

        const match = String(record.id).match(/\d+/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }

      const bKey = getBusinessKey(dbTable, record);
      if (bKey) {
        existingByBusinessKey.set(bKey, record);
      }
    }

    // 2. Intelligent deduplication and ID assignment
    const dedupedMap = new Map<string, Record<string, any>>();

    for (const incomingRow of rawDbRows) {
      const rowCopy = { ...incomingRow };
      const rawId = String(rowCopy.id || "").trim().toLowerCase();
      const bKey = getBusinessKey(dbTable, rowCopy);

      let matchedRecord: Record<string, any> | undefined;

      if (rawId && existingById.has(rawId)) {
        matchedRecord = existingById.get(rawId);
      } else if (bKey && existingByBusinessKey.has(bKey)) {
        matchedRecord = existingByBusinessKey.get(bKey);
      }

      if (matchedRecord) {
        // Link to existing ID to update instead of duplicating
        rowCopy.id = matchedRecord.id;
        const dedupKey = String(matchedRecord.id);
        const merged = { ...matchedRecord, ...(dedupedMap.get(dedupKey) || {}), ...rowCopy };
        dedupedMap.set(dedupKey, merged);
      } else {
        // New record
        if (!rowCopy.id && dbTable !== "bills") {
          maxNum++;
          rowCopy.id = prefix ? `${prefix}${maxNum}` : `${maxNum}`;
        }
        const dedupKey = rowCopy.id ? String(rowCopy.id) : (bKey || `temp_${Math.random()}`);
        dedupedMap.set(dedupKey, rowCopy);

        if (rowCopy.id) {
          existingById.set(String(rowCopy.id).trim().toLowerCase(), rowCopy);
        }
        if (bKey) {
          existingByBusinessKey.set(bKey, rowCopy);
        }
      }
    }

    const dedupedRows = Array.from(dedupedMap.values());

    // Save entity banks in system_options for stores/contractors/master_members
    if (dbTable === "stores" || dbTable === "contractors" || dbTable === "master_members") {
      const bankEntries: Record<string, string> = {};
      for (const r of dedupedRows) {
        const eid = String(r.id || "").trim();
        const bname = String(r.bank_name || r["ธนาคาร"] || "").trim();
        if (eid && bname) {
          bankEntries[eid] = bname;
        }
      }
      if (Object.keys(bankEntries).length > 0) {
        saveEntityBanksBatch(bankEntries).catch(() => {});
      }
    }

    const chunkSize = 200;
    const insertedResults: any[] = [];

    for (let i = 0; i < dedupedRows.length; i += chunkSize) {
      const chunk = dedupedRows.slice(i, i + chunkSize);

      const sanitizedChunk = chunk.map(item => {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(item)) {
          if (v !== undefined) clean[k] = v;
        }
        return clean;
      });

      let currentChunk = sanitizedChunk;
      let res = await supabaseAdmin.from(dbTable).upsert(currentChunk, { onConflict: "id" }).select();

      // Auto-retry if any column is missing in Postgres schema cache (e.g. bank_name)
      let retries = 0;
      while (res.error && retries < 6) {
        retries++;
        const match = res.error.message.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const missingCol = match[1];
          currentChunk = currentChunk.map(item => {
            const copy = { ...item };
            delete copy[missingCol];
            return copy;
          });
          res = await supabaseAdmin.from(dbTable).upsert(currentChunk, { onConflict: "id" }).select();
          continue;
        }
        break;
      }

      if (res.error) {
        res = await supabaseAdmin.from(dbTable).upsert(currentChunk).select();
      }

      if (res.error) {
        res = await supabaseAdmin.from(dbTable).insert(currentChunk).select();
      }

      if (res.error) {
        console.warn(`Bulk insert error in table '${dbTable}':`, res.error.message);
        throw new Error(`นำเข้าข้อมูลตาราง '${dbTable}' ไม่สำเร็จ: ${res.error.message}`);
      }

      if (res.data) {
        insertedResults.push(...res.data);
      }
    }

    clearCache(`rows:${tableName}`);
    clearCache(`headers:${tableName}`);
    clearCache("rows:");

    return insertedResults;
  } catch (err) {
    console.warn(`Exception in bulkInsertRowsToSupabase for '${dbTable}':`, err);
    throw err;
  }
}

export async function insertAuditLogToSupabase(entry: Record<string, any>) {
  if (!isSupabaseConfigured()) return null;

  try {
    await supabaseAdmin.from("audit_logs").insert({
      action: String(entry.action || "UPDATE"),
      table_name: String(entry.tableName || ""),
      actor: String(entry.actor || "system"),
      details: entry.details || {}
    });
  } catch (err) {
    // Ignore audit log error silently
  }
}

export function sanitizeSupabaseStorageKey(key: string): string {
  let clean = key
    .replace(/ธนาคาร/g, "banks")
    .replace(/ร้านค้า/g, "stores")
    .replace(/รับเหมา/g, "contractors")
    .replace(/ชื่อพนักงาน|PEOPLE|รายชื่อ/g, "people")
    .replace(/ทะเบียน|CAR/g, "cars")
    .replace(/ลูกค้า|CUSTOMER/g, "customers")
    .replace(/บริษัท|COMPANY/g, "companies")
    .replace(/ยืมเงิน|LOAN/g, "loans")
    .replace(/รูปถ่ายบิล|รูปถ่าย|รูปภาพ/g, "img");

  clean = clean.normalize("NFD").replace(/[^\x00-\x7F]/g, "_");
  return clean.replace(/[^a-zA-Z0-9_\-\.]/g, "_").replace(/_+/g, "_");
}

export async function uploadFileToSupabaseStorage(bucketName: string, path: string, file: File | Buffer, contentType?: string): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");

  const cleanPath = sanitizeSupabaseStorageKey(path);

  let buffer: Buffer;
  if (file instanceof File) {
    buffer = Buffer.from(await file.arrayBuffer());
    contentType = contentType || file.type || "image/jpeg";
  } else {
    buffer = file;
    contentType = contentType || "image/jpeg";
  }

  let { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(cleanPath, buffer, {
      contentType,
      upsert: true
    });

  if (error && (error.message.includes("not found") || error.message.includes("Bucket") || error.message.includes("bucket"))) {
    try {
      await supabaseAdmin.storage.createBucket(bucketName, { public: true });
      const retry = await supabaseAdmin.storage
        .from(bucketName)
        .upload(cleanPath, buffer, {
          contentType,
          upsert: true
        });
      data = retry.data;
      error = retry.error;
    } catch (createErr) {
      console.warn(`Failed to auto-create bucket '${bucketName}':`, createErr);
    }
  }

  if (error) {
    console.warn(`Supabase Storage upload error for bucket '${bucketName}':`, error.message);
    return `data:${contentType || "image/jpeg"};base64,${buffer.toString("base64")}`;
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(cleanPath);

  return publicUrlData.publicUrl;
}

/**
 * Delete uploaded image/attachment files from Supabase Storage buckets to save disk space
 */
export async function deleteStorageFilesFromSupabase(urls: (string | null | undefined)[]) {
  if (!isSupabaseConfigured() || !urls.length) return;

  const filePathsByBucket: Record<string, string[]> = {};

  for (const rawUrl of urls) {
    if (!rawUrl || typeof rawUrl !== "string" || rawUrl.startsWith("data:")) continue;

    const items = rawUrl.split(",").map(s => s.trim()).filter(Boolean);

    for (const item of items) {
      const match = item.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/i);
      if (match) {
        const bucket = match[1];
        const filePath = match[2];
        if (!filePathsByBucket[bucket]) filePathsByBucket[bucket] = [];
        filePathsByBucket[bucket].push(filePath);
      }
    }
  }

  for (const [bucket, paths] of Object.entries(filePathsByBucket)) {
    if (paths.length > 0) {
      try {
        const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
        if (error) {
          console.warn(`Failed to delete files from Supabase Storage bucket '${bucket}':`, error.message);
        } else {
          console.log(`Successfully deleted ${paths.length} storage file(s) from bucket '${bucket}'.`);
        }
      } catch (err) {
        console.warn(`Exception deleting files from storage bucket '${bucket}':`, err);
      }
    }
  }
}
