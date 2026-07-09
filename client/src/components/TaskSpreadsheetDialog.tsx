import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { FileSpreadsheet, Upload, Download, FileText, Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  loadSpreadsheetForm,
  saveSpreadsheetForm,
  deleteSpreadsheetForm,
  type TaskSpreadsheetForm,
  type SpreadsheetSheet,
} from "@/lib/taskStorage";
import { parseSpreadsheetFile } from "@/lib/spreadsheetImport";

function sheetToCSV(sheet: SpreadsheetSheet): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [sheet.headers.map(escape).join(",")];
  for (const row of sheet.rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportSheetToPDF(sheet: SpreadsheetSheet, title: string) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const marginX = 36;
  let y = 48;
  pdf.setFontSize(14);
  pdf.text(title, marginX, y);
  y += 12;
  pdf.setFontSize(9);
  pdf.text(sheet.name, marginX, y);
  y += 16;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const usableWidth = pageWidth - marginX * 2;
  const colWidth = Math.max(60, usableWidth / Math.max(1, sheet.headers.length));
  const rowHeight = 16;
  const pageHeight = pdf.internal.pageSize.getHeight();

  const drawRow = (cells: string[], bold: boolean) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    cells.forEach((c, i) => {
      const text = c.length > 40 ? c.slice(0, 37) + "…" : c;
      pdf.text(text, marginX + i * colWidth, y);
    });
    y += rowHeight;
  };

  drawRow(sheet.headers, true);
  pdf.line(marginX, y - 10, pageWidth - marginX, y - 10);

  for (const row of sheet.rows) {
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = 48;
    }
    drawRow(row, false);
  }

  pdf.save(`${title.replace(/[^a-z0-9]+/gi, "-")}-${sheet.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}

function exportWorkbookToExcel(sheets: SpreadsheetSheet[], fileName: string) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const aoa = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31) || "Sheet1");
  }
  XLSX.writeFile(wb, fileName);
}

export function TaskSpreadsheetDialog({
  open,
  onClose,
  taskId,
  siteId,
  taskTitle,
  canEdit,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  siteId: string;
  taskTitle: string;
  canEdit: boolean;
  userName: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<TaskSpreadsheetForm | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setParseError(null);
    setActiveSheetIdx(0);
    setForm(loadSpreadsheetForm(taskId, siteId));
  }, [open, taskId, siteId]);

  async function handleFile(file: File) {
    setParseError(null);
    try {
      const { fileName, sheets, warnings } = await parseSpreadsheetFile(file);
      const now = new Date().toISOString();
      const newForm: TaskSpreadsheetForm = {
        taskId,
        siteId,
        fileName,
        sheets,
        uploadedAt: now,
        updatedAt: now,
        uploadedBy: userName,
      };
      saveSpreadsheetForm(newForm);
      setForm(newForm);
      setActiveSheetIdx(0);
      if (warnings.length > 0) {
        toast({
          title: "Spreadsheet imported with limits applied",
          description: warnings.join(" "),
          variant: "destructive",
        });
      } else {
        toast({ title: "Spreadsheet imported", description: `${sheets.length} sheet(s) loaded from ${fileName}` });
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read this file. Make sure it's a valid, unprotected Excel file.");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function scheduleSave(updated: TaskSpreadsheetForm) {
    setForm(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSpreadsheetForm(updated);
    }, 500);
  }

  function handleCellChange(sheetIdx: number, rowIdx: number, colIdx: number, value: string) {
    if (!form) return;
    const sheets = form.sheets.map((s, si) => {
      if (si !== sheetIdx) return s;
      const rows = s.rows.map((r, ri) => {
        if (ri !== rowIdx) return r;
        const row = [...r];
        row[colIdx] = value;
        return row;
      });
      return { ...s, rows };
    });
    scheduleSave({ ...form, sheets });
  }

  function handleRemove() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    deleteSpreadsheetForm(taskId, siteId);
    setForm(null);
    toast({ title: "Spreadsheet removed" });
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const activeSheet: SpreadsheetSheet | undefined = form?.sheets[activeSheetIdx];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="truncate">Spreadsheet — {taskTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to convert it into an editable form, or view and edit the previously attached data.
          </DialogDescription>
        </DialogHeader>

        {!form ? (
          <div className="flex-1 overflow-y-auto space-y-3">
            {canEdit ? (
              <div
                data-testid="dropzone-spreadsheet-upload"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Drop an Excel file here, or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">.xlsx or .xls, up to 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  data-testid="input-spreadsheet-file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center">No spreadsheet has been attached to this task yet.</p>
            )}
            {parseError && (
              <p className="text-xs text-red-600 flex items-center gap-1.5" data-testid="text-spreadsheet-error">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {parseError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-slate-500 truncate">
                {form.fileName} · updated {new Date(form.updatedAt).toLocaleString()}
              </p>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="button-remove-spreadsheet"
                  onClick={handleRemove}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove file
                </Button>
              )}
            </div>

            {form.sheets.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {form.sheets.map((s, i) => (
                  <button
                    key={s.name + i}
                    type="button"
                    data-testid={`tab-sheet-${i}`}
                    onClick={() => setActiveSheetIdx(i)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                      i === activeSheetIdx
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeSheet && activeSheet.rows.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">This sheet has no data rows.</p>
              )}
              {activeSheet?.rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  data-testid={`row-spreadsheet-${activeSheetIdx}-${rowIdx}`}
                  className="rounded-md border border-slate-200 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {activeSheet.headers.map((header, colIdx) => (
                    <div key={colIdx} className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-slate-400">{header}</Label>
                      <Input
                        type={activeSheet.columnTypes[colIdx] === "number" ? "number" : activeSheet.columnTypes[colIdx] === "date" ? "date" : "text"}
                        value={row[colIdx] ?? ""}
                        disabled={!canEdit}
                        data-testid={`input-cell-${activeSheetIdx}-${rowIdx}-${colIdx}`}
                        onChange={(e) => handleCellChange(activeSheetIdx, rowIdx, colIdx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-400 mr-1">Export:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-export-csv"
                onClick={() => activeSheet && downloadBlob(sheetToCSV(activeSheet), `${activeSheet.name || "sheet"}.csv`, "text/csv")}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-export-excel"
                onClick={() => exportWorkbookToExcel(form.sheets, form.fileName.replace(/\.(xlsx|xls)$/i, "") + "-export.xlsx")}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-export-pdf"
                onClick={() => activeSheet && exportSheetToPDF(activeSheet, taskTitle)}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
