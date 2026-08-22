import { TABLES } from "@/lib/config";
import { MainDashboardClient } from "@/components/dashboards/MainDashboardClient";
import { isCommittedBill, isUnpaidBill, normalizeBillStatus } from "@/lib/bill-status";
import { computeBillTransferAmount, hydrateProjectRowsForList, isCreditActive, isDeductActive, isVatActive } from "@/lib/project-summary";
import { WithdrawDashboardClient, type WithdrawFilters } from "@/components/dashboards/WithdrawDashboardClient";
import { WorkStatusDashboardClient } from "@/components/dashboards/WorkStatusDashboardClient";
import { BillFollowDashboardClient } from "@/components/dashboards/BillFollowDashboardClient";
import { money, toNumber } from "@/lib/numbers";
import { getRows } from "@/lib/db";
import { cookies } from "next/headers";
import type { SheetRow } from "@/lib/types";

export async function MainDashboard() {
  const [dataRows, projectRows] = await Promise.all([safeRows(TABLES.DATA), safeRows(TABLES.PROJECT)]);
  return <MainDashboardClient initialDataRows={dataRows.filter(isCommittedBill)} initialProjectRows={projectRows} />;
}

export async function WithdrawDashboard({ filters = {} }: { filters?: WithdrawFilters }) {
  const [dataRows, peopleRows] = await Promise.all([safeRows(TABLES.DATA), safeRows(TABLES.PEOPLE)]);
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("auth_role")?.value === "Admin";
  
  const rows = hydrateDataRows(dataRows).filter(row => {
    // แสดงบิลสถานะ "รอตั้งเบิก", "ตั้งเบิก" และ "อนุมัติ"
    const status = normalizeBillStatus(row["สถานะ"]);
    if (status !== "รอตั้งเบิก" && status !== "ตั้งเบิก" && status !== "รออนุมัติ" && status !== "อนุมัติ") return false;
    return hasValue(row["ลำดับ"]) || hasValue(row["ID Project"]) || hasValue(row["ร้าน/บุคคล"]) || hasValue(row["สินค้า/ทำงาน"]);
  });
  return <WithdrawDashboardClient rows={rows} peopleRows={peopleRows} initialFilters={filters} isAdmin={isAdmin} />;
}

export async function BillFollowDashboard() {
  const [dataRows, peopleRows] = await Promise.all([safeRows(TABLES.DATA), safeRows(TABLES.PEOPLE)]);
  const rawRows = hydrateDataRows(dataRows).filter(isCommittedBill);
  const requesterNames = requesterNameMap(peopleRows);
  
  // Sort rows latest first
  const rows = [...rawRows].sort((left, right) => {
    const leftSeq = Number(left["ลำดับ"] || left._sheetRow || 0);
    const rightSeq = Number(right["ลำดับ"] || right._sheetRow || 0);
    return rightSeq - leftSeq;
  });

  const vatRows = rows.filter(row => isVatActive(row.vat) && !hasValue(row["วันได้บิล"]));
  const naturalDeductRows = rows.filter(row =>
    isDeductActive(row["หัก"]) &&
    !hasValue(row["วันออก 3%"]) &&
    !isCompanyLaborStatus(row["statusค่าแรง"])
  );
  const companyDeductRows = rows.filter(row =>
    isDeductActive(row["หัก"]) &&
    !hasValue(row["วันออก 3%"]) &&
    isCompanyLaborStatus(row["statusค่าแรง"])
  );
  const creditRows = rows.filter(row => isCreditActive(row["เครดิต"]) && !hasValue(row["วันจ่าย"]));

  return (
    <BillFollowDashboardClient
      vatRows={vatRows}
      naturalDeductRows={naturalDeductRows}
      companyDeductRows={companyDeductRows}
      creditRows={creditRows}
      requesterNames={requesterNames}
      peopleRows={peopleRows}
    />
  );
}

export async function WorkStatusDashboard() {
  const [projectRows, dataRows, customerRows, companyRows] = await Promise.all([
    safeRows(TABLES.PROJECT),
    safeRows(TABLES.DATA),
    safeRows(TABLES.CUSTOMER),
    safeRows(TABLES.COMPANY),
  ]);

  const customerMap = customerRows.reduce<Record<string, string>>((acc, row) => {
    const id = String(row["id_cus"] || row["id"] || row["รหัสลูกค้า"] || "").trim();
    const name = String(row["ชื่อลูกค้า"] || row["ชื่อบริษัท"] || row["ชื่อ-นามสกุล"] || row["name"] || "").trim();
    if (id) acc[id.toLowerCase()] = name || id;
    return acc;
  }, {});

  const companyMap = companyRows.reduce<Record<string, string>>((acc, row) => {
    const id = String(row["id_Company"] || row["id"] || row["รหัสบริษัท"] || "").trim();
    const name = String(row["ชื่อบริษัท"] || row["บริษัท"] || row["ชื่อย่อ"] || "").trim();
    if (id) acc[id.toLowerCase()] = name || id;
    return acc;
  }, {});

  // Hydrate projects with exact same budget logic as project-all (views/project-all)
  const hydratedProjects = hydrateProjectRowsForList(projectRows, dataRows);

  const rawRows: SheetRow[] = hydratedProjects.map((row) => {
    const rawCus = String(row["ชื่อลูกค้า"] || row["ลูกค้า"] || "").trim();
    const cusName = customerMap[rawCus.toLowerCase()] || rawCus;

    const rawComp = String(row["บริษัท"] || row["บริษัทรับงาน"] || "").trim();
    const compName = companyMap[rawComp.toLowerCase()] || rawComp;

    return {
      ...row,
      "ชื่อลูกค้า": cusName,
      "บริษัท": compName,
    };
  });

  // Sort projects by ID or sheet sequence
  const rows = [...rawRows].sort((left, right) => {
    const leftId = Number(String(left["ID Project"] || "").replace(/\D/g, "") || left._sheetRow || 0);
    const rightId = Number(String(right["ID Project"] || "").replace(/\D/g, "") || right._sheetRow || 0);
    return rightId - leftId;
  });

  return <WorkStatusDashboardClient projects={rows} />;
}

