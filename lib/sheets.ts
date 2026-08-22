import { cached, clearCache } from "@/lib/cache";
import { TABLE_KEYS } from "@/lib/config";
import type { RefOption, SheetRow } from "@/lib/types";
import {
  deleteRowFromSupabase,
  getRowsFromSupabase,
  getSystemOptionsFromSupabase,
  insertAuditLogToSupabase,
  insertRowToSupabase,
  isSupabaseConfigured,
  updateRowInSupabase,
} from "@/lib/supabase-db";

export type AuditEntry = {
  action: string;
  tableName: string;
  key?: string;
  sheetRow?: number;
  actor?: string;
  details?: Record<string, unknown>;
};

export async function getRows(tableName: string, _ttlMs?: number, maxRows = 10_000): Promise<SheetRow[]> {
  try {
    const rows = await getRowsFromSupabase(tableName, maxRows);
    if (rows !== null && rows !== undefined) return rows;
    return [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`Supabase fetch failed for ${tableName}: ${msg}`);
    return [];
  }
}

export async function getHeaders(tableName: string): Promise<string[]> {
  try {
    const data = await getRows(tableName);
    if (data.length) {
      return Object.keys(data[0]).filter(col => !col.startsWith("_"));
    }
    return [];
  } catch (e) {
    return [];
  }
}

export async function listRefOptions(tableName: string, options: {
  keyColumn?: string;
  labelColumn?: string;
  validIf?: string;
  rowColumns?: string[];
} = {}): Promise<RefOption[]> {
  let rows = await getRows(tableName, 120_000);
  if (options.validIf === "activeProjects") {
    rows = rows.filter(row => row.color === "Red" || row.color === "Green");
  }

  const keyColumn = options.keyColumn || TABLE_KEYS[tableName] || "_RowNumber";
  const labelColumn = options.labelColumn || keyColumn;
  const rowColumns = unique([keyColumn, labelColumn, "image", "image_url", ...(options.rowColumns || [])]);

  return rows
    .filter(row => row[keyColumn] !== "" && row[keyColumn] !== undefined && row[keyColumn] !== null)
    .slice(0, 1000)
    .map(row => ({
      value: row[keyColumn],
      label: (tableName === "BANK" || tableName === "ธนาคาร" || tableName === "banks")
        ? String(row["ชื่อธนาคาร"] || row.name || row[labelColumn] || row[keyColumn])
        : row[labelColumn] ? `${row[keyColumn]} - ${row[labelColumn]}` : String(row[keyColumn]),
      row: pick(row, rowColumns)
    }));
}

export async function getSystemOptions(): Promise<Record<string, string[]>> {
  try {
    const options = await getSystemOptionsFromSupabase();
    return options || {};
  } catch (e) {
    console.warn("Failed to fetch system options from Supabase", e);
    return {};
  }
}

export async function appendRow(tableName: string, row: SheetRow) {
  try {
    await insertRowToSupabase(tableName, row);
  } catch (e) {
    console.warn(`Supabase appendRow failed for ${tableName}:`, e);
  }
  clearCache(`rows:${tableName}`);
  clearCache(`headers:${tableName}`);
}

export async function updateRow(tableName: string, sheetRow: number, patch: SheetRow) {
  const keyColumn = TABLE_KEYS[tableName] || "_sheetRow";
  const keyValue = patch[keyColumn] || patch._sheetRow || patch.id || sheetRow;

  try {
    await updateRowInSupabase(tableName, keyColumn, keyValue, patch);
  } catch (e) {
    console.warn(`Supabase updateRow failed for ${tableName}:`, e);
  }

  clearCache(`rows:${tableName}`);
  clearCache(`headers:${tableName}`);
  return patch;
}

export async function deleteRows(tableName: string, sheetRows: (number | string)[], targetRows?: SheetRow[]) {
  const rows = [...new Set(sheetRows.map(r => String(r).trim()))];
  if (!rows.length) throw new Error("No rows selected.");

  try {
    const keyColumn = TABLE_KEYS[tableName] || "id";
    const allRows = targetRows && targetRows.length ? targetRows : (await getRows(tableName).catch(() => []));
    for (const sheetRow of rows) {
      const foundRow = allRows.find(r =>
        String(r._sheetRow) === sheetRow ||
        String(r[keyColumn]) === sheetRow ||
        String(r.id) === sheetRow ||
        String(r.id_store) === sheetRow ||
        String(r.id_bank) === sheetRow ||
        String(r.id_Contractor) === sheetRow
      );
      await deleteRowFromSupabase(tableName, keyColumn, sheetRow, foundRow);
    }
  } catch (e) {
    console.warn(`Supabase deleteRows failed for ${tableName}:`, e);
  }

  clearCache(`rows:${tableName}`);
  clearCache(`headers:${tableName}`);
}

export async function appendAuditLog(entry: AuditEntry) {
  await insertAuditLogToSupabase(entry).catch(() => undefined);
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function pick(row: SheetRow, columns: string[]) {
  const output: SheetRow = {};
  columns.forEach(col => {
    if (col in row) output[col] = row[col];
  });
  return output;
}
