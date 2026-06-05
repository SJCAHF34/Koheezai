import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isCPO,
  isPharmacyDirector,
  isRegionalOrAbove,
  isTechRole,
  getAssignedRegion,
} from "@/lib/userProfile";
import { ALL_STORES, findStore, findStoreRegion, STORE_REGIONS } from "@/lib/storeDirectory";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  QA_AUDIT_SECTIONS,
  QA_AUDIT_TOTAL_ITEMS,
  findQaAuditItem,
  getCurrentAuditYear,
  type QaAuditItem,
  type QaAuditSection,
} from "@/lib/qaAuditData";
import type {
  QaAuditEvidence,
  QaAuditItemResponse,
  QaAuditStatus,
  QaAuditWorkbook,
} from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Lock,
  MinusCircle,
  Paperclip,
  Plus,
  Send,
  Upload,
  X,
} from "lucide-react";

// ── Status helpers ─────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: QaAuditStatus; label: string }[] = [
  { value: "", label: "Not Reviewed" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "na", label: "N/A" },
];

function statusBadge(status: QaAuditStatus) {
  if (status === "pass")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 shrink-0 text-xs">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Pass
      </Badge>
    );
  if (status === "fail")
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 shrink-0 text-xs">
        <AlertCircle className="w-3 h-3 mr-1" /> Fail
      </Badge>
    );
  if (status === "na")
    return (
      <Badge className="bg-muted text-muted-foreground shrink-0 text-xs">
        <MinusCircle className="w-3 h-3 mr-1" /> N/A
      </Badge>
    );
  return (
    <Badge variant="outline" className="shrink-0 text-xs">
      <Clock className="w-3 h-3 mr-1" /> Not Reviewed
    </Badge>
  );
}

function workbookStatusBadge(status: QaAuditWorkbook["status"] | "not_started") {
  if (status === "submitted")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        <Lock className="w-3 h-3 mr-1" /> Submitted
      </Badge>
    );
  if (status === "in_progress")
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <Clock className="w-3 h-3 mr-1" /> In Progress
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Clock className="w-3 h-3 mr-1" /> Not Started
    </Badge>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = getCurrentAuditYear();
const YEAR_OPTIONS = [
  String(Number(CURRENT_YEAR) + 1),
  CURRENT_YEAR,
  String(Number(CURRENT_YEAR) - 1),
  String(Number(CURRENT_YEAR) - 2),
];

