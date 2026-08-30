import type { SheetRow } from "@/lib/types";

/**
 * Escapes a cell value for standard CSV format (RFC 4180)
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type CsvColumnConfig = {
  header: string;
  key: string;
  format?: (value: any, row: SheetRow) => string;
};

export const DEFAULT_BILL_EXPORT_COLUMNS: CsvColumnConfig[] = [
  { header: "ลำดับ", key: "ลำดับ" },
  { header: "ว/ด/ป", key: "ว/ด/ป" },
  { header: "สถานะ", key: "สถานะ" },
  { header: "ชื่อ Project", key: "ชื่อ Project" },
  { header: "ร้าน/บุคคล", key: "ร้าน/บุคคล" },
  { header: "ร้านค้า/ผู้รับเหมา", key: "ร้านค้า/ผู้รับเหมา" },
  { header: "ประเภท", key: "ประเภท" },
  { header: "รายการ", key: "รายการ" },
  { header: "สินค้า/ทำงาน", key: "สินค้า/ทำงาน" },
  { header: "ยอดเงิน", key: "ยอดเงิน" },
  { header: "ยอดโอน", key: "ยอดโอน" },
  { header: "ค่าของ", key: "ค่าของ" },
  { header: "ค่าแรง", key: "ค่าแรง" },
  { header: "พนักงาน", key: "พนักงาน" },
  { header: "น้ำมัน", key: "น้ำมัน" },
  { header: "ซ่อมรถ", key: "ซ่อมรถ" },
  { header: "เครื่องจักร", key: "เครื่องจักร" },
  { header: "เครื่องมือ", key: "เครื่องมือ" },
  { header: "อื่นๆ", key: "อื่นๆ" },
  { header: "Vat 7%", key: "Vat 7%" },
  { header: "หัก ณ ที่จ่าย 3%", key: "หัก ณ ที่จ่าย 3%" },
  { header: "ผู้เบิก", key: "ผู้เบิก" },
  { header: "ผู้สร้างบิล", key: "ผู้สร้างบิล" },
  { header: "วันได้บิล", key: "วันได้บิล" },
  { header: "วันออก 3%", key: "วันออก 3%" },
  { header: "วันจ่าย", key: "วันจ่าย" },
  { header: "หมายเหตุ", key: "หมายเหตุ" },
];

/**
 * Generates and downloads a CSV file with Thai UTF-8 BOM encoding asynchronously
 */
export async function exportBillsToCsvAsync(
  rows: SheetRow[],
  filename = "รายงานบิล.csv",
  columns: CsvColumnConfig[] = DEFAULT_BILL_EXPORT_COLUMNS,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  if (typeof window === "undefined" || !rows || rows.length === 0) return false;

  return new Promise((resolve) => {
    // Run chunked generation in microtasks/requestAnimationFrame to prevent UI thread freezing
    const chunkSize = 200;
    const totalRows = rows.length;
    let currentRowIdx = 0;
    const csvLines: string[] = [];

    // Add Header Line
    const headerLine = columns.map(col => escapeCsvCell(col.header)).join(",");
    csvLines.push(headerLine);

    function processChunk() {
      const endIdx = Math.min(currentRowIdx + chunkSize, totalRows);

      for (let i = currentRowIdx; i < endIdx; i++) {
        const row = rows[i];
        const line = columns.map(col => {
          const rawVal = row[col.key] ?? (row as any)[col.key.toLowerCase()] ?? "";
          if (col.format) {
            return escapeCsvCell(col.format(rawVal, row));
          }
          return escapeCsvCell(rawVal);
        }).join(",");
        csvLines.push(line);
      }

      currentRowIdx = endIdx;
      if (onProgress) {
        onProgress(Math.round((currentRowIdx / totalRows) * 100));
      }

      if (currentRowIdx < totalRows) {
        // Yield execution to browser animation frame to keep 60 FPS
        requestAnimationFrame(processChunk);
      } else {
        // UTF-8 BOM header \uFEFF for seamless Microsoft Excel compatibility
        const csvContent = "\uFEFF" + csvLines.join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        resolve(true);
      }
    }

    // Start chunk processing
    processChunk();
  });
}
