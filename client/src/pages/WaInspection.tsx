import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { getUserProfile } from "@/lib/userProfile";
import { WA_SECTIONS, WA_DOC_REVIEW_ITEMS } from "@/lib/waInspectionData";
import type { WaItem } from "@/lib/waInspectionData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Printer, Save, ChevronDown, ChevronRight, AlertCircle, Archive, Clock, CheckCircle2, FolderOpen, Plus } from "lucide-react";
import type { WaInspectionArchive } from "@shared/schema";

// Per-store localStorage keys isolate each site's form data.
// Falls back to the legacy shared key on first read so existing data migrates.
const LEGACY_STORAGE_KEY = "koheez_wa_inspection";
function getStorageKey(siteId: string): string {
  return siteId ? `koheez_wa_inspection_${siteId}` : LEGACY_STORAGE_KEY;
}
type YNAValue = "yes" | "no" | "na" | "";

// The WA inspection cycle starts March 1 each year.
// e.g. Jan/Feb 2026 → 2025 cycle; Mar–Dec 2026 → 2026 cycle.
function getCycleYear(date = new Date()): number {
  return date.getMonth() >= 2 ? date.getFullYear() : date.getFullYear() - 1;
}

interface WaFormState {
  completionDate: string;
  changeInManager: string;
  changeDate: string;
  managerName: string;
  managerLicense: string;
  managerEmail: string;
  pharmacyName: string;
  pharmacyFax: string;
  pharmacyDea: string;
  pharmacyPhone: string;
  pharmacyAddress: string;
  pharmacyLicense: string;
  endorsementAncillary: boolean;
  endorsementControlled: boolean;
  compoundingNonSterile: string;
  compoundingSterile: string;
  addendumLtc: string;
  addendumHospital: string;
  addendumNuclear: string;
  docLocations: Record<string, string>;
  responses: Record<string, YNAValue>;
  notes: Record<string, string>;
  itemLocations: Record<string, string>;
  finalSignature: string;
  finalDate: string;
}

function buildDefault(pharmacyName: string): WaFormState {
  return {
    completionDate: new Date().toISOString().slice(0, 10),
    changeInManager: "",
    changeDate: "",
    managerName: "",
    managerLicense: "",
    managerEmail: "",
    pharmacyName,
    pharmacyFax: "",
    pharmacyDea: "",
    pharmacyPhone: "",
    pharmacyAddress: "",
    pharmacyLicense: "",
    endorsementAncillary: false,
    endorsementControlled: false,
    compoundingNonSterile: "",
    compoundingSterile: "",
    addendumLtc: "",
    addendumHospital: "",
    addendumNuclear: "",
    docLocations: {},
    responses: {},
    notes: {},
    itemLocations: {},
    finalSignature: "",
    finalDate: new Date().toISOString().slice(0, 10),
  };
}

function loadState(siteId: string, defaultPharmacyName: string): WaFormState {
  try {
    const key = getStorageKey(siteId);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as WaFormState;
    // One-time migration: fall back to legacy shared key if new key is empty
    if (siteId) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as WaFormState;
        // Only migrate if the stored pharmacy name matches this store
        if (!parsed.pharmacyName || parsed.pharmacyName === defaultPharmacyName) {
          localStorage.setItem(key, legacy);
          return parsed;
        }
      }
    }
  } catch {}
  return buildDefault(defaultPharmacyName);
}

function saveState(siteId: string, state: WaFormState): void {
  try {
    localStorage.setItem(getStorageKey(siteId), JSON.stringify(state));
  } catch {}
}

function parseItemId(id: string): { num: string; sub: string } {
  // Handle "29-header" style IDs — extract the leading number
  const headerMatch = id.match(/^(\d+)-/);
  if (headerMatch) return { num: headerMatch[1], sub: "" };
  const m = id.match(/^(\d+)([a-z]?)$/);
  if (!m) return { num: "", sub: "" };
  return { num: m[1], sub: m[2] };
}

function Chk({ checked }: { checked: boolean }) {
  return <span style={{ fontFamily: "Arial, sans-serif", fontSize: "12pt" }}>{checked ? "☑" : "☐"}</span>;
}