function buildEmptyResponses(verifierName: string): QaAuditItemResponse[] {
  const items: QaAuditItem[] = QA_AUDIT_SECTIONS.flatMap((s) => s.items);
  return items.map((i) => ({
    itemId: i.id,
    status: "" as QaAuditStatus,
    notes: "",
    verifierName,
    evidence: [] as QaAuditEvidence[],
  }));
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export default function QaAuditWorkbook() {
  const { user } = useAuth();
  const { toast } = useToast();
  const profile = useMemo(
    () => (user ? getUserProfile(user.email, user.name ?? "") : null),
    [user],
  );

  if (!profile || isTechRole(profile.role)) {
    return (
      <main className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-qa-no-access">
            QA Audit Readiness is restricted to Pharmacy Directors and above.
          </CardContent>
        </Card>
      </main>
    );
  }

  const isCpo = isCPO(profile.role);
  const isRegional = isRegionalOrAbove(profile.role);
  const isPd = isPharmacyDirector(profile.role);
  const region = getAssignedRegion(profile);

  // Site selector — PDs default to their store; RPDs to first in region; CPO to first overall
  const visibleStores = useMemo(() => {
    if (isCpo) return ALL_STORES;
    if (isRegional && region) {
      const r = STORE_REGIONS.find((g) => g.region === region);
      return r ? r.stores : ALL_STORES;
    }
    if (isPd && profile.siteId && profile.siteId !== "ALL") {
      const s = findStore(profile.siteId);
      return s ? [s] : [];
    }
    return [];
  }, [isCpo, isRegional, isPd, region, profile.siteId]);

  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    if (isPd && profile.siteId && profile.siteId !== "ALL") return profile.siteId;
    return visibleStores[0]?.id ?? "";
  });
  const [year, setYear] = useState<string>(CURRENT_YEAR);

  // Honor deep links: ?site=X&year=Y&item=Z (used by failure notifications)
  const [highlightItemId, setHighlightItemId] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("site");
    const y = sp.get("year");
    const i = sp.get("item");
    if (s && visibleStores.some((v) => v.id === s)) setSelectedSiteId(s);
    if (y && YEAR_OPTIONS.includes(y)) setYear(y);
    if (i) setHighlightItemId(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selectedStore = findStore(selectedSiteId);
  const selectedRegion = findStoreRegion(selectedSiteId)?.region ?? "";

  // Only the assigned Pharmacy Director may edit their own store's workbook.
  // RPDs and the CPO have read-only access.
  const canEdit = useMemo(() => {
    if (!selectedSiteId) return false;
    if (isPd) return profile.siteId === selectedSiteId;
    return false;
  }, [isPd, profile.siteId, selectedSiteId]);

  // ── Roll-up query ────────────────────────────────────────────────────────
  const rollupQuery = useQuery<QaAuditWorkbook[]>({
    queryKey: [`/api/qa-audit/workbooks?year=${year}`],
  });

  // ── Selected workbook query ──────────────────────────────────────────────
  const wbKey = `/api/qa-audit/workbooks/${selectedSiteId}/${year}`;
  const workbookQuery = useQuery<QaAuditWorkbook | null>({
    queryKey: [wbKey],
    enabled: !!selectedSiteId,
  });

  const [responses, setResponses] = useState<QaAuditItemResponse[]>([]);
  const [dirty, setDirty] = useState(false);
  const responsesRef = useRef<QaAuditItemResponse[]>([]);
  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);
  // Serialize evidence auto-saves so an older PUT can't overwrite a newer one.
  const evidenceSaveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  // Monotonic edit counter so a completing save only clears the dirty flag when
  // no newer edits have landed since that save was kicked off.
  const changeSeqRef = useRef(0);
  // The edit version most recently handed to a save, so the debounce won't queue
  // a redundant PUT for edits already being saved (e.g. after an evidence upload
  // that saves immediately).
  const lastQueuedSeqRef = useRef(-1);
  // Tracks the currently-loaded workbook (site/year) so a debounced auto-save
  // scheduled before a site/year switch is dropped instead of writing the wrong
  // workbook.
  const wbKeyRef = useRef(wbKey);
  useEffect(() => {
    wbKeyRef.current = wbKey;
  }, [wbKey]);

  useEffect(() => {
    if (!selectedSiteId) {
      setResponses([]);
      setDirty(false);
      return;
    }
    const wb = workbookQuery.data;
    if (wb && wb.responses.length > 0) {
      // ensure every catalog item present
      const existing = new Map(wb.responses.map((r) => [r.itemId, r]));
      const merged = QA_AUDIT_SECTIONS.flatMap((s) => s.items).map((i) =>
        existing.get(i.id) ?? {
          itemId: i.id,
          status: "" as QaAuditStatus,
          notes: "",
          verifierName: profile.name,
          evidence: [],
        },
      );
      setResponses(merged);
    } else if (workbookQuery.isFetched) {
      setResponses(buildEmptyResponses(profile.name));
    }
    setDirty(false);
  }, [selectedSiteId, year, workbookQuery.data, workbookQuery.isFetched, profile.name]);

  const submitted = workbookQuery.data?.status === "submitted";
  const readOnly = !canEdit || submitted;

  // Scroll-to + highlight a deep-linked failing item once responses render.
  useEffect(() => {
    if (!highlightItemId || responses.length === 0) return;
    const el = document.querySelector(`[data-testid="item-${highlightItemId}"]`);
    if (el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-500");
      const t = setTimeout(() => el.classList.remove("ring-2", "ring-amber-500"), 4000);
      return () => clearTimeout(t);
    }
  }, [highlightItemId, responses.length]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (rs: QaAuditItemResponse[]) => {
      return apiRequest<QaAuditWorkbook>(wbKey, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSiteId,
          siteName: selectedStore?.name ?? selectedSiteId,
          region: selectedRegion,
          year,
          responses: rs,
        }),
      });
    },
    onSuccess: () => {
      // Don't invalidate the per-workbook query here — a refetch would run the
      // load effect and could overwrite edits the user made while this save was
      // in flight. Local `responses` is the source of truth while editing; the
      // dirty flag is cleared version-aware in performSave(). Only refresh the
      // roll-up summary, which does not feed the editable responses.
      queryClient.invalidateQueries({ queryKey: [`/api/qa-audit/workbooks?year=${year}`] });
    },
    onError: (e: any) => {
      toast({ title: "Save failed", description: e?.message ?? "Try again.", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () =>
      apiRequest<QaAuditWorkbook>(`${wbKey}/submit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [wbKey] });
      queryClient.invalidateQueries({ queryKey: [`/api/qa-audit/workbooks?year=${year}`] });
      toast({ title: "Submitted", description: "Audit locked and submitted." });
    },
    onError: (e: any) => {
      toast({ title: "Submit failed", description: e?.message ?? "Save first.", variant: "destructive" });
    },
  });

  // Mark a local edit: bump the change counter and flag unsaved state.
  function markDirty() {
    changeSeqRef.current += 1;
    setDirty(true);
  }

  // Serialized, version-aware save. Runs through evidenceSaveChainRef so saves
  // never clobber each other, and clears the dirty flag only if no further edits
  // landed while the request was in flight — so edits made during an in-flight
  // save are never silently dropped and Submit stays disabled until the latest
  // edits are actually persisted.
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function performSave() {
    // Cancel any pending debounced save so an explicit/queued save can't be
    // followed by a redundant second PUT for the same edits.
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    // Snapshot the payload, edit version, and workbook key at enqueue time so a
    // save queued behind an in-flight one can't pick up another workbook's
    // responses (or write to the wrong endpoint) after a site/year switch.
    const seq = changeSeqRef.current;
    lastQueuedSeqRef.current = seq;
    const scheduledWbKey = wbKey;
    const payload = responsesRef.current;
    evidenceSaveChainRef.current = evidenceSaveChainRef.current
      .catch(() => undefined)
      .then(() => {
        if (wbKeyRef.current !== scheduledWbKey) return undefined;
        return saveMutation.mutateAsync(payload);
      })
      .then(() => {
        if (wbKeyRef.current === scheduledWbKey && changeSeqRef.current === seq) {
          setDirty(false);
        }
      })
      .catch(() => undefined);
    return evidenceSaveChainRef.current;
  }

  // Auto-save notes and Pass/Fail/N/A changes (debounced) so nothing is lost if
  // the user refreshes or navigates away without clicking Save. Evidence uploads
  // already auto-save; this brings notes/status to parity.
  useEffect(() => {
    if (readOnly || !dirty) return;
    // Skip when the current edit version is already being saved (e.g. an evidence
    // upload that saved immediately) to avoid a redundant second PUT.
    if (lastQueuedSeqRef.current === changeSeqRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const scheduledWbKey = wbKey;
    autoSaveTimerRef.current = setTimeout(() => {
      // Drop the save if the user switched site/year before it fired — otherwise
      // we'd persist edits against the wrong workbook.
      if (wbKeyRef.current !== scheduledWbKey) return;
      performSave();
    }, 1000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, responses, readOnly, wbKey]);

  function updateResponse(itemId: string, patch: Partial<QaAuditItemResponse>) {
    if (readOnly) return;
    const next = responsesRef.current.map((r) =>
      r.itemId === itemId
        ? {
            ...r,
            ...patch,
            verifiedAt:
              patch.status !== undefined && patch.status !== ""
                ? new Date().toISOString()
                : r.verifiedAt,
          }
        : r,
    );
    responsesRef.current = next;
    setResponses(next);
    markDirty();
  }

  async function handleUpload(itemId: string, file: File) {
    try {
      const dataBase64 = await fileToBase64(file);
      const evidence = await apiRequest<QaAuditEvidence>("/api/qa-audit/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSiteId,
          year,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          dataBase64,
        }),
      });
      const nextResponses = responsesRef.current.map((r) =>
        r.itemId === itemId ? { ...r, evidence: [...r.evidence, evidence] } : r,
      );
      responsesRef.current = nextResponses;
      setResponses(nextResponses);
      markDirty();
      toast({ title: "Uploaded", description: file.name });
      await performSave();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? "Try again.", variant: "destructive" });
    }
  }

  async function removeEvidence(itemId: string, evidenceId: string) {
    if (readOnly) return;
    const nextResponses = responsesRef.current.map((r) =>
      r.itemId === itemId
        ? { ...r, evidence: r.evidence.filter((e) => e.id !== evidenceId) }
        : r,
    );
    responsesRef.current = nextResponses;
    setResponses(nextResponses);
    markDirty();
    await performSave();
  }

  // Server-persisted handoff: notifies the site's PD(s) with a deep link to the
  // failing item. Works for any viewer (PD on own site, RPD on region sites,
  // CPO on any site) and survives across users / sessions.
  const followUpMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const meta = findQaAuditItem(itemId);
      const resp = responses.find((r) => r.itemId === itemId);
      if (!meta || !resp || !selectedStore) throw new Error("Missing item context");
      return apiRequest<{ ok: boolean; link: string; recipients: string[]; taskIds: string[] }>(
        "/api/qa-audit/follow-up",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: selectedSiteId,
            year,
            itemId,
            itemTitle: meta.item.title,
            sectionTitle: meta.section.title,
            notes: resp.notes ?? "",
          }),
        },
      );
    },
    onSuccess: (res, itemId) => {
      // The server stamps taskCreatedId on the workbook response, so just
      // refetch — every viewer (PD/RPD/CPO) will then see the "sent" badge.
      queryClient.invalidateQueries({ queryKey: [wbKey] });
      queryClient.invalidateQueries({ queryKey: [`/api/qa-audit/workbooks?year=${year}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/qa-audit/tasks"] });
      setSentItemIds((prev) => new Set(prev).add(itemId));
      const taskCount = res.taskIds?.length ?? 0;
      toast({
        title: "Urgent task created",
        description:
          taskCount > 0
            ? `Assigned to ${taskCount} Pharmacy Director${taskCount === 1 ? "" : "s"} for ${selectedStore?.name ?? selectedSiteId}.`
            : `Recorded urgent follow-up for ${selectedStore?.name ?? selectedSiteId}.`,
      });
    },
    onError: (e: any) => {
      toast({
        title: "Could not send follow-up",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    },
  });
  const [sentItemIds, setSentItemIds] = useState<Set<string>>(new Set());

  // ── Counts ───────────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    let pass = 0,
      fail = 0,
      na = 0,
      pending = 0;
    for (const r of responses) {
      if (r.status === "pass") pass++;
      else if (r.status === "fail") fail++;
      else if (r.status === "na") na++;
      else pending++;
    }
    return { pass, fail, na, pending, total: QA_AUDIT_TOTAL_ITEMS };
  }, [responses]);

  function exportPdf() {
    window.print();
  }

  // Roll-up: failing counts by section and a flat "not started" list
  const rollupBySection = useMemo(() => {
    const all = rollupQuery.data ?? [];
    const visibleIds = new Set(visibleStores.map((s) => s.id));
    const sites = all.filter((w) => visibleIds.has(w.siteId));
    const bySection: Record<string, { section: QaAuditSection; failingSites: { siteId: string; siteName: string; n: number }[]; totalFails: number }> = {};
    for (const sec of QA_AUDIT_SECTIONS) {
      bySection[sec.id] = { section: sec, failingSites: [], totalFails: 0 };
    }
    for (const wb of sites) {
      for (const sec of QA_AUDIT_SECTIONS) {
        const ids = new Set(sec.items.map((i) => i.id));
        const n = wb.responses.filter((r) => ids.has(r.itemId) && r.status === "fail").length;
        if (n > 0) {
          bySection[sec.id].failingSites.push({ siteId: wb.siteId, siteName: wb.siteName, n });
          bySection[sec.id].totalFails += n;
        }
      }
    }
    const submittedSiteIds = new Set(sites.filter((w) => w.status === "submitted").map((w) => w.siteId));
    const notStarted = visibleStores.filter((s) => !sites.some((w) => w.siteId === s.id));
    const inProgressNotSubmitted = sites.filter((w) => w.status !== "submitted");
    const pctComplete = visibleStores.length > 0
      ? Math.round((submittedSiteIds.size / visibleStores.length) * 100)
      : 0;
    return { bySection, notStarted, inProgressNotSubmitted, pctComplete, submittedCount: submittedSiteIds.size };
  }, [rollupQuery.data, visibleStores]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="container mx-auto p-4 md:p-6 space-y-4 print:p-0">
      <style>{`
        @media print {
          @page { size: letter; margin: 0.35in; }
          html, body { background: #fff !important; color: #000 !important; font-size: 9pt !important; line-height: 1.2 !important; }
          .no-print, .screen-only { display: none !important; }
          .print-only { display: block !important; }
          .qa-print-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6pt; }
          .qa-print-table th, .qa-print-table td { border: 1px solid #999; padding: 2pt 4pt; vertical-align: top; font-size: 8.5pt; word-wrap: break-word; overflow-wrap: anywhere; }
          .qa-print-table th { background: #eee !important; text-align: left; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .qa-print-section { break-inside: auto; page-break-inside: auto; margin-bottom: 8pt; }
          .qa-print-section h3 { font-size: 10.5pt; margin: 6pt 0 3pt; font-weight: 700; }
          .qa-print-row-fail td { background: #fdecec !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .qa-print-row-pass td { background: #effaf0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .qa-print-status { font-weight: 700; text-transform: uppercase; font-size: 8pt; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print-only compact layout */}
      <div className="print-only">
        <div className="mb-2">
          <div style={{ fontSize: "14pt", fontWeight: 700 }}>QA Audit Readiness Workbook</div>
          <div style={{ fontSize: "9pt", marginTop: 2 }}>
            <strong>Site:</strong> {workbookQuery.data?.siteId ?? selectedSiteId} — {workbookQuery.data?.siteName ?? ""}
            &nbsp;·&nbsp; <strong>Year:</strong> {year}
            &nbsp;·&nbsp; <strong>Status:</strong> {workbookQuery.data?.status ?? "not_started"}
            {workbookQuery.data?.submittedAt && (
              <> &nbsp;·&nbsp; Submitted {new Date(workbookQuery.data.submittedAt).toLocaleDateString()} by {workbookQuery.data.submittedByName ?? ""}</>
            )}
          </div>
          <div style={{ fontSize: "9pt" }}>
            <strong>Pass</strong> {counts.pass} &nbsp;·&nbsp; <strong>Fail</strong> {counts.fail} &nbsp;·&nbsp; <strong>N/A</strong> {counts.na} &nbsp;·&nbsp; <strong>Pending</strong> {counts.pending} &nbsp;·&nbsp; <strong>Total</strong> {counts.total}
            &nbsp;·&nbsp; Printed {new Date().toLocaleString()}
          </div>
        </div>

        {QA_AUDIT_SECTIONS.map((section) => (
          <div key={section.id} className="qa-print-section">
            <h3>{section.number}. {section.title}</h3>
            <table className="qa-print-table">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "34%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Verifier</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((item, idx) => {
                  const r = responses.find((x) => x.itemId === item.id);
                  const status = r?.status ?? "";
                  const rowClass =
                    status === "fail" ? "qa-print-row-fail" :
                    status === "pass" ? "qa-print-row-pass" : "";
                  const statusLabel = status === "" ? "—" : status === "na" ? "N/A" : status;
                  return (
                    <tr key={item.id} className={rowClass}>
                      <td>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        {item.detail && <div style={{ fontSize: "7.5pt", color: "#444" }}>{item.detail}</div>}
                      </td>
                      <td className="qa-print-status">{statusLabel}</td>
                      <td>{r?.notes || ""}</td>
                      <td>
                        {r?.verifierName || ""}
                        {r?.verifiedAt && (
                          <div style={{ fontSize: "7pt", color: "#555" }}>
                            {new Date(r.verifiedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "7.5pt" }}>
                        {(r?.evidence ?? []).length === 0
                          ? ""
                          : (r?.evidence ?? []).map((e) => e.fileName).join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="screen-only contents">

      {/* Header */}
      <Card className="no-print">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl" data-testid="title-qa-audit">
                <ClipboardCheck className="w-6 h-6 text-primary" />
                QA Audit Readiness Workbook
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Yearly self-audit for AHF pharmacies. Document Pass / Fail / N/A with notes,
                verifier, and supporting evidence for every item.
              </p>
            </div>
            <Button variant="outline" onClick={exportPdf} data-testid="button-export-pdf">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs">Site</Label>
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger data-testid="select-qa-site">
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {visibleStores.map((s) => (
                  <SelectItem key={s.id} value={s.id} data-testid={`option-qa-site-${s.id}`}>
                    {s.id} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Audit Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger data-testid="select-qa-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y} data-testid={`option-qa-year-${y}`}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            {workbookStatusBadge(workbookQuery.data?.status ?? "not_started")}
            {workbookQuery.data?.submittedAt && (
              <span className="text-xs text-muted-foreground" data-testid="text-qa-submitted-at">
                Submitted {new Date(workbookQuery.data.submittedAt).toLocaleDateString()}{" "}
                by {workbookQuery.data.submittedByName ?? ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Roll-up across sites */}
      {(isRegional || isCpo) && (
        <>
          {/* Dashboard tiles */}
          <Card className="no-print">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Roll-Up Dashboard — {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Sites Submitted</div>
                <div className="text-2xl font-semibold" data-testid="stat-rollup-submitted">
                  {rollupBySection.submittedCount} / {visibleStores.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {rollupBySection.pctComplete}% complete
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">In Progress</div>
                <div className="text-2xl font-semibold text-amber-700 dark:text-amber-300" data-testid="stat-rollup-inprogress">
                  {rollupBySection.inProgressNotSubmitted.length}
                </div>
              </div>
              <div className="rounded-md border p-3 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
                <div className="text-xs text-red-800 dark:text-red-200">
                  Stores Not Started
                </div>
                <div
                  className="text-2xl font-semibold text-red-700 dark:text-red-300"
                  data-testid="stat-rollup-notstarted"
                >
                  {rollupBySection.notStarted.length}
                </div>
                {rollupBySection.notStarted.length > 0 && (
                  <div className="text-xs text-red-700 dark:text-red-300 mt-1 line-clamp-2">
                    {rollupBySection.notStarted.map((s) => s.id).join(", ")}
                  </div>
                )}
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Total Failing Items</div>
                <div className="text-2xl font-semibold text-red-700 dark:text-red-300" data-testid="stat-rollup-fails">
                  {Object.values(rollupBySection.bySection).reduce((a, b) => a + b.totalFails, 0)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Failing items by section */}
          <Card className="no-print">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Failing Items by Section</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {QA_AUDIT_SECTIONS.map((sec) => {
                const entry = rollupBySection.bySection[sec.id];
                const total = entry?.totalFails ?? 0;
                return (
                  <div
                    key={sec.id}
                    className="rounded-md border p-3 flex flex-col gap-1"
                    data-testid={`rollup-section-${sec.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        {sec.number}. {sec.title}
                      </div>
                      <Badge
                        className={
                          total > 0
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        }
                      >
                        {total} failing
                      </Badge>
                    </div>
                    {total > 0 && (
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                        {entry.failingSites.map((f) => (
                          <button
                            key={f.siteId}
                            type="button"
                            className="hover:underline"
                            onClick={() => setSelectedSiteId(f.siteId)}
                            data-testid={`rollup-fail-${sec.id}-${f.siteId}`}
                          >
                            {f.siteId} ({f.n})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

        <Card className="no-print">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">All Sites — {year}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2 pr-2">Site</th>
                  <th className="py-2 pr-2">Region</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2 text-right">Pass</th>
                  <th className="py-2 pr-2 text-right">Fail</th>
                  <th className="py-2 pr-2 text-right">N/A</th>
                  <th className="py-2 pr-2 text-right">Pending</th>
                  <th className="py-2 pr-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleStores.map((s) => {
                  const wb = rollupQuery.data?.find((w) => w.siteId === s.id);
                  const rs = wb?.responses ?? [];
                  const p = rs.filter((r) => r.status === "pass").length;
                  const f = rs.filter((r) => r.status === "fail").length;
                  const n = rs.filter((r) => r.status === "na").length;
                  const pending = QA_AUDIT_TOTAL_ITEMS - (p + f + n);
                  return (
                    <tr
                      key={s.id}
                      className="border-b last:border-b-0 hover-elevate cursor-pointer"
                      onClick={() => setSelectedSiteId(s.id)}
                      data-testid={`row-qa-rollup-${s.id}`}
                    >
                      <td className="py-2 pr-2 font-medium">{s.id} — {s.name}</td>
                      <td className="py-2 pr-2 text-muted-foreground">
                        {findStoreRegion(s.id)?.region ?? "—"}
                      </td>
                      <td className="py-2 pr-2">{workbookStatusBadge(wb?.status ?? "not_started")}</td>
                      <td className="py-2 pr-2 text-right text-emerald-700 dark:text-emerald-300">{p}</td>
                      <td className="py-2 pr-2 text-right text-red-700 dark:text-red-300">{f}</td>
                      <td className="py-2 pr-2 text-right text-muted-foreground">{n}</td>
                      <td className="py-2 pr-2 text-right">{pending}</td>
                      <td className="py-2 pr-2 text-muted-foreground text-xs">
                        {wb?.lastUpdatedAt
                          ? new Date(wb.lastUpdatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        </>
      )}

      {/* Summary for selected workbook */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryStat label="Items" value={counts.total} />
          <SummaryStat label="Pass" value={counts.pass} accent="emerald" />
          <SummaryStat label="Fail" value={counts.fail} accent="red" />
          <SummaryStat label="N/A" value={counts.na} />
          <SummaryStat label="Pending" value={counts.pending} accent="amber" />
        </CardContent>
      </Card>

      {!selectedSiteId ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a site to begin.
          </CardContent>
        </Card>
      ) : workbookQuery.isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3" defaultValue={QA_AUDIT_SECTIONS.map((s) => s.id)}>
          {QA_AUDIT_SECTIONS.map((section) => {
            const sectionResponses = responses.filter((r) =>
              section.items.some((i) => i.id === r.itemId),
            );
            const passN = sectionResponses.filter((r) => r.status === "pass").length;
            const failN = sectionResponses.filter((r) => r.status === "fail").length;
            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border rounded-md bg-card"
                data-testid={`section-${section.id}`}
              >
                <AccordionTrigger className="px-4">
                  <div className="flex flex-1 items-center justify-between gap-3 flex-wrap pr-2">
                    <div className="text-left">
                      <div className="font-semibold">
                        {section.number}. {section.title}
                      </div>
                      <div className="text-xs text-muted-foreground">{section.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {sectionResponses.filter((r) => r.status !== "").length}/
                        {section.items.length} reviewed
                      </Badge>
                      {failN > 0 && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 text-xs">
                          {failN} fail
                        </Badge>
                      )}
                      {passN === section.items.length && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs">
                          All pass
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  {section.items.map((item) => {
                    const r =
                      responses.find((x) => x.itemId === item.id) ?? {
                        itemId: item.id,
                        status: "" as QaAuditStatus,
                        notes: "",
                        verifierName: "",
                        evidence: [] as QaAuditEvidence[],
                      };
                    return (
                      <ItemRow
                        key={item.id}
                        item={item}
                        response={r}
                        readOnly={readOnly}
                        onChangeStatus={(s) => updateResponse(item.id, { status: s })}
                        onChangeNotes={(n) => updateResponse(item.id, { notes: n })}
                        onChangeVerifier={(v) => updateResponse(item.id, { verifierName: v })}
                        onUpload={(file) => handleUpload(item.id, file)}
                        onRemoveEvidence={(eid) => removeEvidence(item.id, eid)}
                        onSendToTask={() => followUpMutation.mutate(item.id)}
                        sendingTask={followUpMutation.isPending && followUpMutation.variables === item.id}
                        alreadySent={!!r.taskCreatedId || sentItemIds.has(item.id)}
                      />
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Action bar */}
      {selectedSiteId && (
        <div className="no-print sticky bottom-0 z-50 bg-background/95 backdrop-blur border-t p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {readOnly
              ? submitted
                ? "This audit has been submitted and is locked."
                : "You do not have permission to edit this site's audit."
              : saveMutation.isPending
                ? "Saving…"
                : dirty
                  ? "Saving changes…"
                  : "All changes saved."}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={readOnly || !dirty || saveMutation.isPending}
              onClick={() => performSave()}
              data-testid="button-qa-save"
            >
              <Upload className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              disabled={
                readOnly ||
                dirty ||
                submitMutation.isPending ||
                !workbookQuery.data ||
                counts.pending > 0
              }
              onClick={() => submitMutation.mutate()}
              data-testid="button-qa-submit"
              title={
                counts.pending > 0
                  ? `Answer all items before submitting (${counts.pending} remaining).`
                  : undefined
              }
            >
              <Send className="w-4 h-4 mr-2" />
              {submitMutation.isPending
                ? "Submitting…"
                : counts.pending > 0
                  ? `Submit (${counts.pending} pending)`
                  : "Submit Audit"}
            </Button>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "red" | "amber";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : accent === "red"
        ? "text-red-700 dark:text-red-300"
        : accent === "amber"
          ? "text-amber-700 dark:text-amber-300"
          : "";
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`} data-testid={`stat-qa-${label.toLowerCase()}`}>
        {value}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  response,
  readOnly,
  onChangeStatus,
  onChangeNotes,
  onChangeVerifier,
  onUpload,
  onRemoveEvidence,
  onSendToTask,
  sendingTask,
  alreadySent,
}: {
  item: QaAuditItem;
  response: QaAuditItemResponse;
  readOnly: boolean;
  onChangeStatus: (s: QaAuditStatus) => void;
  onChangeNotes: (n: string) => void;
  onChangeVerifier: (v: string) => void;
  onUpload: (f: File) => void;
  onRemoveEvidence: (eid: string) => void;
  onSendToTask: () => void;
  sendingTask: boolean;
  alreadySent: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="rounded-md border p-3 space-y-2" data-testid={`item-${item.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="font-medium text-sm">{item.title}</div>
          {item.detail && (
            <div className="text-xs text-muted-foreground mt-0.5">{item.detail}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge(response.status)}
          <Select
            value={response.status}
            onValueChange={(v) => onChangeStatus(v as QaAuditStatus)}
            disabled={readOnly}
          >
            <SelectTrigger className="w-[160px]" data-testid={`select-status-${item.id}`}>
              <SelectValue placeholder="Not Reviewed" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.filter((o) => o.value !== "").map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea
            rows={2}
            value={response.notes}
            disabled={readOnly}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Observations, location, next steps…"
            data-testid={`input-notes-${item.id}`}
          />
        </div>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Verifier</Label>
            <Input
              value={response.verifierName}
              disabled={readOnly}
              onChange={(e) => onChangeVerifier(e.target.value)}
              placeholder="Name of person who verified"
              data-testid={`input-verifier-${item.id}`}
            />
          </div>
          {response.verifiedAt && (
            <div className="text-xs text-muted-foreground" data-testid={`text-verified-at-${item.id}`}>
              Last set: {new Date(response.verifiedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Evidence */}
      <div>
        <Label className="text-xs">Evidence</Label>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {response.evidence.map((e) => {
            const isImage = (e.fileType ?? "").startsWith("image/");
            return (
              <div
                key={e.id}
                className="flex items-center gap-2"
                data-testid={`evidence-${item.id}-${e.id}`}
              >
                {isImage && (
                  <a
                    href={`/api/qa-audit/evidence/${e.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={`/api/qa-audit/evidence/${e.id}`}
                      alt={e.fileName}
                      className="h-12 w-12 object-cover rounded border print:h-24 print:w-24"
                    />
                  </a>
                )}
                <Badge
                  variant="outline"
                  className="text-xs gap-1 max-w-full"
                  data-testid={`badge-evidence-${item.id}-${e.id}`}
                >
                  <a
                    href={`/api/qa-audit/evidence/${e.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 truncate max-w-[160px]"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{e.fileName}</span>
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      className="ml-1 opacity-70 hover:opacity-100"
                      onClick={() => onRemoveEvidence(e.id)}
                      aria-label="Remove evidence"
                      data-testid={`button-remove-evidence-${item.id}-${e.id}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              </div>
            );
          })}
          {!readOnly && (
            <>
              <input
                ref={fileRef}
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                data-testid={`file-input-${item.id}`}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                data-testid={`button-upload-${item.id}`}
              >
                <Paperclip className="w-3 h-3 mr-1" /> Attach
              </Button>
            </>
          )}
        </div>
      </div>

      {response.status === "fail" && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t mt-2 flex-wrap">
          <div className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Marked as fail — escalate to the
            store's Pharmacy Director.
          </div>
          {alreadySent ? (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Urgent follow-up sent
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onSendToTask}
              disabled={sendingTask}
              data-testid={`button-send-to-task-${item.id}`}
            >
              <Plus className="w-3 h-3 mr-1" />
              {sendingTask ? "Sending…" : "Send to Task Manager"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
