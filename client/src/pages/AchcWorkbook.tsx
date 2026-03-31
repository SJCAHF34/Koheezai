import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isTechRole,
  isRegionalOrAbove,
  isCPO,
} from "@/lib/userProfile";
import {
  ACHC_WORKBOOK_SECTIONS,
  STAFF_INTERVIEW_QA,
  type WorkbookSection,
  type WorkbookCheckItem,
} from "@/lib/achcWorkbookData";
import {
  loadWorkbook,
  saveWorkbook,
  submitWorkbook,
  getCurrentQuarter,
  type WorkbookRecord,
  type WorkbookSectionResponse,
  type WorkbookItemResponse,
  type WorkbookItemStatus,
  type WorkbookStatus,
} from "@/lib/taskStorage";
import { ALL_STORES, STORE_REGIONS, findStore } from "@/lib/storeDirectory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ClipboardList,
  Building2,
  Lock,
  FileCheck2,
  AlertCircle,
  MinusCircle,
  Clock,
  ChevronDown,
  MessageSquare,
  BookOpen,
  Users,
} from "lucide-react";

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: WorkbookItemStatus; label: string }[] = [
  { value: "", label: "Not Reviewed" },
  { value: "complete", label: "Complete" },
  { value: "in_progress", label: "In Progress" },
  { value: "gap", label: "Gap / Issue" },
  { value: "na", label: "N/A" },
];

function itemStatusBadge(status: WorkbookItemStatus) {
  if (status === "complete") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 shrink-0 text-xs">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="bg-amber-100 text-amber-800 shrink-0 text-xs">
        <Clock className="w-3 h-3 mr-1" />
        In Progress
      </Badge>
    );
  }
  if (status === "gap") {
    return (
      <Badge className="bg-red-100 text-red-800 shrink-0 text-xs">
        <AlertCircle className="w-3 h-3 mr-1" />
        Gap
      </Badge>
    );
  }
  if (status === "na") {
    return (
      <Badge className="bg-muted text-muted-foreground shrink-0 text-xs">
        <MinusCircle className="w-3 h-3 mr-1" />
        N/A
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
      Not Reviewed
    </Badge>
  );
}

function workbookStatusBadge(status: WorkbookStatus) {
  if (status === "submitted") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200" data-testid="workbook-status-badge">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
        Submitted
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200" data-testid="workbook-status-badge">
        In Progress
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" data-testid="workbook-status-badge">
      Not Started
    </Badge>
  );
}

// ── Storage helpers ──────────────────────────────────────────────────────────

function buildEmptyRecord(siteId: string, quarter: string): WorkbookRecord {
  return {
    siteId,
    quarter,
    status: "not_started",
    lastUpdatedAt: new Date().toISOString(),
    sections: ACHC_WORKBOOK_SECTIONS.map((sec) => ({
      sectionId: sec.id,
      items: sec.items.map((item) => ({ itemId: item.id, status: "" as WorkbookItemStatus, notes: "" })),
      sectionNotes: "",
    })),
  };
}

function getSectionResponse(record: WorkbookRecord, sectionId: string): WorkbookSectionResponse {
  return (
    record.sections.find((s) => s.sectionId === sectionId) ?? {
      sectionId,
      items: [],
      sectionNotes: "",
    }
  );
}

function getItemResponse(secResp: WorkbookSectionResponse, itemId: string): WorkbookItemResponse {
  return (
    secResp.items.find((i) => i.itemId === itemId) ?? { itemId, status: "", notes: "" }
  );
}

function countReviewed(record: WorkbookRecord): number {
  return record.sections.reduce(
    (total, sec) => total + sec.items.filter((i) => i.status !== "").length,
    0
  );
}

function totalItems(): number {
  return ACHC_WORKBOOK_SECTIONS.reduce((t, s) => t + s.items.length, 0);
}

