import { cached, clearCache } from "@/lib/cache";
import { TABLE_KEYS } from "@/lib/config";
import type { RefOption, TableRow, SheetRow } from "@/lib/types";
import {
  bulkInsertRowsToSupabase,
  deleteRowFromSupabase,
  deleteRowsFromSupabase,
  deleteStorageFilesFromSupabase,
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

/**
 * Fetch rows from Supabase PostgreSQL database with memory cache
 */
export async function getRows(tableName: string, _ttlMs?: number, maxRows = 10_000): Promise<TableRow[]> {
  const ttl = _ttlMs !== undefined ? _ttlMs : 5_000; // default 5 seconds short cache
  const cacheKey = `rows:${tableName}:${maxRows}`;

  return cached(cacheKey, ttl, async () => {
    try {
      const rows = await getRowsFromSupabase(tableName, maxRows);
      if (rows !== null && rows !== undefined) return rows;
      return [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`Supabase fetch failed for ${tableName}: ${msg}`);
      return [];
    }
  });
}

export const fetchTableRows = getRows;

/**
 * Get columns/headers for a Supabase table
 */
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

/**
 * Generate reference options for dropdowns from Supabase rows
 */
export async function listRefOptions(tableName: string, options: {
  keyColumn?: string;
  labelColumn?: string;
  validIf?: string;
  rowColumns?: string[];
  rows?: TableRow[];
} = {}): Promise<RefOption[]> {
  let rows = options.rows ? options.rows : await getRows(tableName, 120_000);
  if (options.validIf === "activeProjects") {
    rows = rows.filter(row => row.color === "Red" || row.color === "Green");
  }

  const keyColumn = options.keyColumn || TABLE_KEYS[tableName] || "id";
  const labelColumn = options.labelColumn || keyColumn;
  const rowColumns = unique([keyColumn, labelColumn, "image", "image_url", ...(options.rowColumns || [])]);

  return rows
    .filter(row => row[keyColumn] !== "" && row[keyColumn] !== undefined && row[keyColumn] !== null)
    .slice(0, 1000)
    .map(row => ({
      value: row[keyColumn],
      label: (tableName === "BANK" || tableName === "ธนาคาร" || tableName === "banks")
        ? String(row["ชื่อธนาคาร"] || row.name || row[labelColumn] || row[keyColumn])
        : row[labelColumn] ? String(row[labelColumn]) : String(row[keyColumn]),
      row: pick(row, rowColumns)
    }));
}

/**
 * Get system options from Supabase
 */
export async function getSystemOptions(): Promise<Record<string, string[]>> {
  try {
    const options = await getSystemOptionsFromSupabase();
    return options || {};
  } catch (e) {
    console.warn("Failed to fetch system options from Supabase", e);
    return {};
  }
}

/**
 * Insert new row into Supabase
 */
export async function appendRow(tableName: string, row: TableRow) {
  try {
    await insertRowToSupabase(tableName, row);
  } catch (e) {
    console.warn(`Supabase appendRow failed for ${tableName}:`, e);
    throw e;
  }
  clearCache(`rows:${tableName}`);
  clearCache(`headers:${tableName}`);
  clearCache("rows:");
}

export const createTableRow = appendRow;

/**
 * Bulk insert new rows into Supabase in a single batch query
 */
export async function bulkAppendRows(tableName: string, rows: TableRow[]) {
  try {
    const inserted = await bulkInsertRowsToSupabase(tableName, rows);
    clearCache(`rows:${tableName}`);
    clearCache(`headers:${tableName}`);
    clearCache("rows:");
    return inserted;
  } catch (e) {
    console.warn(`Supabase bulkAppendRows failed for ${tableName}:`, e);
    throw e;
  }
}

/**
 * Update an existing row in Supabase by primary key / ID
 */
export async function updateRow(tableName: string, sheetRow: number, patch: TableRow) {
  const keyColumn = TABLE_KEYS[tableName] || "id";
  const keyValue = patch[keyColumn] || patch.id || patch._sheetRow || sheetRow;

  try {
    await updateRowInSupabase(tableName, keyColumn, keyValue, patch);
  } catch (e) {
    console.warn(`Supabase updateRow failed for ${tableName}:`, e);
  }

  clearCache(`rows:${tableName}`);
  clearCache(`headers:${tableName}`);
  return patch;
}

export const updateTableRow = updateRow;

/**
 * Delete rows from Supabase in a single batch query
 */
export async function deleteRows(tableName: string, targetKeys: (number | string)[], targetRows?: TableRow[]) {
  const keys = [...new Set(targetKeys.map(r => String(r).trim()))];
  if (!keys.length) throw new Error("No items selected for deletion.");

  try {
    const keyColumn = TABLE_KEYS[tableName] || "id";
    const allRows = targetRows && targetRows.length ? targetRows : (await getRows(tableName).catch(() => []));
    const idsToDelete = new Set<string | number>();

    const imageUrls: string[] = [];

    for (const itemKey of keys) {
      const foundRow = allRows.find(r =>
        String(r._sheetRow) === itemKey ||
        String(r[keyColumn]) === itemKey ||
        String(r["ลำดับ"]) === itemKey ||
        String(r.id) === itemKey ||
        String(r.id_Conwork) === itemKey ||
        String(r.id_store) === itemKey ||
        String(r.id_bank) === itemKey ||
        String(r.id_Contractor) === itemKey ||
        String(r.id_car) === itemKey ||
        String(r.id_cus) === itemKey ||
        String(r.id_Company) === itemKey
      );
      if (foundRow) {
        const imgField = foundRow["รูปถ่ายบิล"] || foundRow["รูปถ่าย"] || foundRow["รูปภาพ"] || foundRow.image || foundRow.image_url;
        if (typeof imgField === "string" && imgField.trim()) {
          imageUrls.push(imgField.trim());
        }
      }
      const targetVal = foundRow?.id ?? foundRow?.[keyColumn] ?? foundRow?.id_Conwork ?? foundRow?.id_bank ?? foundRow?.id_store ?? foundRow?.id_Contractor ?? foundRow?.id_cus ?? foundRow?.id_Company ?? foundRow?.id_car ?? itemKey;
      if (typeof targetVal === "string" || typeof targetVal === "number") {
        if (String(targetVal).trim() !== "") {
          idsToDelete.add(targetVal);
        }
      }
    }

    if (imageUrls.length > 0) {
      await deleteStorageFilesFromSupabase(imageUrls).catch(err => {
        console.warn("Storage files cleanup warning:", err);
      });
    }

    if (idsToDelete.size > 0) {
      await deleteRowsFromSupabase(tableName, Array.from(idsToDelete));
    }
  } catch (e) {
    console.warn(`Supabase deleteRows failed for ${tableName}:`, e);
  }

  clearCache(`rows:${tableName}`);
  clearCache(`headers:${tableName}`);
}

export const deleteTableRows = deleteRows;

/**
 * Append audit log entry into Supabase audit_logs table
 */
export async function appendAuditLog(entry: AuditEntry) {
  await insertAuditLogToSupabase(entry).catch(() => undefined);
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function pick(row: TableRow, columns: string[]) {
  const output: TableRow = {};
  columns.forEach(col => {
    if (col in row) output[col] = row[col];
  });
  return output;
}