function YNAButtons({ id, value, naOption, onChange }: {
  id: string; value: YNAValue; naOption?: boolean; onChange: (v: YNAValue) => void;
}) {
  return (
    <div className="flex gap-1 items-center" data-testid={`yna-${id}`}>
      {(["yes", "no", ...(naOption ? ["na"] : [])] as YNAValue[]).map((opt) => (
        <button
          key={opt}
          type="button"
          data-testid={`yna-${id}-${opt}`}
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`text-xs font-semibold px-2 py-1 rounded border transition-colors ${
            value === opt
              ? opt === "yes" ? "bg-green-600 text-white border-green-600"
              : opt === "no" ? "bg-red-600 text-white border-red-600"
              : "bg-amber-500 text-white border-amber-500"
              : "bg-transparent border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          {opt === "yes" ? "Yes" : opt === "no" ? "No" : "N/A"}
        </button>
      ))}
    </div>
  );
}

function ChecklistRow({ item, response, note, location, onResponse, onNote, onLocation }: {
  item: WaItem; response: YNAValue; note: string; location: string;
  onResponse: (v: YNAValue) => void; onNote: (v: string) => void; onLocation: (v: string) => void;
}) {
  const { num, sub } = parseItemId(item.id);
  const displayId = sub ? `${num}.${sub}` : num;

  if (item.noCheckbox) {
    return (
      <div className="border-b border-border py-2 bg-muted/20">
        <div className="flex gap-3 items-center px-0">
          <span className="text-xs font-mono font-bold text-foreground w-8 shrink-0">{displayId}</span>
          <p className="text-sm font-semibold text-foreground flex-1">{item.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-b border-border last:border-b-0 py-3 ${item.highlighted ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}>
      <div className="flex gap-3 items-start">
        <span className="text-xs font-mono text-muted-foreground w-8 shrink-0 pt-0.5">{displayId}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">{item.text}</p>
          {item.rule && <p className="text-xs text-muted-foreground mt-0.5">{item.rule}</p>}
          {item.locationField && (
            <input type="text" placeholder="Location or file pathway:" value={location}
              onChange={(e) => onLocation(e.target.value)}
              className="mt-1.5 w-full text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid={`location-${item.id}`}
            />
          )}
          <textarea
            placeholder="Notes / Corrective Action (optional)"
            value={note} onChange={(e) => onNote(e.target.value)}
            rows={note ? 2 : 1}
            className="mt-1.5 w-full text-xs border border-border rounded px-2 py-1 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
            data-testid={`notes-${item.id}`}
          />
        </div>
        <div className="shrink-0">
          <YNAButtons id={item.id} value={response} naOption={true} onChange={onResponse} />
        </div>
      </div>
    </div>
  );
}

function SectionPanel({ section, state, onResponse, onNote, onLocation }: {
  section: (typeof WA_SECTIONS)[0]; state: WaFormState;
  onResponse: (id: string, v: YNAValue) => void;
  onNote: (id: string, v: string) => void;
  onLocation: (id: string, v: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const checkableItems = section.items.filter((i) => !i.noCheckbox);
  const answered = checkableItems.filter((i) => state.responses[i.id] && state.responses[i.id] !== "").length;
  const total = checkableItems.length;
  const hasIssue = checkableItems.some((i) => state.responses[i.id] === "no");

  return (
    <div className="border border-border rounded-md overflow-hidden mb-3">
      <button type="button"
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
        data-testid={`section-toggle-${section.id}`}
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <span className="font-semibold text-sm flex-1">{section.title}</span>
        <span className="text-xs text-muted-foreground">{answered}/{total}</span>
        {hasIssue && <AlertCircle className="w-4 h-4 text-red-500" />}
      </button>
      {open && (
        <div className="px-4">
          {section.note && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2 mt-3 mb-1">
              {section.note}
            </p>
          )}
          {section.items.map((item) => (
            <ChecklistRow key={item.id} item={item}
              response={state.responses[item.id] ?? ""}
              note={state.notes[item.id] ?? ""}
              location={state.itemLocations[item.id] ?? ""}
              onResponse={(v) => onResponse(item.id, v)}
              onNote={(v) => onNote(item.id, v)}
              onLocation={(v) => onLocation(item.id, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, testId }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; testId?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} data-testid={testId}
        className="text-sm border border-border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function YesNoRadio({ label, value, onChange, testId }: {
  label: string; value: string; onChange: (v: string) => void; testId?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm flex-1">{label}</span>
      <div className="flex gap-2" data-testid={testId}>
        {["yes", "no"].map((opt) => (
          <label key={opt} className="flex items-center gap-1 cursor-pointer text-sm">
            <input type="radio" checked={value === opt} onChange={() => onChange(value === opt ? "" : opt)} className="accent-primary" />
            <span>{opt === "yes" ? "Yes" : "No"}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── Print-only field display ── */
function PF({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <td style={{ padding: "2pt 4pt", verticalAlign: "bottom", width: wide ? undefined : undefined }}>
      <span style={{ fontSize: "8pt", fontWeight: "bold" }}>{label}: </span>
      <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: wide ? "200pt" : "120pt", fontSize: "9pt" }}>
        {value || "\u00a0"}
      </span>
    </td>
  );
}

/* ── DOH-format checklist table row ── */
function PrintRow({ item, resp, note }: { item: WaItem; resp: YNAValue; note: string }) {
  const { num, sub } = parseItemId(item.id);
  const isHighlighted = item.highlighted;
  const bgStyle = isHighlighted ? { backgroundColor: "#dbeafe" } : {};

  if (item.noCheckbox) {
    return (
      <tr style={bgStyle}>
        <td style={{ textAlign: "center", padding: "2pt", width: "3%" }}>—</td>
        <td style={{ textAlign: "center", padding: "2pt", width: "3%" }}>—</td>
        <td style={{ textAlign: "center", padding: "2pt", width: "4%", color: "#aaa" }}>—</td>
        <td style={{ textAlign: "center", padding: "2pt 4pt", width: "5%" }}>{num || ""}</td>
        <td style={{ padding: "2pt 4pt", width: "34%", fontSize: "8pt", lineHeight: "1.25", fontWeight: "bold" }}>
          {item.text}
        </td>
        <td style={{ padding: "2pt 4pt", width: "36%", fontSize: "7.5pt", lineHeight: "1.2", color: "#222", whiteSpace: "pre-line" }}>
          {item.rule || ""}
        </td>
        <td style={{ padding: "2pt 4pt", width: "15%", fontSize: "8pt", color: "#333" }}>{"\u00a0"}</td>
      </tr>
    );
  }

  return (
    <tr style={bgStyle}>
      <td style={{ textAlign: "center", padding: "2pt", width: "3%" }}><Chk checked={resp === "yes"} /></td>
      <td style={{ textAlign: "center", padding: "2pt", width: "3%" }}><Chk checked={resp === "no"} /></td>
      <td style={{ textAlign: "center", padding: "2pt", width: "4%" }}>
        <Chk checked={resp === "na"} />
      </td>
      <td style={{ textAlign: "center", padding: "2pt 4pt", width: "5%", fontWeight: sub ? "normal" : "bold", whiteSpace: "nowrap" }}>
        {sub ? `${num}.${sub.toUpperCase()}` : num}
      </td>
      <td style={{ padding: "2pt 4pt", width: "34%", fontSize: "8pt", lineHeight: "1.25" }}>
        {item.text}
        {item.locationField && (
          <div style={{ marginTop: "2pt" }}>
            <span style={{ fontSize: "7.5pt" }}>Location or file pathway: </span>
            <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "100pt", fontSize: "8pt" }}>
              {"\u00a0"}
            </span>
          </div>
        )}
      </td>
      <td style={{ padding: "2pt 4pt", width: "36%", fontSize: "7.5pt", lineHeight: "1.2", color: "#222", whiteSpace: "pre-line" }}>
        {item.rule || ""}
      </td>
      <td style={{ padding: "2pt 4pt", width: "15%", fontSize: "8pt", color: "#333" }}>
        {note || "\u00a0"}
      </td>
    </tr>
  );
}

/* ────────────────────────────────────── */
export default function WaInspection() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;
  const defaultPharmacyName = profile?.siteName ?? "";
  const siteId = profile?.siteId ?? "";
  const currentCycleYear = getCycleYear();

  // Which archive year's data is loaded into the form right now
  const [viewingYear, setViewingYear] = useState<number>(currentCycleYear);
  const [state, setState] = useState<WaFormState>(() => loadState(siteId, defaultPharmacyName));
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [serverSaving, setServerSaving] = useState(false);
  const serverSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialServerLoadDone = useRef(false);

  // Fetch all archives for this site
  const { data: archives = [] } = useQuery<WaInspectionArchive[]>({
    queryKey: ["/api/wa-inspection", siteId, "archives"],
    queryFn: async () => {
      if (!siteId || siteId === "ALL") return [];
      const res = await fetch(`/api/wa-inspection/${siteId}/archives`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!siteId && siteId !== "ALL",
    staleTime: 30_000,
  });

  // Save to server
  const saveMutation = useMutation({
    mutationFn: async ({ year, formState }: { year: number; formState: WaFormState }) => {
      const status: "in-progress" | "completed" = formState.finalSignature ? "completed" : "in-progress";
      await apiRequest("PUT", `/api/wa-inspection/${siteId}/archives/${year}`, { status, data: formState });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wa-inspection", siteId, "archives"] });
      setServerSaving(false);
    },
    onError: () => setServerSaving(false),
  });

  // On first load: hydrate state from server archive for current cycle year.
  // If no server archive exists yet, immediately push local state so the archive
  // card reflects the correct status (including "completed" if already signed).
  useEffect(() => {
    if (initialServerLoadDone.current || !siteId || siteId === "ALL") return;
    fetch(`/api/wa-inspection/${siteId}/archives/${currentCycleYear}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((archive: WaInspectionArchive | null) => {
        if (archive?.data) {
          const loaded = archive.data as WaFormState;
          setState(loaded);
          saveState(siteId, loaded);
          initialServerLoadDone.current = true;
        } else {
          // No server archive yet — use saveMutation (same path as the debounced
          // save) so the archive card shows the correct status immediately.
          initialServerLoadDone.current = true;
          saveMutation.mutate({ year: currentCycleYear, formState: state });
        }
      })
      .catch(() => { initialServerLoadDone.current = true; });
  }, [siteId, currentCycleYear]);

  const persist = useCallback((s: WaFormState) => {
    saveState(siteId, s);
    setSavedAt(new Date());
  }, [siteId]);

  useEffect(() => {
    const t = setTimeout(() => persist(state), 400);
    return () => clearTimeout(t);
  }, [state, persist]);

  // Debounce server save (2s after last change)
  useEffect(() => {
    if (!initialServerLoadDone.current || !siteId || siteId === "ALL") return;
    if (serverSaveTimer.current) clearTimeout(serverSaveTimer.current);
    setServerSaving(true);
    serverSaveTimer.current = setTimeout(() => {
      saveMutation.mutate({ year: viewingYear, formState: state });
    }, 2000);
    return () => { if (serverSaveTimer.current) clearTimeout(serverSaveTimer.current); };
  }, [state, viewingYear, siteId]);

  // Immediate save when signature is entered — cancels debounce and saves right away
  useEffect(() => {
    if (!initialServerLoadDone.current || !siteId || siteId === "ALL") return;
    if (!state.finalSignature) return;
    if (serverSaveTimer.current) clearTimeout(serverSaveTimer.current);
    setServerSaving(true);
    saveMutation.mutate({ year: viewingYear, formState: state });
  }, [state.finalSignature]);

  // Load a specific year's archive into the form
  function openArchiveYear(archive: WaInspectionArchive) {
    const data = archive.data as WaFormState;
    setViewingYear(archive.year);
    setState(data);
    saveState(siteId, data);
  }

  // Start a fresh form for the current cycle year
  function startNewCycle() {
    const fresh = buildDefault(defaultPharmacyName);
    setViewingYear(currentCycleYear);
    setState(fresh);
    saveState(siteId, fresh);
  }

  function patch(updates: Partial<WaFormState>) {
    setState((s) => ({ ...s, ...updates }));
  }
  function setResponse(id: string, v: YNAValue) {
    setState((s) => ({ ...s, responses: { ...s.responses, [id]: v } }));
  }
  function setNote(id: string, v: string) {
    setState((s) => ({ ...s, notes: { ...s.notes, [id]: v } }));
  }
  function setItemLocation(id: string, v: string) {
    setState((s) => ({ ...s, itemLocations: { ...s.itemLocations, [id]: v } }));
  }
  function setDocLocation(id: string, v: string) {
    setState((s) => ({ ...s, docLocations: { ...s.docLocations, [id]: v } }));
  }

  const allItems = WA_SECTIONS.flatMap((s) => s.items.filter((i) => !i.noCheckbox));
  const totalItems = allItems.length;
  const answeredItems = allItems.filter((i) => state.responses[i.id] && state.responses[i.id] !== "").length;
  const noItems = allItems.filter((i) => state.responses[i.id] === "no").length;
  const completionPct = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  // Archive card list: include all server archives + ensure current year appears
  const archiveCards: WaInspectionArchive[] = (() => {
    const hasCurrentYear = archives.some((a) => a.year === currentCycleYear);
    const base = hasCurrentYear ? archives : [
      { siteId, year: currentCycleYear, status: "in-progress" as const, data: state, createdAt: "", updatedAt: "" },
      ...archives,
    ];
    return base.sort((a, b) => b.year - a.year);
  })();

  /* Shared print table cell border style */
  const tb: React.CSSProperties = { border: "1px solid #000" };

  return (
    <>
      <style>{`
        @media print {
          body, html { margin: 0; padding: 0; }
          header, [data-testid="button-clinical-tools-panel"], [data-testid="panel-clinical-tools"] { display: none !important; }
          .wa-screen-only { display: none !important; }
          .wa-print-only { display: block !important; }
          @page {
            size: letter;
            margin: 0.55in 0.55in 0.75in 0.55in;
            @bottom-left {
              content: "DOH 690-318 (January 2026)";
              font-family: Arial, sans-serif;
              font-size: 7.5pt;
            }
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: Arial, sans-serif;
              font-size: 7.5pt;
            }
          }
          .wa-page-break { page-break-before: always; break-before: page; }
          .wa-avoid-break { page-break-inside: avoid; break-inside: avoid; }
          .wa-print-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            font-size: 8pt;
          }
          .wa-print-table th, .wa-print-table td {
            border: 1px solid #000;
            vertical-align: top;
          }
          .wa-section-row td {
            background: #c8c8c8 !important;
            font-weight: bold;
            font-size: 9pt;
            padding: 3pt 6pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .wa-highlighted tr td, tr.wa-highlighted-row td {
            background: #dbeafe !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .wa-print-table thead {
            display: table-header-group;
          }
          .wa-print-table tfoot {
            display: table-footer-group;
          }
          .wa-doc-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            font-size: 8pt;
          }
          .wa-doc-table th, .wa-doc-table td {
            border: 1px solid #000;
            padding: 3pt 5pt;
            vertical-align: top;
          }
        }
        .wa-print-only { display: none; }
      `}</style>

      {/* ══════════════════════════════════════ */}
      {/* SCREEN VIEW                           */}
      {/* ══════════════════════════════════════ */}
      <div className="wa-screen-only max-w-4xl mx-auto px-4 pb-16">
        {/* Sticky toolbar */}
        <div className="sticky top-14 z-10 bg-background border-b border-border py-2 mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-base leading-tight">WA General Pharmacy Self-Inspection Worksheet</h1>
            <p className="text-xs text-muted-foreground">
              DOH 690-318 — Cycle {viewingYear}
              {viewingYear !== currentCycleYear && <span className="ml-2 text-amber-600 dark:text-amber-400">(viewing past record)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {serverSaving
              ? <span className="text-xs text-muted-foreground hidden sm:inline">Saving…</span>
              : savedAt && <span className="text-xs text-muted-foreground hidden sm:inline">Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            }
            <Badge variant="outline" className="text-xs">{answeredItems}/{totalItems}</Badge>
            {noItems > 0 && <Badge variant="destructive" className="text-xs">{noItems} issue{noItems !== 1 ? "s" : ""}</Badge>}
            <Button size="sm" variant="outline" onClick={() => { persist(state); saveMutation.mutate({ year: viewingYear, formState: state }); }} data-testid="btn-wa-save">
              <Save className="w-3.5 h-3.5 mr-1" />Save
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="btn-wa-print">
              <Printer className="w-3.5 h-3.5 mr-1" />Print / PDF
            </Button>
          </div>
        </div>

        {/* ── Archive section ── */}
        <div className="mb-5 border border-border rounded-md p-4">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Inspection Archive</span>
              <span className="text-xs text-muted-foreground">— one record per cycle year, stored permanently on the server</span>
            </div>
            {viewingYear !== currentCycleYear && (
              <Button size="sm" variant="outline" onClick={() => {
                const current = archives.find((a) => a.year === currentCycleYear);
                if (current) { openArchiveYear(current); } else { startNewCycle(); }
              }} data-testid="btn-wa-return-current">
                <Plus className="w-3.5 h-3.5 mr-1" />Return to Current Cycle
              </Button>
            )}
          </div>
          {archiveCards.length === 0 ? (
            <p className="text-xs text-muted-foreground">No records yet — start filling out the form below to create the {currentCycleYear} cycle record.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {archiveCards.map((arc) => {
                const isViewing = arc.year === viewingYear;
                const isCurrentCycle = arc.year === currentCycleYear;
                const updatedLabel = arc.updatedAt
                  ? new Date(arc.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                  : null;
                return (
                  <div
                    key={arc.year}
                    className={`shrink-0 rounded-md border p-3 w-40 cursor-pointer transition-colors ${
                      isViewing ? "border-primary bg-primary/5" : "border-border hover-elevate"
                    }`}
                    onClick={() => !isViewing && openArchiveYear(arc)}
                    data-testid={`archive-card-${arc.year}`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="font-bold text-sm">{arc.year}</span>
                      {isCurrentCycle && <Badge variant="outline" className="text-xs px-1 py-0">Current</Badge>}
                    </div>
                    <div className="mb-2">
                      {arc.status === "completed" ? (
                        <Badge className="text-xs bg-green-600 text-white border-0 gap-1">
                          <CheckCircle2 className="w-3 h-3" />Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-400">
                          <Clock className="w-3 h-3" />In Progress
                        </Badge>
                      )}
                    </div>
                    {(() => {
                      const d = arc.data as WaFormState | undefined;
                      const name = d?.finalSignature || d?.managerName;
                      return name ? <p className="text-xs text-foreground font-medium truncate mt-1">{name}</p> : null;
                    })()}
                    {updatedLabel && <p className="text-xs text-muted-foreground">{updatedLabel}</p>}
                    {isViewing ? (
                      <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                        <FolderOpen className="w-3 h-3" />Open
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Click to open</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Cycle {viewingYear} — Completion</span><span>{completionPct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        {/* Pharmacy info */}
        <div className="border border-border rounded-md p-4 mb-3">
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Pharmacy Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Date of Completion" value={state.completionDate} onChange={(v) => patch({ completionDate: v })} type="date" testId="input-completion-date" />
            <Field label="Pharmacy Name" value={state.pharmacyName} onChange={(v) => patch({ pharmacyName: v })} placeholder="Pharmacy name" testId="input-pharmacy-name" />
            <Field label="Pharmacy License #" value={state.pharmacyLicense} onChange={(v) => patch({ pharmacyLicense: v })} placeholder="License number" testId="input-pharmacy-license" />
            <Field label="DEA Registration #" value={state.pharmacyDea} onChange={(v) => patch({ pharmacyDea: v })} placeholder="DEA number" testId="input-pharmacy-dea" />
            <Field label="Phone" value={state.pharmacyPhone} onChange={(v) => patch({ pharmacyPhone: v })} placeholder="(xxx) xxx-xxxx" type="tel" testId="input-pharmacy-phone" />
            <Field label="Fax" value={state.pharmacyFax} onChange={(v) => patch({ pharmacyFax: v })} placeholder="(xxx) xxx-xxxx" type="tel" testId="input-pharmacy-fax" />
            <div className="sm:col-span-2">
              <Field label="Address" value={state.pharmacyAddress} onChange={(v) => patch({ pharmacyAddress: v })} placeholder="Street, City, State, ZIP" testId="input-pharmacy-address" />
            </div>
          </div>
        </div>

        {/* Manager info */}
        <div className="border border-border rounded-md p-4 mb-3">
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Responsible Pharmacy Manager</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Print Name" value={state.managerName} onChange={(v) => patch({ managerName: v })} placeholder="Full name" testId="input-manager-name" />
            <Field label="WA License #" value={state.managerLicense} onChange={(v) => patch({ managerLicense: v })} placeholder="License number" testId="input-manager-license" />
            <Field label="Email" value={state.managerEmail} onChange={(v) => patch({ managerEmail: v })} placeholder="email@pharmacy.com" type="email" testId="input-manager-email" />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Change in RPM since last inspection?</label>
              <div className="flex gap-3" data-testid="select-change-manager">
                {["yes", "no"].map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={state.changeInManager === opt}
                      onChange={() => patch({ changeInManager: state.changeInManager === opt ? "" : opt })}
                      className="accent-primary" />
                    {opt === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>
            {state.changeInManager === "yes" && (
              <Field label="Date of Change" value={state.changeDate} onChange={(v) => patch({ changeDate: v })} type="date" testId="input-change-date" />
            )}
          </div>
        </div>

        {/* Endorsements & Addenda */}
        <div className="border border-border rounded-md p-4 mb-3">
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Endorsements & Addenda</h2>
          <div className="space-y-2 mb-3">
            {[
              { key: "endorsementAncillary" as const, label: "Use of Ancillary Personnel" },
              { key: "endorsementControlled" as const, label: "Dispense Controlled Substances" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={state[key] as boolean}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                  className="accent-primary" data-testid={`check-${key}`}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            {[
              { key: "compoundingNonSterile" as const, label: "Does the pharmacy engage in non-sterile compounding?" },
              { key: "compoundingSterile" as const, label: "Does the pharmacy engage in sterile compounding?" },
              { key: "addendumLtc" as const, label: "Does the pharmacy fill prescriptions for LTC/hospice residents?" },
              { key: "addendumHospital" as const, label: "Is the pharmacy licensed as a hospital pharmacy and/or have HPACs?" },
              { key: "addendumNuclear" as const, label: "Does the pharmacy have a Nuclear Pharmacy endorsement?" },
            ].map(({ key, label }) => (
              <YesNoRadio key={key} label={label} value={state[key] as string}
                onChange={(v) => patch({ [key]: v })} testId={`radio-${key}`} />
            ))}
          </div>
        </div>

        {/* Document Review */}
        <div className="border border-border rounded-md p-4 mb-3">
          <h2 className="font-semibold text-sm mb-1 text-muted-foreground uppercase tracking-wide">Document and Record Review</h2>
          <p className="text-xs text-muted-foreground mb-3">Provide the location (or file path) of each required document.</p>
          <div className="space-y-2">
            {WA_DOC_REVIEW_ITEMS.map((doc) => (
              <div key={doc.id} className="border-b border-border last:border-b-0 pb-2 last:pb-0">
                <p className="text-sm leading-snug">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{doc.rule}</p>
                <input type="text" placeholder="Location or file pathway"
                  value={state.docLocations[doc.id] ?? ""}
                  onChange={(e) => setDocLocation(doc.id, e.target.value)}
                  className="mt-1 w-full text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid={`doc-loc-${doc.id}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-green-600" />Yes</div>
          <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-red-600" />No — action required</div>
          <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-amber-500" />N/A</div>
          <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-blue-200 dark:bg-blue-900" />Common non-compliance</div>
        </div>

        {/* Checklist */}
        {WA_SECTIONS.map((section) => (
          <SectionPanel key={section.id} section={section} state={state}
            onResponse={setResponse} onNote={setNote} onLocation={setItemLocation} />
        ))}

        {/* Signature */}
        <div className="border border-border rounded-md p-4 mb-3">
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Certification & Signature</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Responsible Pharmacy Manager Signature (type full name)"
              value={state.finalSignature} onChange={(v) => patch({ finalSignature: v })}
              placeholder="Type full legal name as signature" testId="input-final-signature" />
            <Field label="Date" value={state.finalDate} onChange={(v) => patch({ finalDate: v })} type="date" testId="input-final-date" />
          </div>
        </div>

        {/* Issues summary */}
        {noItems > 0 && (
          <div className="border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20 rounded-md p-4 mb-3">
            <h2 className="font-semibold text-sm text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />Items Requiring Corrective Action ({noItems})
            </h2>
            <div className="space-y-1">
              {allItems.filter((i) => state.responses[i.id] === "no").map((item) => (
                <div key={item.id} className="flex gap-2 text-xs">
                  <span className="font-mono text-muted-foreground w-8 shrink-0">{item.id}</span>
                  <span>{item.text.slice(0, 120)}{item.text.length > 120 ? "…" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          WA Pharmacy Quality Assurance Commission — DOH 690-318 — Do not send to the commission office.
        </p>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* PRINT-ONLY VIEW (DOH format)          */}
      {/* ══════════════════════════════════════ */}
      <div className="wa-print-only" style={{ fontFamily: "Arial, sans-serif", fontSize: "9pt", color: "#000" }}>

        {/* ── PAGE 1: Read This Page Carefully ── */}
        <div style={{ marginBottom: "0" }}>
          <div style={{ textAlign: "center", marginBottom: "10pt" }}>
            <div style={{ fontWeight: "bold", fontSize: "11pt" }}>Read this Page Carefully</div>
            <div style={{ fontWeight: "bold", fontSize: "11pt" }}>WA Pharmacy Quality Assurance Commission</div>
            <div style={{ fontWeight: "bold", fontSize: "11pt" }}>2026 General Pharmacy Self-Inspection Worksheet</div>
          </div>

          <p style={{ fontWeight: "bold", marginBottom: "6pt" }}>Attention: Responsible Pharmacy Manager or Equivalent Manager</p>
          <p style={{ marginBottom: "6pt", lineHeight: "1.45" }}>
            Washington law holds the responsible pharmacy manager (or equivalent manager) and all pharmacists on duty responsible for ensuring pharmacy compliance with all state and federal laws governing the practice of pharmacy. Failure to complete this annual worksheet and applicable self-inspection worksheet addendums within the month of March and within 30 days of becoming responsible pharmacy manager (as required by WAC 246-945-005) may result in disciplinary action.
          </p>
          <p style={{ marginBottom: "6pt", lineHeight: "1.45" }}>
            Following your self-inspection and completion of the worksheet(s), please review it with your staff pharmacists, ancillary staff and interns, correct any deficiencies noted, sign and date the worksheet(s), and file it so it will be readily available to commission inspectors. Do not send to the commission office. You are responsible for ensuring your completed worksheet(s) is available at the time of inspection.
          </p>
          <p style={{ marginBottom: "6pt", lineHeight: "1.45" }}>
            The primary objective of this worksheet, and your self-inspection, is to provide an opportunity to identify and correct areas of non-compliance with state and federal law. (Note: Neither the self-inspection nor a commission inspection evaluates your complete compliance with all laws and rules of the practice of pharmacy.) The inspection worksheet also serves as a necessary document used by commission inspectors during an inspection to evaluate a pharmacy's level of compliance.
          </p>
          <p style={{ marginBottom: "6pt", lineHeight: "1.45" }}>
            When a commission inspector discovers an area of non-compliance, they will issue an Inspection Report with Noted Deficiencies. The responsible pharmacy manager (or equivalent manager) must provide a written response (plan of correction) addressing all areas of non-compliance. Identifying and correcting an area of non-compliance prior to a commission inspection, or during an inspection, may eliminate that item from being included as a deficiency on an Inspection Report. Do not assume that you are in compliance with any statement; take the time to personally verify that compliance exists. If you have any questions, please contact your inspector.
          </p>
          <p style={{ marginBottom: "6pt", lineHeight: "1.45" }}>
            A common reason for issuing an Inspection Report with Noted Deficiencies is either not having or not being able to readily retrieve required documents and records. Because commission inspections are unscheduled, it is common for the responsible manager to be absent or unavailable. For this reason, you are asked to provide a list of the specific locations of required documents. Having all required documents and records maintained in a well-organized and readily retrievable manner (a binder is recommended) reduces the chance that you will receive an Inspection Report with Noted Deficiencies.
          </p>
          <p style={{ marginBottom: "6pt", lineHeight: "1.45" }}>
            By answering the questions and referencing the appropriate laws/rules/CFR provided, you can determine whether you are compliant with many of the rules and regulations. If you have corrected any deficiencies, please write "corrected" and the date of correction by the appropriate question. Questions highlighted in blue are common areas of non-compliance observed during routine pharmacy inspections.
          </p>

          <div style={{ marginTop: "20pt", fontSize: "7.5pt" }}>
            To request this document in another format, call 1-800-525-0127. Deaf or hard of hearing customers, please call 711 (Washington Relay) or email doh.information@doh.wa.gov.
          </div>
        </div>

        {/* ── PAGE 2: Manager / Pharmacy Info ── */}
        <div className="wa-page-break">
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "11pt", marginBottom: "8pt" }}>
            2026 General Pharmacy Self-Inspection Worksheet
          </div>
          <p style={{ fontSize: "8pt", lineHeight: "1.4", marginBottom: "8pt" }}>
            All responsible pharmacy managers (or equivalent managers) of pharmacies must complete and sign this self-inspection worksheet within the month of March and within 30 days of becoming responsible pharmacy manager. The form must be available for inspection as required by WAC 246-945-005. Do not send to the commission office.
          </p>

          {/* Manager info fields */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginBottom: "4pt" }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: "6pt", width: "60%" }}>
                  <span style={{ fontWeight: "bold" }}>Date self-inspection worksheet was completed: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "120pt" }}>{state.completionDate || "\u00a0"}</span>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "6pt" }} colSpan={2}>
                  <span style={{ fontWeight: "bold" }}>Change in responsible pharmacy manager and effective date of change: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "180pt" }}>
                    {state.changeInManager === "yes" ? `Yes — effective ${state.changeDate || "__/__/__"}` : state.changeInManager === "no" ? "No" : "\u00a0"}
                  </span>
                  <span style={{ marginLeft: "12pt", fontWeight: "bold" }}>Date: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "70pt" }}>{state.changeDate || "\u00a0"}</span>
                  <span style={{ fontSize: "7.5pt", marginLeft: "4pt" }}>(mm/dd/yy)</span>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "6pt" }} colSpan={2}>
                  <span style={{ fontWeight: "bold" }}>Print Name of Responsible Pharmacy Manager &amp; License #: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "250pt" }}>
                    {state.managerName || "\u00a0"}{state.managerLicense ? `  / ${state.managerLicense}` : ""}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "6pt" }} colSpan={2}>
                  <span style={{ fontWeight: "bold" }}>Signature of responsible manager: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "280pt", fontStyle: "italic" }}>
                    {state.finalSignature || "\u00a0"}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "6pt" }} colSpan={2}>
                  <span style={{ fontWeight: "bold" }}>Responsible Pharmacy Manager E-mail: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "250pt" }}>{state.managerEmail || "\u00a0"}</span>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "4pt", paddingRight: "12pt" }}>
                  <span style={{ fontWeight: "bold" }}>Pharmacy: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "100pt" }}>{state.pharmacyName || "\u00a0"}</span>
                  <span style={{ marginLeft: "12pt", fontWeight: "bold" }}>Fax: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "80pt" }}>{state.pharmacyFax || "\u00a0"}</span>
                  <span style={{ marginLeft: "12pt", fontWeight: "bold" }}>DEA #: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "80pt" }}>{state.pharmacyDea || "\u00a0"}</span>
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: "4pt" }}>
                  <span style={{ fontWeight: "bold" }}>Telephone: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "90pt" }}>{state.pharmacyPhone || "\u00a0"}</span>
                  <span style={{ marginLeft: "12pt", fontWeight: "bold" }}>Address: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "140pt" }}>{state.pharmacyAddress || "\u00a0"}</span>
                  <span style={{ marginLeft: "12pt", fontWeight: "bold" }}>Pharmacy License #: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "80pt" }}>{state.pharmacyLicense || "\u00a0"}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Endorsements */}
          <p style={{ marginBottom: "4pt", fontSize: "8.5pt" }}>
            <span style={{ fontWeight: "bold" }}>Endorsements: </span>
            <span style={{ marginRight: "16pt" }}>
              <Chk checked={state.endorsementAncillary} /> Use of Ancillary Personnel
            </span>
            <span>
              <Chk checked={state.endorsementControlled} /> Dispense Controlled Substances
            </span>
          </p>

          {/* Compounding definition */}
          <p style={{ fontSize: "8pt", lineHeight: "1.4", marginBottom: "6pt" }}>
            In Washington State, compounding is defined in RCW 18.64.011(6) and means "the act of combining two or more ingredients in the preparation of a prescription. Reconstitution and mixing of (a) sterile products according to federal food and drug administration approved labeling does not constitute compounding if prepared pursuant to a prescription and administered immediately or in accordance with package labeling, and (b) nonsterile products according to federal food and drug administration-approved labeling does not constitute compounding if prepared pursuant to a prescription."
          </p>
          <p style={{ fontSize: "8pt", fontStyle: "italic", marginBottom: "6pt" }}>
            Please note: If a pharmacy adds flavoring to a commercially available product, it is considered compounding and the non-sterile compounding self-inspection worksheets must also be completed.
          </p>

          {/* Compounding Y/N questions */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginBottom: "8pt" }}>
            <tbody>
              <tr>
                <td style={{ width: "30pt", textAlign: "right", paddingRight: "4pt" }}>Yes</td>
                <td style={{ width: "30pt", textAlign: "right", paddingRight: "8pt" }}>No</td>
                <td></td>
              </tr>
              <tr>
                <td style={{ textAlign: "center" }}><Chk checked={state.compoundingNonSterile === "yes"} /></td>
                <td style={{ textAlign: "center" }}><Chk checked={state.compoundingNonSterile === "no"} /></td>
                <td style={{ paddingBottom: "4pt" }}>
                  Does the pharmacy engage in non-sterile compounding of medications?<br />
                  <span style={{ fontSize: "7.5pt", paddingLeft: "8pt" }}>If yes, please complete the 2026 Non-Sterile Compounding Self-Inspection Addendum in addition to the General Pharmacy Self-Inspection Worksheet.</span>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: "center" }}><Chk checked={state.compoundingSterile === "yes"} /></td>
                <td style={{ textAlign: "center" }}><Chk checked={state.compoundingSterile === "no"} /></td>
                <td style={{ paddingBottom: "4pt" }}>
                  Does the pharmacy engage in sterile compounding?<br />
                  <span style={{ fontSize: "7.5pt", paddingLeft: "8pt" }}>If yes, please complete the 2026 Sterile Compounding Self-Inspection Addendum in addition to the General Pharmacy Self-Inspection Worksheet.</span>
                </td>
              </tr>
            </tbody>
          </table>

        </div>

        {/* ── PAGE 3: Additional questions + Doc Review ── */}
        <div className="wa-page-break">
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "11pt", marginBottom: "8pt" }}>
            2026 General Pharmacy Self-Inspection Worksheet
          </div>
          <p style={{ fontSize: "8pt", fontWeight: "bold", textAlign: "center", marginBottom: "6pt" }}>
            Please answer the following three questions to identify additional required self-inspection forms.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginBottom: "10pt" }}>
            <tbody>
              <tr>
                <td style={{ width: "30pt", textAlign: "center" }}><Chk checked={state.addendumLtc === "yes"} /></td>
                <td style={{ width: "30pt", textAlign: "center" }}><Chk checked={state.addendumLtc === "no"} /></td>
                <td style={{ paddingBottom: "4pt" }}>
                  Does the pharmacy fill prescriptions for residents of long-term care facilities or hospice programs? (This includes retail/community pharmacies and closed-door long-term care pharmacies, as defined in RCW 18.64.011(4).)<br />
                  <span style={{ fontSize: "7.5pt", paddingLeft: "8pt" }}>If yes, please complete the 2026 Long-Term Care Pharmacy Addendum in addition to the General Pharmacy Self-Inspection Worksheet.</span>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: "center" }}><Chk checked={state.addendumHospital === "yes"} /></td>
                <td style={{ textAlign: "center" }}><Chk checked={state.addendumHospital === "no"} /></td>
                <td style={{ paddingBottom: "4pt" }}>
                  Is the pharmacy licensed as a hospital pharmacy and/or have HPACs?<br />
                  <span style={{ fontSize: "7.5pt", paddingLeft: "8pt" }}>If yes, please complete the 2026 Hospital and HPAC Pharmacy Self-Inspection Worksheet instead of the General Pharmacy Self-Inspection Worksheet.</span>
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: "center" }}><Chk checked={state.addendumNuclear === "yes"} /></td>
                <td style={{ textAlign: "center" }}><Chk checked={state.addendumNuclear === "no"} /></td>
                <td style={{ paddingBottom: "4pt" }}>
                  Does the pharmacy have an endorsement as a Nuclear Pharmacy?<br />
                  <span style={{ fontSize: "7.5pt", paddingLeft: "8pt" }}>If yes, please complete the 2026 Radiopharmaceuticals Self-Inspection Addendum in addition to the General Pharmacy Self-Inspection Worksheet.</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Document & Record Review */}
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "9.5pt", marginBottom: "4pt" }}>
            Document and Record Review
          </div>
          <p style={{ fontSize: "7.5pt", marginBottom: "6pt", lineHeight: "1.4" }}>
            Please provide the location of these documents in the pharmacy (be as specific as possible, there can be many filing cabinets and binders). The documentation listed below is required by rule and must be readily retrievable during inspection. By listing the location of these documents, you are also confirming compliance with the referenced rule.
          </p>

          <table className="wa-doc-table">
            <thead>
              <tr>
                <th style={{ width: "45%", ...tb }}>Document</th>
                <th style={{ width: "55%", ...tb }}>Rule Reference</th>
              </tr>
            </thead>
            <tbody>
              {WA_DOC_REVIEW_ITEMS.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ ...tb, padding: "3pt 5pt", verticalAlign: "top", fontSize: "8pt" }}>
                    <div style={{ fontWeight: "normal", marginBottom: "4pt" }}>{doc.title}</div>
                    <div>
                      <span style={{ fontWeight: "bold" }}>Location: </span>
                      <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "180pt", fontSize: "8pt" }}>
                        {state.docLocations[doc.id] || "\u00a0"}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tb, padding: "3pt 5pt", verticalAlign: "top", fontSize: "7.5pt", lineHeight: "1.3", color: "#222", whiteSpace: "pre-line" }}>
                    {doc.rule}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {/* ── PAGES 5–28: Main Checklist Table ── */}
        <table className="wa-print-table wa-page-break">
          {/* thead repeats on every print page */}
          <thead>
            <tr>
              <td colSpan={7} style={{ textAlign: "center", fontWeight: "bold", fontSize: "11pt", border: "none", padding: "0 0 4pt 0" }}>
                2026 General Pharmacy Self-Inspection Worksheet
              </td>
            </tr>
            <tr>
              <th colSpan={3} style={{ ...tb, textAlign: "center", width: "10%", padding: "2pt", fontSize: "7.5pt" }}>
                Compliant
              </th>
              <th rowSpan={2} style={{ ...tb, textAlign: "center", width: "5%", padding: "2pt", fontSize: "7.5pt" }}>#</th>
              <th rowSpan={2} style={{ ...tb, width: "34%", padding: "2pt 4pt", fontSize: "7.5pt" }}></th>
              <th rowSpan={2} style={{ ...tb, width: "36%", padding: "2pt 4pt", fontSize: "7.5pt", textAlign: "center" }}>Rule Reference</th>
              <th rowSpan={2} style={{ ...tb, width: "15%", padding: "2pt 4pt", fontSize: "7.5pt", textAlign: "center" }}>Notes/Corrective Action</th>
            </tr>
            <tr>
              <th style={{ ...tb, textAlign: "center", width: "3%", padding: "2pt", fontSize: "7.5pt" }}>Yes</th>
              <th style={{ ...tb, textAlign: "center", width: "3%", padding: "2pt", fontSize: "7.5pt" }}>No</th>
              <th style={{ ...tb, textAlign: "center", width: "4%", padding: "2pt", fontSize: "7.5pt" }}>N/A</th>
            </tr>
          </thead>
          <tbody>
            {WA_SECTIONS.flatMap((section) => [
              <tr key={`sec-${section.id}`} className="wa-section-row">
                <td colSpan={7} style={{ backgroundColor: "#c8c8c8", fontWeight: "bold", fontSize: "9pt", padding: "3pt 6pt" }}>
                  {section.title}
                </td>
              </tr>,
              ...(section.note
                ? [
                    <tr key={`note-${section.id}`}>
                      <td colSpan={7} style={{ fontSize: "7.5pt", fontStyle: "italic", padding: "2pt 6pt", backgroundColor: "#f8f8f8" }}>
                        {section.note}
                      </td>
                    </tr>,
                  ]
                : []),
              ...section.items.map((item) => (
                <PrintRow
                  key={item.id}
                  item={item}
                  resp={state.responses[item.id] ?? ""}
                  note={state.notes[item.id] ?? ""}
                />
              )),
            ])}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} style={{ borderTop: "2px solid #000", padding: "8pt 4pt 4pt", fontSize: "8.5pt" }}>
                <div style={{ marginBottom: "6pt" }}>
                  <span style={{ fontWeight: "bold" }}>Signature of Responsible Pharmacy Manager: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "220pt", fontStyle: "italic" }}>
                    {state.finalSignature || "\u00a0"}
                  </span>
                  <span style={{ marginLeft: "16pt", fontWeight: "bold" }}>Date: </span>
                  <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "80pt" }}>
                    {state.finalDate || "\u00a0"}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>

      </div>
    </>
  );
}