function countCompliant(record: WorkbookRecord): number {
  return record.sections.reduce(
    (total, sec) => total + sec.items.filter((i) => i.status === "complete" || i.status === "na").length,
    0
  );
}

// ── Staff Interview Prep (tech view) ─────────────────────────────────────────

function StaffInterviewPrepView() {
  const [expanded, setExpanded] = useState<string[]>([]);

  function toggle(id: string) {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const audienceColors: Record<string, string> = {
    "All Staff": "bg-blue-50 text-blue-700",
    "Pharmacist": "bg-purple-50 text-purple-700",
    "Pharmacist / Director": "bg-violet-50 text-violet-700",
    "Director / Pharmacist": "bg-violet-50 text-violet-700",
    "Pharmacist / Tech": "bg-indigo-50 text-indigo-700",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" data-testid="staff-interview-prep-page">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-blue-50 shrink-0">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Staff Interview Prep</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ACHC onsite surveyor questions and coached answers — review before the visit
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Visit notice:</strong> The ACHC onsite visit is <strong>unscheduled</strong> — no morning phone call. Be ready any day January 19 – April 17, 2026 (avoid Mondays). The surveyor will conduct staff interviews. Review every answer below and be ready to respond naturally.
      </div>

      <div className="space-y-2" data-testid="interview-qa-list">
        {STAFF_INTERVIEW_QA.map((qa) => {
          const isOpen = expanded.includes(qa.id);
          const audienceClass = audienceColors[qa.audience] ?? "bg-muted text-muted-foreground";

          return (
            <div
              key={qa.id}
              className="border rounded-md overflow-hidden"
              data-testid={`interview-qa-${qa.id}`}
            >
              <button
                type="button"
                className="w-full flex items-start gap-3 px-4 py-3 hover-elevate text-left"
                onClick={() => toggle(qa.id)}
                data-testid={`interview-qa-toggle-${qa.id}`}
              >
                <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0 w-5 text-right">{qa.id.replace("qa-", "")}.</span>
                <span className="font-medium text-sm text-foreground flex-1">{qa.question}</span>
                <Badge className={`${audienceClass} shrink-0 text-xs`}>
                  {qa.audience}
                </Badge>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t bg-muted/20" data-testid={`interview-qa-answer-${qa.id}`}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Expected Answer</p>
                  <p className="text-sm text-foreground leading-relaxed">{qa.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Workbook item row (director/viewer) ──────────────────────────────────────

interface ItemRowProps {
  item: WorkbookCheckItem;
  itemResp: WorkbookItemResponse;
  sectionId: string;
  readonly: boolean;
  submitted: boolean;
  onStatusChange: (sectionId: string, itemId: string, status: WorkbookItemStatus) => void;
  onNotesChange: (sectionId: string, itemId: string, notes: string) => void;
}

function ItemRow({ item, itemResp, sectionId, readonly, submitted, onStatusChange, onNotesChange }: ItemRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);

  const isEditable = !readonly && !submitted;

  return (
    <div
      className="border rounded-md overflow-hidden"
      data-testid={`workbook-item-${item.id}`}
    >
      {/* Item header row */}
      <div className="px-4 py-3 flex flex-wrap items-start gap-3">
        <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0 mt-0.5" data-testid={`workbook-item-standard-${item.id}`}>
          {item.standard}
        </span>
        <span className="text-sm text-foreground flex-1 min-w-0 leading-snug" data-testid={`workbook-item-req-${item.id}`}>
          {item.requirement}
        </span>
        <div className="shrink-0">
          {isEditable ? (
            <Select
              value={itemResp.status === "" ? "__none__" : itemResp.status}
              onValueChange={(val) => onStatusChange(sectionId, item.id, val as WorkbookItemStatus)}
            >
              <SelectTrigger className="w-40 h-8 text-xs" data-testid={`workbook-item-status-select-${item.id}`}>
                <SelectValue placeholder="Not Reviewed" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value === "" ? "__none__" : opt.value} value={opt.value === "" ? "__none__" : opt.value} data-testid={`status-option-${opt.value === "" ? "none" : opt.value}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            itemStatusBadge(itemResp.status)
          )}
        </div>
      </div>

      {/* Item detail rows */}
      <div className="border-t bg-muted/20 px-4 py-3 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">AHF Required Action</p>
            <p className="text-xs text-foreground leading-relaxed" data-testid={`workbook-item-action-${item.id}`}>{item.ahfAction}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Evidence / Document Needed</p>
            <p className="text-xs text-foreground leading-relaxed" data-testid={`workbook-item-evidence-${item.id}`}>{item.evidence}</p>
          </div>
        </div>

        {/* Notes section */}
        {isEditable && (
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover-elevate rounded px-1 py-0.5"
              onClick={() => setNotesOpen((prev) => !prev)}
              data-testid={`workbook-item-notes-toggle-${item.id}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {notesOpen ? "Hide notes" : (itemResp.notes ? "Edit notes" : "Add notes")}
              {itemResp.notes && !notesOpen && (
                <span className="ml-1 text-blue-600">(has notes)</span>
              )}
            </button>
            {notesOpen && (
              <div className="mt-2">
                <Textarea
                  placeholder="Notes, observations, owner, follow-up items…"
                  value={itemResp.notes}
                  onChange={(e) => onNotesChange(sectionId, item.id, e.target.value)}
                  className="text-xs resize-none min-h-[60px]"
                  data-testid={`workbook-item-notes-input-${item.id}`}
                />
              </div>
            )}
          </div>
        )}

        {/* Read-only notes display */}
        {(readonly || submitted) && itemResp.notes && (
          <div data-testid={`workbook-item-notes-display-${item.id}`}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{itemResp.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AchcWorkbook() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;

  const quarter = getCurrentQuarter();

  // Tech roles see only Staff Interview Prep
  if (profile && isTechRole(profile.role)) {
    return <StaffInterviewPrepView />;
  }

  const isViewer = profile ? isRegionalOrAbove(profile.role) : false;
  const canBrowseAll = profile ? isCPO(profile.role) : false;

  const defaultSiteId = isViewer ? "" : (profile?.siteId ?? "");
  const [selectedSiteId, setSelectedSiteId] = useState<string>(defaultSiteId);

  const selectorStores = canBrowseAll
    ? ALL_STORES
    : isViewer && profile?.region
    ? STORE_REGIONS.find((r) => r.region === profile.region)?.stores ?? []
    : [];

  const activeSiteId = isViewer ? selectedSiteId : (profile?.siteId ?? "");

  const [record, setRecord] = useState<WorkbookRecord | null>(null);

  useEffect(() => {
    if (!activeSiteId) return;
    const existing = loadWorkbook(activeSiteId, quarter);
    setRecord(existing ?? buildEmptyRecord(activeSiteId, quarter));
  }, [activeSiteId, quarter]);

  const [attestorName, setAttestorName] = useState(profile?.name ?? "");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (record?.status === "submitted") setSubmitted(true);
    else setSubmitted(false);
  }, [record]);

  const persistRecord = useCallback((updated: WorkbookRecord) => {
    const reviewed = countReviewed(updated);
    const status: WorkbookStatus =
      updated.status === "submitted"
        ? "submitted"
        : reviewed === 0
        ? "not_started"
        : "in_progress";
    const withStatus = { ...updated, status };
    saveWorkbook(withStatus);
    setRecord(withStatus);
  }, []);

  function handleStatusChange(sectionId: string, itemId: string, status: WorkbookItemStatus) {
    if (!record || submitted || isViewer) return;
    const resolvedStatus = (status as string) === "__none__" ? "" : status;
    const sections = record.sections.map((sec) => {
      if (sec.sectionId !== sectionId) return sec;
      const items = sec.items.map((it) =>
        it.itemId === itemId ? { ...it, status: resolvedStatus as WorkbookItemStatus } : it
      );
      return { ...sec, items };
    });
    persistRecord({ ...record, sections });
  }

  function handleItemNotes(sectionId: string, itemId: string, notes: string) {
    if (!record || submitted || isViewer) return;
    const sections = record.sections.map((sec) => {
      if (sec.sectionId !== sectionId) return sec;
      const items = sec.items.map((it) =>
        it.itemId === itemId ? { ...it, notes } : it
      );
      return { ...sec, items };
    });
    persistRecord({ ...record, sections });
  }

  function handleSubmit() {
    if (!record || !activeSiteId) return;
    saveWorkbook(record);
    submitWorkbook(activeSiteId, quarter, attestorName || (profile?.name ?? ""));
    const updated = loadWorkbook(activeSiteId, quarter);
    if (updated) setRecord(updated);
    setSubmitted(true);
  }

  const reviewed = record ? countReviewed(record) : 0;
  const compliant = record ? countCompliant(record) : 0;
  const total = totalItems();
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  // Section-level stat counters
  function sectionStats(record: WorkbookRecord, sectionId: string) {
    const secResp = getSectionResponse(record, sectionId);
    const complete = secResp.items.filter((i) => i.status === "complete" || i.status === "na").length;
    const gap = secResp.items.filter((i) => i.status === "gap").length;
    const inProg = secResp.items.filter((i) => i.status === "in_progress").length;
    const total = secResp.items.length;
    return { complete, gap, inProg, total };
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" data-testid="achc-workbook-page">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-blue-50">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">ACHC Compliance Workbook</h1>
            <p className="text-sm text-muted-foreground">
              Onsite visit readiness tracker — {quarter}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {record && workbookStatusBadge(record.status)}
        </div>
      </div>

      {/* Viewer site selector (CPO / RPD) */}
      {isViewer && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-wrap items-center gap-3" data-testid="workbook-site-selector-panel">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground shrink-0">Viewing site:</span>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-64" data-testid="workbook-site-select-trigger">
              <SelectValue placeholder="Select a site…" />
            </SelectTrigger>
            <SelectContent>
              {selectorStores.map((store) => (
                <SelectItem key={store.id} value={store.id} data-testid={`workbook-site-option-${store.id}`}>
                  {store.name} ({store.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5 ml-auto">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Read-only</span>
          </div>
        </div>
      )}

      {/* Director site label */}
      {!isViewer && profile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="workbook-site-label">
          <Building2 className="w-4 h-4" />
          <span>{profile.siteName} — Site {profile.siteId}</span>
        </div>
      )}

      {/* Progress summary */}
      {record && activeSiteId && (
        <div className="rounded-md border bg-muted/20 px-5 py-4 space-y-3" data-testid="workbook-progress-section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Readiness Progress</span>
            <span className="text-sm font-semibold text-foreground" data-testid="workbook-progress-pct">{pct}% reviewed ({reviewed}/{total} items)</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
              data-testid="workbook-progress-bar"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <strong className="text-emerald-700">{compliant}</strong> compliant / N/A
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <strong className="text-amber-700">{record.sections.reduce((t, s) => t + s.items.filter((i) => i.status === "in_progress").length, 0)}</strong> in progress
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <strong className="text-red-700">{record.sections.reduce((t, s) => t + s.items.filter((i) => i.status === "gap").length, 0)}</strong> gaps
            </span>
          </div>
        </div>
      )}

      {/* Empty state for viewer with no site selected */}
      {isViewer && !activeSiteId && (
        <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground" data-testid="workbook-no-site">
          <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select a site above to view its workbook.</p>
        </div>
      )}

      {/* Submitted banner */}
      {submitted && record && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3" data-testid="workbook-submitted-banner">
          <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Workbook submitted</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Attested by <strong>{record.submittedBy}</strong> on{" "}
              {record.submittedAt
                ? new Date(record.submittedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Section accordion */}
      {record && activeSiteId && (
        <Accordion type="multiple" className="space-y-2" data-testid="workbook-sections">
          {ACHC_WORKBOOK_SECTIONS.map((section: WorkbookSection) => {
            const secResp = getSectionResponse(record, section.id);
            const stats = sectionStats(record, section.id);

            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border rounded-md overflow-hidden"
                data-testid={`workbook-section-${section.id}`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">Sec {section.sectionNumber}</span>
                    <span className="font-medium text-sm text-left">{section.title}</span>
                    <div className="flex items-center gap-2 ml-auto mr-2 shrink-0">
                      {stats.gap > 0 && (
                        <span className="text-xs text-red-600 font-medium">{stats.gap} gap{stats.gap !== 1 ? "s" : ""}</span>
                      )}
                      <span
                        className={`text-xs font-medium ${
                          stats.complete === stats.total ? "text-emerald-600" : stats.complete > 0 ? "text-amber-600" : "text-muted-foreground"
                        }`}
                        data-testid={`workbook-section-progress-${section.id}`}
                      >
                        {stats.complete}/{stats.total} done
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5 pt-2 space-y-3">
                  <p className="text-xs text-muted-foreground">{section.description}</p>

                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const itemResp = getItemResponse(secResp, item.id);
                      return (
                        <ItemRow
                          key={item.id}
                          item={item}
                          itemResp={itemResp}
                          sectionId={section.id}
                          readonly={isViewer}
                          submitted={submitted}
                          onStatusChange={handleStatusChange}
                          onNotesChange={handleItemNotes}
                        />
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Staff Interview Prep link for directors */}
      {record && activeSiteId && !isViewer && (
        <div className="rounded-md border border-dashed px-4 py-4 flex items-start gap-3" data-testid="workbook-interview-prep-note">
          <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Staff Interview Prep</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your pharmacy technicians see the Staff Interview Prep section with 20 expected ACHC surveyor questions and coached answers. Ensure all staff have reviewed it before the onsite visit.
            </p>
          </div>
        </div>
      )}

      {/* Attestation + submit — directors only, not submitted */}
      {record && activeSiteId && !isViewer && !submitted && (
        <div className="rounded-md border px-5 py-5 space-y-4" data-testid="workbook-attestation">
          <h2 className="text-sm font-semibold text-foreground">Attestation & Submission</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            By submitting this workbook, you attest that the information entered is accurate and reflects
            the current ACHC readiness status at your site for {quarter}. This record is stored locally
            and may be used as part of your site's accreditation documentation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="attestor-name" className="text-xs text-muted-foreground">
                Director name
              </Label>
              <input
                id="attestor-name"
                type="text"
                value={attestorName}
                onChange={(e) => setAttestorName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Enter your full name"
                data-testid="workbook-attestor-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground" data-testid="workbook-attestation-date">
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              {pct < 100 ? (
                <span className="text-amber-600 font-medium">
                  {total - reviewed} item{total - reviewed !== 1 ? "s" : ""} not yet reviewed — you can still submit.
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">All items reviewed.</span>
              )}
            </p>
            <Button
              onClick={handleSubmit}
              disabled={!attestorName.trim()}
              data-testid="workbook-submit-btn"
            >
              <FileCheck2 className="w-4 h-4 mr-2" />
              Submit Workbook
            </Button>
          </div>
        </div>
      )}

      {/* Read-only footer for submitted director */}
      {record && activeSiteId && !isViewer && submitted && (
        <div className="text-center text-sm text-muted-foreground py-4" data-testid="workbook-locked-note">
          <Lock className="w-4 h-4 inline mr-1.5 mb-0.5" />
          This workbook is locked. Contact your Regional Director to request a re-submission.
        </div>
      )}
    </div>
  );
}
