export function parseDateStrict(value: unknown): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str || str === "-") return null;

  // 1. Check YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // 2. Check DD-MM-YYYY or DD/MM/YYYY (Thai locale: Day first, Month second!)
  const dmYMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmYMatch) {
    const day = Number(dmYMatch[1]);
    const month = Number(dmYMatch[2]);
    const rawY = Number(dmYMatch[3]);
    const year = rawY > 2400 ? rawY - 543 : rawY;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  return null;
}

export function formatDateDisplay(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const parsed = parseDateStrict(value);
  if (!parsed) return String(value || "-");
  const d = String(parsed.day).padStart(2, "0");
  const m = String(parsed.month).padStart(2, "0");
  return `${d}/${m}/${parsed.year}`;
}

export function toInputDateValue(value: unknown): string {
  if (!value) return "";
  const parsed = parseDateStrict(value);
  if (!parsed) return String(value);
  const d = String(parsed.day).padStart(2, "0");
  const m = String(parsed.month).padStart(2, "0");
  return `${parsed.year}-${m}-${d}`;
}

export function normalizeDateToIso(value: unknown): string {
  if (!value) return "";
  const parsed = parseDateStrict(value);
  if (!parsed) return String(value);
  const d = String(parsed.day).padStart(2, "0");
  const m = String(parsed.month).padStart(2, "0");
  return `${parsed.year}-${m}-${d}`;
}
