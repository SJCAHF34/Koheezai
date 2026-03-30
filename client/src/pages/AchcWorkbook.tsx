import { useState, useEffect, useCallback } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isTechRole,
  isRegionalOrAbove,
  isCPO,
} from "@/lib/userProfile";
import {
  ACHC_WORKBOOK_SECTIONS,
  type WorkbookSection,
} from "@/lib/achcWorkbookData";
import {
  loadWorkbook,
  saveWorkbook,
  submitWorkbook,
  getCurrentQuarter,
  type WorkbookRecord,
  type WorkbookSectionResponse,
  type WorkbookStatus,
} from "@/lib/taskStorage";
import { ALL_STORES, STORE_REGIONS, findStore } from "@/lib/storeDirectory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ClipboardList,
  Building2,
  Lock,
  FileCheck2,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: WorkbookStatus) {
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

function buildEmptyRecord(siteId: string, quarter: string): WorkbookRecord {
  return {
    siteId,
    quarter,
    status: "not_started",
    lastUpdatedAt: new Date().toISOString(),
    sections: ACHC_WORKBOOK_SECTIONS.map((sec) => ({
      sectionId: sec.id,
      items: sec.items.map((item) => ({ itemId: item.id, checked: false })),
      notes: "",
    })),
  };
}

function getSectionResponse(
  record: WorkbookRecord,
  sectionId: string
): WorkbookSectionResponse {
  return (
    record.sections.find((s) => s.sectionId === sectionId) ?? {
      sectionId,
      items: [],
      notes: "",
    }
  );
}

function countChecked(record: WorkbookRecord): number {
  return record.sections.reduce(
    (total, sec) => total + sec.items.filter((i) => i.checked).length,
    0
  );
}

function totalItems(): number {
  return ACHC_WORKBOOK_SECTIONS.reduce((t, s) => t + s.items.length, 0);
}

function sectionCheckedCount(record: WorkbookRecord, sectionId: string): number {
  return getSectionResponse(record, sectionId).items.filter((i) => i.checked).length;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AchcWorkbook() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;

  const quarter = getCurrentQuarter();

  // Tech roles cannot access this page
  if (profile && isTechRole(profile.role)) {
    return <Redirect to="/app/tasks" />;
  }

  const isViewer = profile ? isRegionalOrAbove(profile.role) : false;
  const canBrowseAll = profile ? isCPO(profile.role) : false;

  // Site selection — CPO can pick any; RPD locked to assigned region's stores;
  // director locked to own site
  const defaultSiteId = isViewer ? "" : (profile?.siteId ?? "");
  const [selectedSiteId, setSelectedSiteId] = useState<string>(defaultSiteId);

  // Figure out the site list for selector (CPO = all; RPD = region only; director = own site only)
  const selectorStores = canBrowseAll
    ? ALL_STORES
    : isViewer && profile?.region
    ? STORE_REGIONS.find((r) => r.region === profile.region)?.stores ?? ALL_STORES
    : [];

  const activeSiteId = isViewer ? selectedSiteId : (profile?.siteId ?? "");
  const activeSite = findStore(activeSiteId);

  // Record state
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

  // Persist to localStorage whenever record changes
  const persistRecord = useCallback((updated: WorkbookRecord) => {
    const checkedCount = countChecked(updated);
    const status: WorkbookStatus =
      updated.status === "submitted"
        ? "submitted"
        : checkedCount === 0
        ? "not_started"
        : "in_progress";
    const withStatus = { ...updated, status };
    saveWorkbook(withStatus);
    setRecord(withStatus);
  }, []);

  function handleCheck(sectionId: string, itemId: string, checked: boolean) {
    if (!record || submitted || isViewer) return;
    const sections = record.sections.map((sec) => {
      if (sec.sectionId !== sectionId) return sec;
      const items = sec.items.map((it) =>
        it.itemId === itemId ? { ...it, checked } : it
      );
      return { ...sec, items };
    });
    persistRecord({ ...record, sections });
  }

  function handleNotes(sectionId: string, notes: string) {
    if (!record || submitted || isViewer) return;
    const sections = record.sections.map((sec) =>
      sec.sectionId === sectionId ? { ...sec, notes } : sec
    );
    persistRecord({ ...record, sections });
  }

  function handleSubmit() {
    if (!record || !activeSiteId) return;
    submitWorkbook(activeSiteId, quarter, attestorName || (profile?.name ?? ""));
    const updated = loadWorkbook(activeSiteId, quarter);
    if (updated) setRecord(updated);
    setSubmitted(true);
  }

  const checked = record ? countChecked(record) : 0;
  const total = totalItems();
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" data-testid="achc-workbook-page">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-blue-50">
            <ClipboardList className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">ACHC Compliance Workbook</h1>
            <p className="text-sm text-muted-foreground">
              Quarterly self-assessment — {quarter}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {record && statusBadge(record.status)}
        </div>
      </div>

      {/* Viewer site selector (CPO / RPD) */}
      {isViewer && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-wrap items-center gap-3" data-testid="workbook-site-selector-panel">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground shrink-0">Viewing site:</span>
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId} data-testid="workbook-site-select">
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
          {isViewer && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Read-only</span>
            </div>
          )}
        </div>
      )}

      {/* Director site label */}
      {!isViewer && profile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="workbook-site-label">
          <Building2 className="w-4 h-4" />
          <span>{profile.siteName} — Site {profile.siteId}</span>
        </div>
      )}

      {/* Progress bar */}
      {record && activeSiteId && (
        <div className="space-y-1.5" data-testid="workbook-progress-section">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall completion</span>
            <span className="font-medium text-foreground" data-testid="workbook-progress-pct">{pct}% ({checked}/{total})</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
              data-testid="workbook-progress-bar"
            />
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
            const secChecked = sectionCheckedCount(record, section.id);
            const secTotal = section.items.length;
            const allChecked = secChecked === secTotal;

            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border rounded-md overflow-hidden"
                data-testid={`workbook-section-${section.id}`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-medium text-sm text-left">{section.title}</span>
                    <span
                      className={`text-xs shrink-0 ml-auto mr-2 font-medium ${
                        allChecked ? "text-emerald-600" : secChecked > 0 ? "text-amber-600" : "text-muted-foreground"
                      }`}
                      data-testid={`workbook-section-progress-${section.id}`}
                    >
                      {secChecked}/{secTotal}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
                  <p className="text-xs text-muted-foreground mb-4">{section.description}</p>

                  <div className="space-y-3 mb-4">
                    {section.items.map((item) => {
                      const resp = secResp.items.find((i) => i.itemId === item.id);
                      const isChecked = resp?.checked ?? false;

                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3"
                          data-testid={`workbook-item-${item.id}`}
                        >
                          <Checkbox
                            id={`check-${item.id}`}
                            checked={isChecked}
                            disabled={submitted || isViewer}
                            onCheckedChange={(val) =>
                              handleCheck(section.id, item.id, !!val)
                            }
                            data-testid={`workbook-checkbox-${item.id}`}
                          />
                          <Label
                            htmlFor={`check-${item.id}`}
                            className={`text-sm leading-snug cursor-pointer select-none ${
                              isChecked ? "line-through text-muted-foreground" : "text-foreground"
                            } ${(submitted || isViewer) ? "cursor-default" : ""}`}
                          >
                            {item.text}
                          </Label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Section notes</Label>
                    <Textarea
                      placeholder={isViewer || submitted ? "No notes entered." : "Add notes, observations, or follow-up items for this section…"}
                      value={secResp.notes}
                      readOnly={submitted || isViewer}
                      onChange={(e) => handleNotes(section.id, e.target.value)}
                      className="text-sm resize-none min-h-[72px]"
                      data-testid={`workbook-notes-${section.id}`}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Attestation + submit — directors only, not submitted yet */}
      {record && activeSiteId && !isViewer && !submitted && (
        <div className="rounded-md border px-5 py-5 space-y-4" data-testid="workbook-attestation">
          <h2 className="text-sm font-semibold text-foreground">Attestation & Submission</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            By submitting this workbook, you attest that the information entered is accurate and reflects
            the current state of ACHC compliance at your site for {quarter}. This attestation is stored
            locally and may be used as part of your site's accreditation records.
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
                  {total - checked} item{total - checked !== 1 ? "s" : ""} unchecked — you can still submit.
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">All items completed.</span>
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

      {/* Read-only footer for submitted director view */}
      {record && activeSiteId && !isViewer && submitted && (
        <div className="text-center text-sm text-muted-foreground py-4" data-testid="workbook-locked-note">
          <Lock className="w-4 h-4 inline mr-1.5 mb-0.5" />
          This workbook is locked. Contact your Regional Director to request a re-submission.
        </div>
      )}
    </div>
  );
}