function AmountPanel({ title, value, className = "" }: { title: string; value: number; className?: string }) {
  return (
    <div className={`bg-white rounded-md p-4 border border-slate-200 space-y-2.5 ${className}`}>
      <header className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider">
        <h3>{title}</h3>
        <small className="text-slate-400 font-normal">บาท</small>
      </header>
      <div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex flex-col gap-0.5">
        <span className="text-xs text-slate-500 font-medium">{title}</span>
        <strong className="text-lg text-slate-900">{money(value)}</strong>
      </div>
    </div>
  );
}

function FollowPanel({ title, count, requesterNames, rows }: { title: string; count: number; requesterNames: Record<string, string>; rows: SheetRow[] }) {
  const visibleRows = rows.slice(0, 80);
  const amountTotal = rows.reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  const rowCountText = rows.length > visibleRows.length ? `${visibleRows.length} / ${rows.length}` : String(visibleRows.length);

  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
      <header className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs text-slate-800">{title}</h3>
        <div className="flex items-center gap-2.5 text-xs">
          <span className="text-slate-500">{rowCountText} รายการ</span>
          <strong className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{money(amountTotal)}</strong>
        </div>
      </header>
      {visibleRows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
                <th className="py-2.5 px-3 border-r border-slate-200">ลำดับ</th>
                <th className="py-2.5 px-3 border-r border-slate-200">ร้าน/บุคคล</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Project</th>
                <th className="py-2.5 px-3 border-r border-slate-200">รายการ</th>
                <th className="py-2.5 px-3 border-r border-slate-200">วันที่</th>
                <th className="py-2.5 px-3 border-r border-slate-200">ผู้เบิก</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right">ยอดเงิน</th>
                <th className="py-2.5 px-3">เงื่อนไข</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {visibleRows.map((row, index) => (
                <tr key={String(row._sheetRow || row["ลำดับ"] || index)} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 border-r border-slate-100 text-slate-500">{formatCell(row["ลำดับ"]) || "-"}</td>
                  <td className="py-2 px-3 border-r border-slate-100 text-slate-900">{formatCell(row["ร้าน/บุคคล"]) || "-"}</td>
                  <td className="py-2 px-3 border-r border-slate-100 text-slate-600">{formatCell(row["ชื่อ Project"]) || "-"}</td>
                  <td className="py-2 px-3 border-r border-slate-100 text-slate-600 max-w-[200px] truncate">{formatCell(row["สินค้า/ทำงาน"] || row["รายการ"]) || "-"}</td>
                  <td className="py-2 px-3 border-r border-slate-100 text-slate-500 whitespace-nowrap">{formatCell(row["ว/ด/ป"]) || "-"}</td>
                  <td className="py-2 px-3 border-r border-slate-100 text-slate-600">{requesterName(row["ผู้เบิก"], requesterNames) || "-"}</td>
                  <td className="py-2 px-3 border-r border-slate-100 text-right text-slate-900">{money(row["ยอดเงิน"])}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1 text-xs ">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">vat {formatCell(row.vat) || "-"}</span>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">หัก {formatCell(row["หัก"]) || "-"}</span>
                      {hasValue(row["เครดิต"]) ? <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300">เครดิต {formatCell(row["เครดิต"])}</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-400 text-xs">ไม่พบข้อมูล</div>
      )}
    </div>
  );
}

function requesterNameMap(peopleRows: SheetRow[]) {
  return peopleRows.reduce<Record<string, string>>((names, row) => {
    const key = String(row["รหัสพนักงาน"] || "").trim();
    const name = String(row["ชื่อเล่น"] || "").trim();
    if (key && name) names[key] = name;
    return names;
  }, {});
}

function requesterName(value: unknown, requesterNames: Record<string, string>) {
  const key = String(value || "").trim();
  return requesterNames[key] || key;
}

function isCompanyLaborStatus(value: unknown) {
  const text = String(value || "").trim();
  return text === "บริษัท";
}

function ProjectStatusPanel({
  title,
  count,
  rows,
  tone = "default"
}: {
  title: string;
  count: number;
  rows: SheetRow[];
  tone?: "default" | "green";
}) {
  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
      <header className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-xs text-slate-800">{title}</h3>
        <strong className="text-xs text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{count} รายการ</strong>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
        {rows.slice(0, 60).map((row, index) => (
          <ProjectItemCard key={String(row["ID Project"] || row._sheetRow || index)} title={title} row={row} tone={tone} />
        ))}
        {!rows.length ? <div className="col-span-full p-6 text-center text-slate-400 text-xs">ไม่พบข้อมูล</div> : null}
      </div>
    </div>
  );
}

function ProjectItemCard({ title, row, tone }: { title: string; row: SheetRow; tone: "default" | "green" }) {
  const projectName = row["ชื่อ Project"];
  const date = row["วันที่"];
  const customer = row["ชื่อลูกค้า"];
  const company = row["บริษัท"];
  const owner = row["รับผิดชอบ"];
  const total = row["รวม ALL"] || row["ยอดงาน"];
  const totalVat = row["ยอดรวม vat"];
  const budget = row["งบไม่เกิน"];

  return (
    <article className="bg-white rounded-md border border-slate-200 overflow-hidden transition flex flex-col text-xs">
      <div className="px-3 py-2 flex items-center justify-between text-xs text-white bg-slate-800">
        <span>{title}</span>
        <span className="font-mono text-xs opacity-90">#{formatCell(row["ID Project"])}</span>
      </div>
      <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <strong className="text-slate-900 text-xs line-clamp-2">{formatCell(projectName) || "-"}</strong>
            <span className="text-xs font-normal text-slate-500 shrink-0">{formatCell(date) || "-"}</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
            <div>ลูกค้า: <span className="font-medium text-slate-800">{formatCell(customer) || "-"}</span></div>
            <div>บริษัท: <span className="font-medium text-slate-800">{formatCell(company) || "-"}</span></div>
            <div>ผู้รับผิดชอบ: <span className="font-medium text-slate-800">{formatCell(owner) || "-"}</span></div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-2 rounded border border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500 text-xs">ยอดรวม</span>
            <div className="text-slate-900">{money(total)}</div>
          </div>
          <div>
            <span className="text-slate-500 text-xs">ยอดรวม vat</span>
            <div className="text-slate-900">{money(totalVat)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
          <span>งบไม่เกิน: <strong className="text-slate-800">{money(budget)}</strong></span>
          <span>รวม ALL: <strong className="text-slate-900 ">{money(total)}</strong></span>
        </div>
      </div>
    </article>
  );
}

function SummaryTable({
  title,
  subtitle,
  header,
  rows
}: {
  title: string;
  subtitle: string;
  header: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
      <header className="p-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-xs text-slate-800">{title}</h3>
        <small className="text-slate-500 font-normal">{subtitle}</small>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
              {header.map(column => <th key={column} className="py-2.5 px-3 border-r border-slate-200">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="hover:bg-slate-50 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`py-2 px-3 border-r border-slate-100 ${typeof cell === "number" ? "text-slate-900 text-right" : "font-normal"}`}>
                    {typeof cell === "number" ? money(cell) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sumColumns(rows: SheetRow[], columns: string[]) {
  return rows.reduce((sum, row) => sum + columns.reduce((inner, column) => inner + toNumber(row[column]), 0), 0);
}

function hydrateDataRows(rows: SheetRow[]) {
  const amountColumns = ["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"];
  return rows.map(row => {
    const output = { ...row };
    if (!hasValue(output["ยอดเงิน"])) output["ยอดเงิน"] = sumColumns([output], amountColumns);
    output["ยอดโอน"] = computeBillTransferAmount(output);
    if (!hasValue(output["ร้าน/บุคคล"])) output["ร้าน/บุคคล"] = firstValue(output, ["ร้านค้า", "ผู้รับเหมา", "ร้านค้า/ผู้รับเหมา"]);
    if (!hasValue(output["สินค้า/ทำงาน"])) output["สินค้า/ทำงาน"] = firstValue(output, ["สินค้า", "รายละเอียดงาน", "รายการ"]);
    return output;
  });
}

function computeTransferAmount(row: SheetRow) {
  return computeBillTransferAmount(row);
}

function hydrateProjectSummary(project: SheetRow, dataRows: SheetRow[]): SheetRow {
  const projectId = String(project["ID Project"] || "");
  const projectDataRows = dataRows.filter(row => String(row["ID Project"] || "") === projectId);
  const total = sumColumns(projectDataRows, ["ยอดเงิน"]);
  const totalAll = project["รวม ALL"] || total;
  const totalVat = project["ยอดรวม vat"] || toNumber(project["ยอดงาน"]) * 1.07;
  return {
    ...project,
    "รวม ALL": totalAll,
    "ยอดรวม vat": totalVat
  };
}

function firstValue(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    if (hasValue(row[column])) return row[column];
  }
  return "";
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function lower(value: unknown) {
  return String(value || "").toLowerCase();
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return money(value);
  return String(value);
}

async function safeRows(tableName: string): Promise<SheetRow[]> {
  try {
    return await getRows(tableName);
  } catch {
    return [];
  }
}

