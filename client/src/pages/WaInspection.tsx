import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import { getUserProfile } from "@/lib/userProfile";
import { WA_SECTIONS, WA_DOC_REVIEW_ITEMS } from "@/lib/waInspectionData";
import type { WaItem } from "@/lib/waInspectionData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Save, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

const STORAGE_KEY = "koheez_wa_inspection";

type YNAValue = "yes" | "no" | "na" | "";

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

function loadState(defaultPharmacyName: string): WaFormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WaFormState;
  } catch {}
  return buildDefault(defaultPharmacyName);
}

function saveState(state: WaFormState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function YNAButtons({
  id,
  value,
  naOption,
  onChange,
}: {
  id: string;
  value: YNAValue;
  naOption?: boolean;
  onChange: (v: YNAValue) => void;
}) {
  return (
    <div className="flex gap-1 items-center print:gap-2" data-testid={`yna-${id}`}>
      {(["yes", "no", ...(naOption ? ["na"] : [])] as YNAValue[]).map((opt) => (
        <button
          key={opt}
          type="button"
          data-testid={`yna-${id}-${opt}`}
          onClick={() => onChange(value === opt ? "" : opt)}
          className={`text-xs font-semibold px-2 py-1 rounded border transition-colors print:border-gray-400 ${
            value === opt
              ? opt === "yes"
                ? "bg-green-600 text-white border-green-600"
                : opt === "no"
                ? "bg-red-600 text-white border-red-600"
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

function ChecklistRow({
  item,
  response,
  note,
  location,
  onResponse,
  onNote,
  onLocation,
}: {
  item: WaItem;
  response: YNAValue;
  note: string;
  location: string;
  onResponse: (v: YNAValue) => void;
  onNote: (v: string) => void;
  onLocation: (v: string) => void;
}) {
  return (
    <div
      className={`border-b border-border last:border-b-0 py-3 print:py-2 print:border-b print:border-gray-300 ${
        item.highlighted ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
      }`}
    >
      <div className="flex gap-3 items-start">
        <span className="text-xs font-mono text-muted-foreground w-8 shrink-0 pt-0.5 print:text-black">{item.id}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug print:text-xs print:leading-tight">{item.text}</p>
          {item.rule && (
            <p className="text-xs text-muted-foreground mt-0.5 print:text-gray-500">{item.rule}</p>
          )}
          {item.locationField && (
            <input
              type="text"
              placeholder="Location or file pathway:"
              value={location}
              onChange={(e) => onLocation(e.target.value)}
              className="mt-1.5 w-full text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary print:border-b print:border-gray-400 print:border-t-0 print:border-l-0 print:border-r-0 print:rounded-none print:px-0 print:bg-transparent"
              data-testid={`location-${item.id}`}
            />
          )}
          <textarea
            placeholder="Notes / Corrective Action (optional)"
            value={note}
            onChange={(e) => onNote(e.target.value)}
            rows={note ? 2 : 1}
            className="mt-1.5 w-full text-xs border border-border rounded px-2 py-1 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 print:hidden"
            data-testid={`notes-${item.id}`}
          />
          {note && (
            <p className="hidden print:block text-xs mt-1 text-gray-700 italic border-t border-gray-200 pt-1">
              Notes: {note}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <YNAButtons id={item.id} value={response} naOption={item.naOption} onChange={onResponse} />
        </div>
      </div>
    </div>
  );
}

function SectionPanel({
  section,
  state,
  onResponse,
  onNote,
  onLocation,
}: {
  section: (typeof WA_SECTIONS)[0];
  state: WaFormState;
  onResponse: (id: string, v: YNAValue) => void;
  onNote: (id: string, v: string) => void;
  onLocation: (id: string, v: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const answered = section.items.filter((i) => state.responses[i.id] && state.responses[i.id] !== "").length;
  const total = section.items.length;
  const hasIssue = section.items.some((i) => state.responses[i.id] === "no");

  return (
    <div className="border border-border rounded-md overflow-hidden mb-3 print:border print:border-gray-300 print:mb-4 print:break-inside-avoid-page">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left print:bg-gray-50 print:cursor-default"
        onClick={() => setOpen((o) => !o)}
        data-testid={`section-toggle-${section.id}`}
      >
        <span className="print:hidden">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </span>
        <span className="font-semibold text-sm flex-1">{section.title}</span>
        <span className="text-xs text-muted-foreground print:hidden">
          {answered}/{total}
        </span>
        {hasIssue && (
          <AlertCircle className="w-4 h-4 text-red-500 print:hidden" />
        )}
      </button>
      {(open || true) && (
        <div className={`px-4 ${open ? "" : "hidden"} print:block`}>
          {section.note && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2 mt-3 mb-1 print:text-gray-600 print:bg-transparent print:border print:border-gray-300 print:italic">
              {section.note}
            </p>
          )}
          {section.items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground print:text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="text-sm border border-border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary print:border-b print:border-gray-400 print:border-t-0 print:border-l-0 print:border-r-0 print:rounded-none print:px-0 print:bg-transparent"
      />
    </div>
  );
}

function YesNoRadio({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm flex-1">{label}</span>
      <div className="flex gap-2" data-testid={testId}>
        {["yes", "no"].map((opt) => (
          <label key={opt} className="flex items-center gap-1 cursor-pointer text-sm">
            <input
              type="radio"
              checked={value === opt}
              onChange={() => onChange(value === opt ? "" : opt)}
              className="accent-primary"
            />
            <span>{opt === "yes" ? "Yes" : "No"}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function WaInspection() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;
  const defaultPharmacyName = profile?.siteName ?? "";

  const [state, setState] = useState<WaFormState>(() => loadState(defaultPharmacyName));
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const persist = useCallback(
    (s: WaFormState) => {
      saveState(s);
      setSavedAt(new Date());
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => persist(state), 400);
    return () => clearTimeout(t);
  }, [state, persist]);

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

  const allItems = WA_SECTIONS.flatMap((s) => s.items);
  const totalItems = allItems.length;
  const answeredItems = allItems.filter((i) => state.responses[i.id] && state.responses[i.id] !== "").length;
  const noItems = allItems.filter((i) => state.responses[i.id] === "no").length;
  const completionPct = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #wa-inspection-root, #wa-inspection-root * { visibility: visible; }
          #wa-inspection-root { position: fixed; top: 0; left: 0; width: 100%; padding: 12px; font-size: 11px; }
          .print-hide { display: none !important; }
          button[type="button"]:not(.print-show) { pointer-events: none; }
          input, textarea { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div id="wa-inspection-root" className="max-w-4xl mx-auto px-4 pb-16">
        {/* Sticky toolbar */}
        <div className="sticky top-14 z-10 bg-background border-b border-border py-2 mb-4 flex items-center justify-between gap-3 print-hide">
          <div>
            <h1 className="font-bold text-base leading-tight">WA General Pharmacy Self-Inspection Worksheet</h1>
            <p className="text-xs text-muted-foreground">DOH 690-318 — Due by March 31 each year</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedAt && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Badge variant="outline" className="text-xs">
              {answeredItems}/{totalItems} answered
            </Badge>
            {noItems > 0 && (
              <Badge variant="destructive" className="text-xs">
                {noItems} issue{noItems !== 1 ? "s" : ""}
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => persist(state)} data-testid="btn-wa-save">
              <Save className="w-3.5 h-3.5 mr-1" />
              Save
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="btn-wa-print">
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-4 text-center">
          <h1 className="text-lg font-bold">Washington State General Pharmacy Self-Inspection Worksheet</h1>
          <p className="text-sm text-gray-600">DOH 690-318 | Pharmacy Quality Assurance Commission | Due by March 31 each year</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4 print-hide">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Completion</span>
            <span>{completionPct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>

        {/* ── Section 1: Header Info ── */}
        <div className="border border-border rounded-md p-4 mb-3 print:border print:border-gray-300 print:mb-4">
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

        {/* ── Section 2: Manager Info ── */}
        <div className="border border-border rounded-md p-4 mb-3 print:border print:border-gray-300 print:mb-4">
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
                    <input
                      type="radio"
                      checked={state.changeInManager === opt}
                      onChange={() => patch({ changeInManager: state.changeInManager === opt ? "" : opt })}
                      className="accent-primary"
                    />
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

        {/* ── Section 3: Endorsements & Compounding ── */}
        <div className="border border-border rounded-md p-4 mb-3 print:border print:border-gray-300 print:mb-4">
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Endorsements & Addenda</h2>
          <div className="space-y-2 mb-3">
            <p className="text-xs text-muted-foreground mb-2">Check all endorsements the pharmacy holds:</p>
            {[
              { key: "endorsementAncillary" as const, label: "Use of Ancillary Personnel" },
              { key: "endorsementControlled" as const, label: "Dispense Controlled Substances" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={state[key] as boolean}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                  className="accent-primary"
                  data-testid={`check-${key}`}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Does the pharmacy engage in the following? (Check all that apply)</p>
            {[
              { key: "compoundingNonSterile" as const, label: "Non-sterile compounding" },
              { key: "compoundingSterile" as const, label: "Sterile compounding" },
              { key: "addendumLtc" as const, label: "Long-term care (LTC) prescriptions" },
              { key: "addendumHospital" as const, label: "Hospital pharmacy services" },
              { key: "addendumNuclear" as const, label: "Nuclear pharmacy" },
            ].map(({ key, label }) => (
              <YesNoRadio
                key={key}
                label={label}
                value={state[key] as string}
                onChange={(v) => patch({ [key]: v })}
                testId={`radio-${key}`}
              />
            ))}
          </div>
        </div>

        {/* ── Section 4: Document Review ── */}
        <div className="border border-border rounded-md p-4 mb-3 print:border print:border-gray-300 print:mb-4">
          <h2 className="font-semibold text-sm mb-1 text-muted-foreground uppercase tracking-wide">Document and Record Review</h2>
          <p className="text-xs text-muted-foreground mb-3">Please indicate the location (or electronic file path) of each required document.</p>
          <div className="space-y-2">
            {WA_DOC_REVIEW_ITEMS.map((doc) => (
              <div key={doc.id} className="border-b border-border last:border-b-0 pb-2 last:pb-0 print:border-gray-200">
                <p className="text-sm leading-snug">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{doc.rule}</p>
                <input
                  type="text"
                  placeholder="Location or file pathway"
                  value={state.docLocations[doc.id] ?? ""}
                  onChange={(e) => setDocLocation(doc.id, e.target.value)}
                  className="mt-1 w-full text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary print:border-b print:border-gray-400 print:border-t-0 print:border-l-0 print:border-r-0 print:rounded-none print:px-0 print:bg-transparent"
                  data-testid={`doc-loc-${doc.id}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 5: Legend ── */}
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground print-hide">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-green-600" />
            Yes
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-red-600" />
            No — corrective action required
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-amber-500" />
            N/A
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-blue-200 dark:bg-blue-900" />
            Common non-compliance area
          </div>
        </div>

        {/* ── Checklist Sections ── */}
        {WA_SECTIONS.map((section) => (
          <SectionPanel
            key={section.id}
            section={section}
            state={state}
            onResponse={setResponse}
            onNote={setNote}
            onLocation={setItemLocation}
          />
        ))}

        {/* ── Signature Section ── */}
        <div className="border border-border rounded-md p-4 mb-3 print:border print:border-gray-300 print:mt-6">
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Certification & Signature</h2>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            I certify that the information provided in this self-inspection worksheet is accurate and complete to the best of my knowledge, and that I am the responsible pharmacy manager or authorized representative for this pharmacy.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Responsible Pharmacy Manager Signature (type full name)"
              value={state.finalSignature}
              onChange={(v) => patch({ finalSignature: v })}
              placeholder="Type full legal name as signature"
              testId="input-final-signature"
            />
            <Field
              label="Date"
              value={state.finalDate}
              onChange={(v) => patch({ finalDate: v })}
              type="date"
              testId="input-final-date"
            />
          </div>
          {state.finalSignature && (
            <div className="mt-3 pt-3 border-t border-border print:border-gray-300">
              <p className="text-xs text-muted-foreground">Signed by: <span className="font-semibold text-foreground italic">{state.finalSignature}</span></p>
            </div>
          )}
        </div>

        {/* ── Summary of Issues (No responses) ── */}
        {noItems > 0 && (
          <div className="border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20 rounded-md p-4 mb-3 print:border print:border-gray-400">
            <h2 className="font-semibold text-sm text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Items Requiring Corrective Action ({noItems})
            </h2>
            <div className="space-y-1">
              {allItems
                .filter((i) => state.responses[i.id] === "no")
                .map((item) => (
                  <div key={item.id} className="flex gap-2 text-xs">
                    <span className="font-mono text-muted-foreground w-8 shrink-0 print:text-black">{item.id}</span>
                    <span className="print:text-black">{item.text.slice(0, 120)}{item.text.length > 120 ? "…" : ""}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Footer note ── */}
        <p className="text-xs text-muted-foreground text-center mt-4 print:mt-6 print:text-gray-500">
          Washington State Pharmacy Quality Assurance Commission — DOH 690-318 — Submit completed worksheet as directed by your regional director.
        </p>
      </div>
    </>
  );
}
