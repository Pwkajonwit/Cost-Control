import { NextRequest, NextResponse } from "next/server";
import { clearCache } from "@/lib/cache";
import { canEditOrDeleteBill, validateBillStatusTransition } from "@/lib/bill-status";
import { validateBillRelations } from "@/lib/bill-validation";
import { PRIMARY_VIEWS, TABLE_KEYS, TABLES, VIEW_COLUMNS } from "@/lib/config";
import { uploadTableImage } from "@/lib/drive";
import { applyBillFormulas, applyContractFormulas, applyProjectFormulas } from "@/lib/formulas";
import { getFormSchema } from "@/lib/schemas";
import { isVatActive, parseDeductPercent, parseCreditDays } from "@/lib/project-summary";
import { appendAuditLog, appendRow, bulkAppendRows, deleteRows, getRows, updateRow } from "@/lib/db";
import type { SheetRow } from "@/lib/types";

export async function GET(request: NextRequest) {
  const tableName = request.nextUrl.searchParams.get("tableName");
  const viewName = request.nextUrl.searchParams.get("viewName") || "";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const limit = Math.max(1, Math.min(500, Number(request.nextUrl.searchParams.get("limit") || 50)));
  const search = request.nextUrl.searchParams.get("search") || "";
  if (!tableName) return NextResponse.json({ error: "Missing tableName" }, { status: 400 });

  let allRows = await getRows(tableName);
  if (search) {
    const q = search.toLowerCase();
    allRows = allRows.filter(row => Object.values(row).some(value => String(value || "").toLowerCase().includes(q)));
  }

  const totalCount = allRows.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedRows = allRows.slice(startIndex, startIndex + limit);
  const keyColumn = TABLE_KEYS[tableName] || "_RowNumber";

  return NextResponse.json({
    tableName,
    viewName,
    columns: VIEW_COLUMNS[viewName] || Object.keys(allRows[0] || {}),
    keyColumn,
    page,
    limit,
    totalCount,
    totalPages,
    rows: paginatedRows
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await readPostBody(request);
    const tableName = String(body.tableName || "");
    if (!canManageTable(tableName)) return NextResponse.json({ error: "Table is not manageable" }, { status: 403 });

    // High performance bulk batch insertion
    if (Array.isArray(body.rows) && body.rows.length > 0) {
      const rows = body.rows as SheetRow[];
      const inserted = await bulkAppendRows(tableName, rows);
      await appendAuditLog({
        action: "BULK_CREATE",
        tableName,
        key: `count:${rows.length}`,
        actor: actorFromRequest(request),
        details: { count: rows.length }
      }).catch(() => undefined);
      clearCache("rows:");
      clearCache("headers:");
      return NextResponse.json({ ok: true, count: inserted?.length || rows.length });
    }

    const row = body.row && typeof body.row === "object" ? body.row as SheetRow : {};
    const actor = actorFromRequest(request);
    if ((tableName === TABLES.DATA || tableName === "Data" || tableName === "bills")) {
      if (!row["ผู้สร้างบิล"] && !row["created_by"]) {
        row["ผู้สร้างบิล"] = actor;
        row["created_by"] = actor;
      } else if (!row["ผู้สร้างบิล"] && row["created_by"]) {
        row["ผู้สร้างบิล"] = row["created_by"];
      } else if (row["ผู้สร้างบิล"] && !row["created_by"]) {
        row["created_by"] = row["ผู้สร้างบิล"];
      }
    }
    sanitizeBySchema(row, tableName);
    validateRequiredBySchema(row, tableName);
    if (tableName === TABLES.DATA) {
      await validateBillRelations(row);
    }
    const output = tableName === TABLES.CONTRACT_WORK
      ? await applyContractFormulas(row)
      : tableName === TABLES.PROJECT
        ? applyProjectFormulas(row)
        : (tableName === TABLES.DATA || tableName === "Data" || tableName === "bills")
          ? await applyBillFormulas(row)
          : row;
    await appendRow(tableName, output);
    await appendAuditLog({
      action: "CREATE",
      tableName,
      key: String(output[TABLE_KEYS[tableName]] || ""),
      actor: actor,
      details: { projectId: output["ID Project"] || "" }
    }).catch(() => undefined);
    clearCache("rows:");
    clearCache("headers:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await readPatchBody(request);
    const tableName = String(body.tableName || "");
    if (!canManageTable(tableName)) return NextResponse.json({ error: "Table is not manageable" }, { status: 403 });

    const sheetRow = Number(body.sheetRow);
    const patch = body.values && typeof body.values === "object" ? body.values as SheetRow : {};
    const existingRows = await getRows(tableName);
    const keyCol = TABLE_KEYS[tableName] || "";
    const existing = existingRows.find((row: SheetRow) =>
      Number(row._sheetRow) === sheetRow ||
      String(row._sheetRow) === String(body.sheetRow) ||
      (keyCol && String(row[keyCol]) === String(body.sheetRow)) ||
      (row.id !== undefined && String(row.id) === String(body.sheetRow)) ||
      (row.id_Conwork !== undefined && String(row.id_Conwork) === String(body.sheetRow)) ||
      (row.id_bank !== undefined && String(row.id_bank) === String(body.sheetRow)) ||
      (row.id_store !== undefined && String(row.id_store) === String(body.sheetRow)) ||
      (row.id_Contractor !== undefined && String(row.id_Contractor) === String(body.sheetRow))
    );
    if (!existing) throw new Error("ไม่พบข้อมูลที่ต้องการแก้ไข");
    const values = { ...existing, ...patch };
    const patchKeys = Object.keys(patch).filter(key => key !== "_sheetRow");
    const isFollowUpOrStatusPatch = tableName === TABLES.DATA && patchKeys.length > 0 && patchKeys.every(key =>
      ["สถานะ", "วันได้บิล", "วันออก 3%", "วันจ่าย", "รูปถ่ายบิล", "ลำดับ"].includes(key)
    );

    if (tableName === TABLES.DATA) {
      ensureBillVendorType(values);
      validateBillPatch(existing, patch, values);
    }

    if (!isFollowUpOrStatusPatch) {
      sanitizeBySchema(values, tableName);
      validateRequiredBySchema(values, tableName);
      if (tableName === TABLES.DATA) await validateBillRelations(values);
    }
    const isContractWork = tableName === TABLES.CONTRACT_WORK || tableName === "Contract_work" || tableName === "contract_works" || tableName === "ContractWork";
    const isProject = tableName === TABLES.PROJECT || tableName === "Project" || tableName === "projects";
    const output = isFollowUpOrStatusPatch
      ? values
      : isContractWork
        ? await applyContractFormulas(values)
        : isProject
          ? applyProjectFormulas(values)
          : tableName === TABLES.DATA
            ? await applyBillFormulas(values)
            : values;
    const row = await updateRow(tableName, sheetRow, output);
    await appendAuditLog({
      action: tableName === TABLES.DATA && Object.keys(patch).every(key => key === "สถานะ") ? "STATUS" : "UPDATE",
      tableName,
      key: String(row[TABLE_KEYS[tableName]] || ""),
      sheetRow,
      actor: actorFromRequest(request),
      details: Object.fromEntries(Object.keys(patch).map(key => [key, row[key] ?? ""]))
    }).catch(() => undefined);
    clearCache("rows:");
    return NextResponse.json({ ok: true, row });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const tableName = String(body.tableName || "");
    if (!canManageTable(tableName)) return NextResponse.json({ error: "Table is not manageable" }, { status: 403 });

    const rawKeys: (string | number)[] = Array.isArray(body.sheetRows) ? body.sheetRows : [];
    const keySet = new Set(rawKeys.map(k => String(k).trim()));
    const keyCol = TABLE_KEYS[tableName] || "id";
    const allRows = await getRows(tableName);
    const deletingRows = allRows.filter(row =>
      keySet.has(String(row._sheetRow)) ||
      keySet.has(String(row[keyCol])) ||
      (row["ลำดับ"] !== undefined && keySet.has(String(row["ลำดับ"]))) ||
      (row.id !== undefined && keySet.has(String(row.id))) ||
      (row.id_Conwork !== undefined && keySet.has(String(row.id_Conwork))) ||
      (row.id_store !== undefined && keySet.has(String(row.id_store))) ||
      (row.id_bank !== undefined && keySet.has(String(row.id_bank))) ||
      (row.id_Contractor !== undefined && keySet.has(String(row.id_Contractor))) ||
      (row.id_car !== undefined && keySet.has(String(row.id_car))) ||
      (row.id_cus !== undefined && keySet.has(String(row.id_cus))) ||
      (row.id_Company !== undefined && keySet.has(String(row.id_Company)))
    );

    const numericSheetRows = rawKeys.map(Number).filter(n => !isNaN(n));
    if (tableName === TABLES.PROJECT) await validateProjectDelete(numericSheetRows);
    if (tableName === TABLES.DATA) validateBillDelete(deletingRows);

    await deleteRows(tableName, rawKeys, deletingRows);
    await Promise.all(deletingRows.map(row => appendAuditLog({
      action: "DELETE",
      tableName,
      key: String(row[TABLE_KEYS[tableName]] || row.id || ""),
      sheetRow: Number(row._sheetRow) || 0,
      actor: actorFromRequest(request),
      details: { projectId: row["ID Project"] || "" }
    }).catch(() => undefined)));

    clearCache("rows:");
    return NextResponse.json({ ok: true, deleted: rawKeys.length });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

function validateBillPatch(existing: SheetRow, patch: SheetRow, values: SheetRow) {
  const patchKeys = Object.keys(patch).filter(key => key !== "_sheetRow");
  const statusOnly = patchKeys.length > 0 && patchKeys.every(key => key === "สถานะ");
  if (statusOnly) {
    validateBillStatusTransition(existing["สถานะ"], values["สถานะ"]);
    return;
  }
  if (!patch["สถานะ"]) {
    values["สถานะ"] = existing["สถานะ"] || "รออนุมัติ";
  }
}

function ensureBillVendorType(row: SheetRow) {
  const current = String(row["ร้านค้า/ผู้รับเหมา"] ?? row.vendor_type ?? "").trim();
  if (!current) {
    if (hasRowValue(row["ผู้รับเหมา"]) || hasRowValue(row.contractor_id)) {
      row["ร้านค้า/ผู้รับเหมา"] = "ผู้รับเหมา";
    } else {
      row["ร้านค้า/ผู้รับเหมา"] = "ร้านค้า";
    }
  }
}

function validateBillDelete(_deletingRows: SheetRow[]) {
  // Allow deleting bills
}

function canManageTable(tableName: string) {
  if (!tableName) return false;
  const knownTables = new Set([
    "Data", "bills", "data", "Data",
    "Project", "projects", "project",
    "ร้านค้า", "stores", "store",
    "รับเหมา", "contractors", "contractor",
    "งานรับเหมา", "contract_works", "ContractWork", "contractwork", "CONTRACT_WORK", "Contract_work",
    "รายชื่อ", "master_members", "PEOPLE", "Master Member", "people",
    "ธนาคาร", "banks", "bank", "BANK",
    "ทะเบียน", "cars", "car", "CAR",
    "ประเภท", "categories", "category",
    "ลูกค้า", "customers", "customer",
    "บริษัท", "companies", "company",
    "ยืมเงิน", "loans", "loan",
    "สินค้า", "products", "product"
  ]);
  if (knownTables.has(tableName)) return true;
  return PRIMARY_VIEWS.some(view => view.type === "table" && view.table === tableName);
}

function actorFromRequest(request: NextRequest) {
  const authName = request.cookies.get("auth_name")?.value;
  const authEmpId = request.cookies.get("auth_employee_id")?.value;
  return authName || authEmpId || request.headers.get("x-user-email") || "web";
}

function sanitizeBySchema(row: SheetRow, tableName: string) {
  const schema = getFormSchema(tableName);
  schema.forEach(field => {
    if (field.name === "สินค้า" && typeof row[field.name] === "string") {
      row[field.name] = (row[field.name] as string).replace(/^\d+\s*/, "");
    }
    if (field.type === "Hidden") return;
    if (isFieldVisible(field, row)) return;
    row[field.name] = "";
  });
  return row;
}

function validateRequiredBySchema(row: SheetRow, tableName: string) {
  const missing = getFormSchema(tableName).find(field => {
    if (!field.required || field.type === "Hidden" || field.readonly) return false;
    if (!isFieldVisible(field, row)) return false;
    return !hasRowValue(row[field.name]);
  });
  if (missing) throw new Error(`กรุณากรอก ${missing.name}`);
}

function isFieldVisible(field: ReturnType<typeof getFormSchema>[number], row: SheetRow) {
  if (!field.showIf) return true;
  const actual = row[field.showIf.column] || "";
  if (field.showIf.equals !== undefined) return String(actual) === field.showIf.equals;
  if (field.showIf.in) return field.showIf.in.includes(String(actual));
  if (field.showIf.notBlank) {
    if (field.showIf.column === "vat") return isVatActive(actual);
    if (field.showIf.column === "หัก") return parseDeductPercent(actual) > 0;
    if (field.showIf.column === "เครดิต") return parseCreditDays(actual) > 0;
    return hasRowValue(actual);
  }
  return true;
}

function hasRowValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

async function validateProjectDelete(sheetRows: number[]) {
  const [projects, dataRows, contractRows] = await Promise.all([
    getRows(TABLES.PROJECT),
    getRows(TABLES.DATA),
    getRows(TABLES.CONTRACT_WORK)
  ]);
  const deletingProjects = projects.filter(row => sheetRows.includes(Number(row._sheetRow)));
  const blocked = deletingProjects.flatMap(project => {
    const projectId = String(project["ID Project"] || "").trim();
    if (!projectId) return [];
    const billCount = dataRows.filter(row => String(row["ID Project"] || "").trim() === projectId).length;
    const contractCount = contractRows.filter(row => String(row["ID Project"] || "").trim() === projectId).length;
    return billCount || contractCount ? [`${projectId} (${billCount} บิล, ${contractCount} เปิดจ้าง)`] : [];
  });
  if (blocked.length) {
    throw new Error(`ลบ Project ไม่ได้ เพราะมีข้อมูลที่ผูกอยู่: ${blocked.slice(0, 5).join(", ")}`);
  }
}

async function readPostBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return request.json();
  }

  const formData = await request.formData();
  const tableName = String(formData.get("tableName") || "");
  const row: SheetRow = {};
  for (const [key, value] of formData.entries()) {
    if (key === "tableName" || isFile(value)) continue;
    row[key] = typeof value === "string" ? value : "";
  }
  await attachUploadedFiles(formData, tableName, row);
  return { tableName, row };
}

async function readPatchBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return request.json();
  }

  const formData = await request.formData();
  const tableName = String(formData.get("tableName") || "");
  const rawSheetRow = formData.get("sheetRow");
  const parsedNum = Number(rawSheetRow);
  const sheetRow = Number.isFinite(parsedNum) && String(rawSheetRow).trim() !== "" ? parsedNum : String(rawSheetRow || "").trim();

  const values: SheetRow = {};
  for (const [key, value] of formData.entries()) {
    if (key === "tableName" || key === "sheetRow" || isFile(value)) continue;
    values[key] = typeof value === "string" ? value : "";
  }
  await attachUploadedFiles(formData, tableName, values);
  return { tableName, sheetRow, values };
}

async function attachUploadedFiles(formData: FormData, tableName: string, row: SheetRow) {
  const filesByColumn = new Map<string, File[]>();
  for (const [key, value] of formData.entries()) {
    if (!isFile(value) || value.size <= 0) continue;
    if (!value.type.startsWith("image/")) continue;
    filesByColumn.set(key, [...(filesByColumn.get(key) || []), value]);
  }

  const extractedKey = String(formData.get("sheetRow") || row[TABLE_KEYS[tableName] || ""] || row.id_bank || row.id_store || row.id_Contractor || row.id || "");

  for (const [columnName, files] of filesByColumn) {
    const uploadedUrls = await Promise.all(
      files.map(file => uploadTableImage(file, {
        tableName,
        rowKey: extractedKey,
        columnName
      }))
    );
    row[columnName] = uploadedUrls.join(", ");
  }
}

function isFile(value: FormDataEntryValue): value is File {
  return Boolean(
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value
  );
}

