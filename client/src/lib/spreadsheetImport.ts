import * as XLSX from "xlsx";
import type { SpreadsheetSheet, SpreadsheetCellType } from "@/lib/taskStorage";

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_ROWS_PER_SHEET = 500;
export const MAX_SHEETS = 20;

export function detectColumnType(values: string[]): SpreadsheetCellType {
  const sample = values.filter((v) => v !== "").slice(0, 25);
  if (sample.length === 0) return "text";
  const allNumbers = sample.every((v) => v !== "" && !isNaN(Number(v)));
  if (allNumbers) return "number";
  const allDates = sample.every((v) => !isNaN(Date.parse(v)) && /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(v));
  if (allDates) return "date";
  return "text";
}

export function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function parseWorkbook(buf: ArrayBuffer): { sheets: SpreadsheetSheet[]; warnings: string[] } {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const warnings: string[] = [];
  const totalSheetCount = wb.SheetNames.length;
  const sheetNames = wb.SheetNames.slice(0, MAX_SHEETS);
  if (totalSheetCount > MAX_SHEETS) {
    warnings.push(
      `This file has ${totalSheetCount} sheets; only the first ${MAX_SHEETS} were imported. The rest were not included.`
    );
  }
  const sheets: SpreadsheetSheet[] = [];
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    if (aoa.length === 0) continue;
    const rawHeaderRow = aoa[0] as unknown[];
    const headers = rawHeaderRow.map((h, i) => {
      const s = cellToString(h).trim();
      return s || `Column ${i + 1}`;
    });
    const allDataRows = aoa.slice(1).filter((r) =>
      Array.isArray(r) && r.some((c) => cellToString(c).trim() !== "")
    );
    if (allDataRows.length > MAX_ROWS_PER_SHEET) {
      warnings.push(
        `Sheet "${name}" has ${allDataRows.length} rows; only the first ${MAX_ROWS_PER_SHEET} were imported. The rest were not included.`
      );
    }
    const dataRows = allDataRows.slice(0, MAX_ROWS_PER_SHEET);
    const rows: string[][] = dataRows.map((r) => {
      const arr = r as unknown[];
      return headers.map((_, i) => cellToString(arr[i]));
    });
    const columnTypes: SpreadsheetCellType[] = headers.map((_, colIdx) =>
      detectColumnType(rows.map((r) => r[colIdx]))
    );
    sheets.push({ name, headers, columnTypes, rows });
  }
  return { sheets, warnings };
}

export interface ParsedSpreadsheetResult {
  fileName: string;
  sheets: SpreadsheetSheet[];
  warnings: string[];
}

/** Validates and parses an uploaded Excel file. Throws an Error with a
 *  user-friendly message on validation/parse failure. */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetResult> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    throw new Error("Please upload a .xlsx or .xls file.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 5MB). Please split it into smaller sheets.");
  }
  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch {
    throw new Error("Could not read this file. Make sure it's a valid, unprotected Excel file.");
  }
  let sheets: SpreadsheetSheet[];
  let warnings: string[];
  try {
    const parsed = parseWorkbook(buf);
    sheets = parsed.sheets;
    warnings = parsed.warnings;
  } catch (err) {
    console.error("Excel parse error:", err);
    throw new Error("Could not read this file. Make sure it's a valid, unprotected Excel file.");
  }
  if (sheets.length === 0) {
    throw new Error("This file doesn't contain any readable data.");
  }
  return { fileName: file.name, sheets, warnings };
}
