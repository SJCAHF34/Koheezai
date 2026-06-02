import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import {
  getUserProfile,
  isTechRole,
  isRegionalOrAbove,
  isCPO,
  isPharmacyDirector,
} from "@/lib/userProfile";
import {
  ACHC_WORKBOOK_SECTIONS,
  FOUNDATION_DOC_TEMPLATES,
  STAFF_INTERVIEW_QA,
  type WorkbookSection,
  type WorkbookCheckItem,
  type FoundationDocTemplate,
} from "@/lib/achcWorkbookData";
import {
  loadWorkbook,
  saveWorkbook,
  submitWorkbook,
  getCurrentQuarter,
  loadFoundationDocs,
  saveFoundationDoc,
  removeFoundationDocUrl,
  loadStoreDocs,
  saveStoreDoc,
  removeStoreDoc,
  type WorkbookRecord,
  type WorkbookSectionResponse,
  type WorkbookItemResponse,
  type WorkbookItemStatus,
  type WorkbookStatus,
  type FoundationDocRecord,
  type StoreDocRecord,
} from "@/lib/taskStorage";
import { ALL_STORES, STORE_REGIONS, findStore } from "@/lib/storeDirectory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Globe,
  MapPin,
  ExternalLink,
  Plus,
  X,
  Link2,
  FileText,
  Upload,
  Paperclip,
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

// Merge the current ACHC_WORKBOOK_SECTIONS structure into a stored record,
// preserving any saved status/notes by itemId while adding new items/sections
// and dropping obsolete ones. Needed because the workbook content can be rebuilt
// (new item IDs) while an in-quarter record already exists in localStorage.
function reconcileRecord(record: WorkbookRecord): WorkbookRecord {
  const prevSections = new Map(record.sections.map((s) => [s.sectionId, s]));
  let changed = false;
  const sections = ACHC_WORKBOOK_SECTIONS.map((sec) => {
    const prevSec = prevSections.get(sec.id);
    const prevItems = new Map((prevSec?.items ?? []).map((i) => [i.itemId, i]));
    const items = sec.items.map((item) => {
      const prev = prevItems.get(item.id);
      if (prev) return prev;
      changed = true;
      return { itemId: item.id, status: "" as WorkbookItemStatus, notes: "" };
    });
    if (!prevSec || prevSec.items.length !== items.length) changed = true;
    return { sectionId: sec.id, items, sectionNotes: prevSec?.sectionNotes ?? "" };
  });
  if (record.sections.length !== sections.length) changed = true;
  if (!changed) return record;
  return { ...record, sections };
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

// ── URL validation helper ─────────────────────────────────────────────────────

function isValidHttpUrl(url: string): boolean {
  if (/^data:/i.test(url)) return true;
  try { return /^https?:\/\//i.test(new URL(url).href); } catch { return false; }
}

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3 MB cap (localStorage friendly)

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Document Section component ────────────────────────────────────────────────

interface DocumentSectionProps {
  itemId: string;
  evidenceHint: string;
  siteId: string;
  foundationTemplates: FoundationDocTemplate[];
  foundationDocs: FoundationDocRecord[];
  storeDocs: StoreDocRecord[];
  canEditFoundation: boolean;
  canEditStore: boolean;
  editorName: string;
  onFoundationDocSaved: (doc: FoundationDocRecord) => void;
  onFoundationDocRemoved: (id: string) => void;
  onStoreDocSaved: (doc: StoreDocRecord) => void;
  onStoreDocRemoved: (id: string) => void;
}

function DocumentSection({
  itemId,
  evidenceHint,
  siteId,
  foundationTemplates,
  foundationDocs,
  storeDocs,
  canEditFoundation,
  canEditStore,
  editorName,
  onFoundationDocSaved,
  onFoundationDocRemoved,
  onStoreDocSaved,
  onStoreDocRemoved,
}: DocumentSectionProps) {
  const myTemplates = foundationTemplates.filter((t) => t.itemId === itemId);
  const myStoreDocs = storeDocs.filter((d) => d.itemId === itemId);

  // Foundation doc editing: which template id is currently in edit mode
  const [editingFd, setEditingFd] = useState<string | null>(null);
  const [fdUrlDraft, setFdUrlDraft] = useState("");
  const [fdFileDraft, setFdFileDraft] = useState<{ dataUrl: string; name: string; type: string } | null>(null);
  // Saved confirmation flash
  const [savedFd, setSavedFd] = useState<string | null>(null);

  // Store doc add form
  const [addingStore, setAddingStore] = useState(false);
  const [newStoreLabel, setNewStoreLabel] = useState("");
  const [newStoreUrl, setNewStoreUrl] = useState("");
  const [newStoreFile, setNewStoreFile] = useState<{ dataUrl: string; name: string; type: string } | null>(null);

  // Store doc editing: which store doc id is being edited
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editStoreLabel, setEditStoreLabel] = useState("");
  const [editStoreUrl, setEditStoreUrl] = useState("");
  const [editStoreFile, setEditStoreFile] = useState<{ dataUrl: string; name: string; type: string } | null>(null);
  const [savedSd, setSavedSd] = useState<string | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);

  async function pickFile(): Promise<{ dataUrl: string; name: string; type: string } | null> {
    setUploadError(null);
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv,application/pdf,image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        if (file.size > MAX_UPLOAD_BYTES) {
          setUploadError(`File too large (${formatBytes(file.size)}). Limit is ${formatBytes(MAX_UPLOAD_BYTES)}; paste a URL instead for larger files.`);
          return resolve(null);
        }
        try {
          const dataUrl = await readFileAsDataUrl(file);
          resolve({ dataUrl, name: file.name, type: file.type || "application/octet-stream" });
        } catch {
          setUploadError("Could not read file. Try again or paste a URL instead.");
          resolve(null);
        }
      };
      input.click();
    });
  }

  function getFoundationRecord(templateId: string): FoundationDocRecord | undefined {
    return foundationDocs.find((d) => d.id === templateId);
  }

  function startEditFd(template: FoundationDocTemplate) {
    if (!canEditFoundation) return;
    const existing = getFoundationRecord(template.id);
    setFdUrlDraft(existing && !existing.fileName ? existing.url : "");
    setFdFileDraft(
      existing?.fileName
        ? { dataUrl: existing.url, name: existing.fileName, type: existing.fileType ?? "" }
        : null,
    );
    setEditingFd(template.id);
    setSavedFd(null);
    setUploadError(null);
  }

  function commitFdUrl(template: FoundationDocTemplate) {
    const trimmed = fdUrlDraft.trim();
    if (fdFileDraft) {
      onFoundationDocSaved({
        id: template.id,
        itemId: template.itemId,
        label: template.label,
        description: template.description,
        url: fdFileDraft.dataUrl,
        fileName: fdFileDraft.name,
        fileType: fdFileDraft.type,
        addedBy: editorName,
        addedAt: new Date().toISOString(),
      });
      setSavedFd(template.id);
      setTimeout(() => setSavedFd(null), 2000);
      setEditingFd(null);
      setFdUrlDraft("");
      setFdFileDraft(null);
      return;
    }
    if (trimmed && isValidHttpUrl(trimmed)) {
      onFoundationDocSaved({
        id: template.id,
        itemId: template.itemId,
        label: template.label,
        description: template.description,
        url: trimmed,
        addedBy: editorName,
        addedAt: new Date().toISOString(),
      });
      setSavedFd(template.id);
      setTimeout(() => setSavedFd(null), 2000);
    } else if (!trimmed) {
      onFoundationDocRemoved(template.id);
    }
    // if invalid URL, stay in editing mode
    if (!trimmed || isValidHttpUrl(trimmed)) {
      setEditingFd(null);
      setFdUrlDraft("");
    }
  }

  function commitStoreDoc() {
    const label = newStoreLabel.trim();
    if (!label) return;
    if (newStoreFile) {
      const id = `sd-${siteId}-${itemId}-${Date.now()}`;
      onStoreDocSaved({
        id,
        siteId,
        itemId,
        label,
        url: newStoreFile.dataUrl,
        fileName: newStoreFile.name,
        fileType: newStoreFile.type,
        uploadedBy: editorName,
        uploadedAt: new Date().toISOString(),
      });
    } else {
      const url = newStoreUrl.trim();
      if (!url || !isValidHttpUrl(url)) return;
      const id = `sd-${siteId}-${itemId}-${Date.now()}`;
      onStoreDocSaved({
        id,
        siteId,
        itemId,
        label,
        url,
        uploadedBy: editorName,
        uploadedAt: new Date().toISOString(),
      });
    }
    setNewStoreLabel("");
    setNewStoreUrl("");
    setNewStoreFile(null);
    setAddingStore(false);
    setUploadError(null);
  }

  function startEditStoreDoc(doc: StoreDocRecord) {
    setEditingStoreId(doc.id);
    setEditStoreLabel(doc.label);
    setEditStoreUrl(doc.fileName ? "" : doc.url);
    setEditStoreFile(
      doc.fileName ? { dataUrl: doc.url, name: doc.fileName, type: doc.fileType ?? "" } : null,
    );
    setSavedSd(null);
    setUploadError(null);
  }

  function commitStoreEdit(doc: StoreDocRecord) {
    const label = editStoreLabel.trim();
    if (!label) return;
    if (editStoreFile) {
      onStoreDocSaved({
        ...doc,
        label,
        url: editStoreFile.dataUrl,
        fileName: editStoreFile.name,
        fileType: editStoreFile.type,
        uploadedBy: editorName,
        uploadedAt: new Date().toISOString(),
      });
    } else {
      const url = editStoreUrl.trim();
      if (!url || !isValidHttpUrl(url)) return;
      onStoreDocSaved({
        ...doc,
        label,
        url,
        fileName: undefined,
        fileType: undefined,
        uploadedBy: editorName,
        uploadedAt: new Date().toISOString(),
      });
    }
    setSavedSd(doc.id);
    setTimeout(() => setSavedSd(null), 2000);
    setEditingStoreId(null);
    setEditStoreLabel("");
    setEditStoreUrl("");
    setEditStoreFile(null);
    setUploadError(null);
  }

  const hasAnyDocs = myTemplates.some((t) => !!getFoundationRecord(t.id)?.url) || myStoreDocs.length > 0;

  return (
    <div className="space-y-2" data-testid={`workbook-item-docs-${itemId}`}>
      {/* Foundation docs */}
      {myTemplates.length > 0 && (
        <div className="space-y-1.5">
          {myTemplates.map((template) => {
            const record = getFoundationRecord(template.id);
            const hasUrl = !!record?.url;
            const isEditing = editingFd === template.id;
            const justSaved = savedFd === template.id;

            return (
              <div key={template.id} className="space-y-1" data-testid={`workbook-fd-${template.id}`}>
                <div className="flex flex-wrap items-start gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs text-foreground" title={template.description}>{template.label}</span>
                    <span className="text-xs text-muted-foreground">
                      Foundation{record?.fileName ? ` · ${record.fileName}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {justSaved && (
                      <span className="text-xs text-emerald-600 font-medium" data-testid={`workbook-fd-saved-${template.id}`}>Saved</span>
                    )}
                    {hasUrl && !isEditing && !justSaved && (
                      <a
                        href={record!.url}
                        download={record!.fileName}
                        target={record!.fileName ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        data-testid={`workbook-fd-view-${template.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {record!.fileName ? "Open" : "View"}
                      </a>
                    )}
                    {canEditFoundation && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEditFd(template)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        data-testid={`workbook-fd-edit-${template.id}`}
                      >
                        {hasUrl ? "Edit" : "Add URL / Upload"}
                      </button>
                    )}
                    {!hasUrl && !canEditFoundation && (
                      <span className="text-xs text-muted-foreground italic">Not yet attached</span>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="space-y-1 pl-5" data-testid={`workbook-fd-editor-${template.id}`}>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="url"
                        placeholder="Paste SharePoint / Box / Dropbox URL…"
                        value={fdUrlDraft}
                        onChange={(e) => { setFdUrlDraft(e.target.value); if (e.target.value) setFdFileDraft(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitFdUrl(template);
                          if (e.key === "Escape") { setEditingFd(null); setFdUrlDraft(""); setFdFileDraft(null); }
                        }}
                        disabled={!!fdFileDraft}
                        className="text-xs h-7 flex-1 min-w-0"
                        autoFocus
                        data-testid={`workbook-fd-url-input-${template.id}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 shrink-0 gap-1"
                        onClick={async () => {
                          const f = await pickFile();
                          if (f) { setFdFileDraft(f); setFdUrlDraft(""); }
                        }}
                        data-testid={`workbook-fd-upload-${template.id}`}
                      >
                        <Upload className="w-3 h-3" />
                        Upload
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2 shrink-0"
                        onMouseDown={(e) => { e.preventDefault(); commitFdUrl(template); }}
                        data-testid={`workbook-fd-save-${template.id}`}
                      >
                        Save
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onMouseDown={(e) => { e.preventDefault(); setEditingFd(null); setFdUrlDraft(""); setFdFileDraft(null); }}
                        data-testid={`workbook-fd-cancel-${template.id}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {fdFileDraft && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate" data-testid={`workbook-fd-file-name-${template.id}`}>{fdFileDraft.name}</span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setFdFileDraft(null)}
                          data-testid={`workbook-fd-file-clear-${template.id}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {uploadError && (
                      <p className="text-xs text-red-600" data-testid={`workbook-upload-error-${template.id}`}>{uploadError}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Store-specific docs */}
      {myStoreDocs.length > 0 && (
        <div className="space-y-1.5">
          {myStoreDocs.map((doc) => {
            const isEditingThis = editingStoreId === doc.id;
            const justSaved = savedSd === doc.id;
            return (
              <div key={doc.id} className="space-y-1" data-testid={`workbook-sd-${doc.id}`}>
                <div className="flex flex-wrap items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs text-foreground">
                      {doc.label}
                      {doc.fileName ? <span className="text-muted-foreground"> · {doc.fileName}</span> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">Store — {doc.uploadedBy}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {justSaved && (
                      <span className="text-xs text-emerald-600 font-medium" data-testid={`workbook-sd-saved-${doc.id}`}>Saved</span>
                    )}
                    {!isEditingThis && !justSaved && (
                      <a
                        href={doc.url}
                        download={doc.fileName}
                        target={doc.fileName ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        data-testid={`workbook-sd-view-${doc.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {doc.fileName ? "Open" : "View"}
                      </a>
                    )}
                    {canEditStore && !isEditingThis && (
                      <button
                        type="button"
                        onClick={() => startEditStoreDoc(doc)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        data-testid={`workbook-sd-edit-${doc.id}`}
                      >
                        Edit
                      </button>
                    )}
                    {canEditStore && !isEditingThis && (
                      <button
                        type="button"
                        onClick={() => onStoreDocRemoved(doc.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                        data-testid={`workbook-sd-remove-${doc.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {isEditingThis && (
                  <div className="space-y-1.5 pl-5" data-testid={`workbook-sd-edit-form-${doc.id}`}>
                    <div className="flex gap-1.5 flex-wrap">
                      <Input
                        type="text"
                        placeholder="Label…"
                        value={editStoreLabel}
                        onChange={(e) => setEditStoreLabel(e.target.value)}
                        className="text-xs h-7 flex-1 min-w-[160px]"
                        data-testid={`workbook-sd-edit-label-${doc.id}`}
                      />
                      <Input
                        type="url"
                        placeholder="URL…"
                        value={editStoreUrl}
                        onChange={(e) => { setEditStoreUrl(e.target.value); if (e.target.value) setEditStoreFile(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") commitStoreEdit(doc); if (e.key === "Escape") setEditingStoreId(null); }}
                        disabled={!!editStoreFile}
                        className="text-xs h-7 flex-1 min-w-[160px]"
                        data-testid={`workbook-sd-edit-url-${doc.id}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 gap-1"
                        onClick={async () => {
                          const f = await pickFile();
                          if (f) { setEditStoreFile(f); setEditStoreUrl(""); }
                        }}
                        data-testid={`workbook-sd-edit-upload-${doc.id}`}
                      >
                        <Upload className="w-3 h-3" />
                        Upload
                      </Button>
                    </div>
                    {editStoreFile && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate" data-testid={`workbook-sd-edit-file-name-${doc.id}`}>{editStoreFile.name}</span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setEditStoreFile(null)}
                          data-testid={`workbook-sd-edit-file-clear-${doc.id}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {uploadError && (
                      <p className="text-xs text-red-600">{uploadError}</p>
                    )}
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => commitStoreEdit(doc)}
                        disabled={!editStoreLabel.trim() || (!editStoreUrl.trim() && !editStoreFile)}
                        data-testid={`workbook-sd-edit-save-${doc.id}`}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => { setEditingStoreId(null); setEditStoreLabel(""); setEditStoreUrl(""); setEditStoreFile(null); }}
                        data-testid={`workbook-sd-edit-cancel-${doc.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state with hint */}
      {!hasAnyDocs && !canEditFoundation && !canEditStore && (
        <p className="text-xs text-muted-foreground italic">No documents attached yet.</p>
      )}

      {/* Store doc add form */}
      {canEditStore && !addingStore && (
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setAddingStore(true)}
          data-testid={`workbook-sd-add-btn-${itemId}`}
        >
          <Plus className="w-3 h-3" />
          Add store document
        </button>
      )}
      {canEditStore && addingStore && (
        <div className="space-y-1.5 pt-1" data-testid={`workbook-sd-add-form-${itemId}`}>
          <div className="flex gap-1.5 flex-wrap">
            <Input
              type="text"
              placeholder="Document label…"
              value={newStoreLabel}
              onChange={(e) => setNewStoreLabel(e.target.value)}
              className="text-xs h-7 flex-1 min-w-[160px]"
              data-testid={`workbook-sd-label-input-${itemId}`}
            />
            <Input
              type="url"
              placeholder="URL…"
              value={newStoreUrl}
              onChange={(e) => { setNewStoreUrl(e.target.value); if (e.target.value) setNewStoreFile(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") commitStoreDoc(); }}
              disabled={!!newStoreFile}
              className="text-xs h-7 flex-1 min-w-[160px]"
              data-testid={`workbook-sd-url-input-${itemId}`}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2 gap-1"
              onClick={async () => {
                const f = await pickFile();
                if (f) { setNewStoreFile(f); setNewStoreUrl(""); }
              }}
              data-testid={`workbook-sd-upload-btn-${itemId}`}
            >
              <Upload className="w-3 h-3" />
              Upload
            </Button>
          </div>
          {newStoreFile && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="w-3 h-3" />
              <span className="truncate" data-testid={`workbook-sd-file-name-${itemId}`}>{newStoreFile.name}</span>
              <button
                type="button"
                className="text-red-500 hover:text-red-700"
                onClick={() => setNewStoreFile(null)}
                data-testid={`workbook-sd-file-clear-${itemId}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {uploadError && (
            <p className="text-xs text-red-600" data-testid={`workbook-sd-upload-error-${itemId}`}>{uploadError}</p>
          )}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs px-2"
              onClick={commitStoreDoc}
              disabled={!newStoreLabel.trim() || (!newStoreUrl.trim() && !newStoreFile)}
              data-testid={`workbook-sd-save-btn-${itemId}`}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => { setAddingStore(false); setNewStoreLabel(""); setNewStoreUrl(""); setNewStoreFile(null); setUploadError(null); }}
              data-testid={`workbook-sd-cancel-btn-${itemId}`}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Evidence hint */}
      {evidenceHint && (
        <p className="text-xs text-muted-foreground leading-relaxed mt-1" data-testid={`workbook-item-evidence-${itemId}`}>
          <span className="font-medium">Hint:</span> {evidenceHint}
        </p>
      )}
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
  // Doc vault
  siteId: string;
  foundationTemplates: FoundationDocTemplate[];
  foundationDocs: FoundationDocRecord[];
  storeDocs: StoreDocRecord[];
  canEditFoundation: boolean;
  canEditStore: boolean;
  editorName: string;
  onFoundationDocSaved: (doc: FoundationDocRecord) => void;
  onFoundationDocRemoved: (id: string) => void;
  onStoreDocSaved: (doc: StoreDocRecord) => void;
  onStoreDocRemoved: (id: string) => void;
}

function ItemRow({
  item, itemResp, sectionId, readonly, submitted,
  onStatusChange, onNotesChange,
  siteId, foundationTemplates, foundationDocs, storeDocs,
  canEditFoundation, canEditStore, editorName,
  onFoundationDocSaved, onFoundationDocRemoved, onStoreDocSaved, onStoreDocRemoved,
}: ItemRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);

  const isEditable = !readonly && !submitted;

  return (
    <div
      className="border rounded-md overflow-hidden"
      data-testid={`workbook-item-${item.id}`}
    >
      {/* Item header row */}
      <div className="px-4 py-3 flex flex-wrap items-start gap-3">
        {item.standard && (
          <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0 mt-0.5" data-testid={`workbook-item-standard-${item.id}`}>
            {item.standard}
          </span>
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <span className="block text-sm text-foreground leading-snug" data-testid={`workbook-item-req-${item.id}`}>
            {item.requirement}
          </span>
          {(item.services.length > 0 || item.staff.length > 0) && (
            <div className="flex flex-wrap items-center gap-1" data-testid={`workbook-item-tags-${item.id}`}>
              {item.services.map((s) => (
                <Badge key={`svc-${s}`} variant="secondary" className="text-[10px]" data-testid={`badge-service-${item.id}-${s}`}>{s}</Badge>
              ))}
              {item.staff.map((s) => (
                <Badge key={`staff-${s}`} variant="outline" className="text-[10px]" data-testid={`badge-staff-${item.id}-${s}`}>{s}</Badge>
              ))}
            </div>
          )}
        </div>
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
        {(item.ahfPolicy || item.ahfPolicyTitle) && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">AHF Policy Reference</p>
            {item.ahfPolicyUrl ? (
              <a
                href={item.ahfPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary leading-relaxed hover:underline"
                data-testid={`workbook-item-policy-link-${item.id}`}
              >
                <span>
                  {item.ahfPolicy && <span className="font-mono font-medium">{item.ahfPolicy}</span>}
                  {item.ahfPolicy && item.ahfPolicyTitle && " — "}
                  {item.ahfPolicyTitle}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <p className="text-xs text-foreground leading-relaxed" data-testid={`workbook-item-policy-${item.id}`}>
                {item.ahfPolicy && <span className="font-mono font-medium">{item.ahfPolicy}</span>}
                {item.ahfPolicy && item.ahfPolicyTitle && " — "}
                {item.ahfPolicyTitle}
              </p>
            )}
          </div>
        )}

        {item.ahfAction && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">AHF Required Action</p>
            <p className="text-xs text-foreground leading-relaxed" data-testid={`workbook-item-action-${item.id}`}>{item.ahfAction}</p>
          </div>
        )}

        {item.methods && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Survey Evidence Methods</p>
            <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`workbook-item-methods-${item.id}`}>{item.methods}</p>
          </div>
        )}

        {/* Document vault */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents</p>
          </div>
          <DocumentSection
            itemId={item.id}
            evidenceHint={item.evidence}
            siteId={siteId}
            foundationTemplates={foundationTemplates}
            foundationDocs={foundationDocs}
            storeDocs={storeDocs}
            canEditFoundation={canEditFoundation}
            canEditStore={canEditStore && isEditable}
            editorName={editorName}
            onFoundationDocSaved={onFoundationDocSaved}
            onFoundationDocRemoved={onFoundationDocRemoved}
            onStoreDocSaved={onStoreDocSaved}
            onStoreDocRemoved={onStoreDocRemoved}
          />
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
  const canEditFoundation = profile ? isRegionalOrAbove(profile.role) : false;
  const canEditStore = profile ? isPharmacyDirector(profile.role) : false;

  const defaultSiteId = isViewer ? "" : (profile?.siteId ?? "");
  const [selectedSiteId, setSelectedSiteId] = useState<string>(defaultSiteId);

  const selectorStores = canBrowseAll
    ? ALL_STORES
    : isViewer && profile?.region
    ? STORE_REGIONS.find((r) => r.region === profile.region)?.stores ?? []
    : [];

  const activeSiteId = isViewer ? selectedSiteId : (profile?.siteId ?? "");

  const [record, setRecord] = useState<WorkbookRecord | null>(null);

  // Document vault state
  const [foundationDocs, setFoundationDocs] = useState<FoundationDocRecord[]>([]);
  const [storeDocs, setStoreDocs] = useState<StoreDocRecord[]>([]);

  useEffect(() => {
    if (!activeSiteId) return;
    const existing = loadWorkbook(activeSiteId, quarter);
    setRecord(existing ? reconcileRecord(existing) : buildEmptyRecord(activeSiteId, quarter));
  }, [activeSiteId, quarter]);

  // Load doc vault on mount (foundation docs are global; store docs are per-site)
  useEffect(() => {
    setFoundationDocs(loadFoundationDocs());
  }, []);

  useEffect(() => {
    if (!activeSiteId) return;
    setStoreDocs(loadStoreDocs(activeSiteId));
  }, [activeSiteId]);

  // Doc vault handlers
  const handleFoundationDocSaved = useCallback((doc: FoundationDocRecord) => {
    saveFoundationDoc(doc);
    setFoundationDocs(loadFoundationDocs());
  }, []);

  const handleFoundationDocRemoved = useCallback((id: string) => {
    removeFoundationDocUrl(id);
    setFoundationDocs(loadFoundationDocs());
  }, []);

  const handleStoreDocSaved = useCallback((doc: StoreDocRecord) => {
    saveStoreDoc(doc);
    if (activeSiteId) setStoreDocs(loadStoreDocs(activeSiteId));
  }, [activeSiteId]);

  const handleStoreDocRemoved = useCallback((id: string) => {
    removeStoreDoc(id);
    if (activeSiteId) setStoreDocs(loadStoreDocs(activeSiteId));
  }, [activeSiteId]);

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

  // Section-level document completion counters (foundation templates only — fixed denominator).
  // Store docs are additive extras visible in rows but not counted in the section header total
  // to avoid impossible ratios (e.g. 5/2 docs).
  function sectionDocStats(section: WorkbookSection) {
    const sectionItemIds = section.items.map((i) => i.id);
    const sectionTemplates = FOUNDATION_DOC_TEMPLATES.filter((t) => sectionItemIds.includes(t.itemId));
    const total = sectionTemplates.length;
    const attached = sectionTemplates.filter((t) => foundationDocs.some((d) => d.id === t.id && d.url)).length;
    return { attached, total };
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
            const docStats = sectionDocStats(section);

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
                    <div className="flex items-center gap-3 ml-auto mr-2 shrink-0">
                      {docStats.total > 0 && (
                        <span
                          className={`flex items-center gap-1 text-xs font-medium ${
                            docStats.attached === docStats.total ? "text-emerald-600" : docStats.attached > 0 ? "text-amber-600" : "text-muted-foreground"
                          }`}
                          data-testid={`workbook-section-docs-${section.id}`}
                        >
                          <Link2 className="w-3 h-3" />
                          {docStats.attached}/{docStats.total} docs
                        </span>
                      )}
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
                          siteId={activeSiteId}
                          foundationTemplates={FOUNDATION_DOC_TEMPLATES}
                          foundationDocs={foundationDocs}
                          storeDocs={storeDocs}
                          canEditFoundation={canEditFoundation}
                          canEditStore={canEditStore}
                          editorName={profile?.name ?? ""}
                          onFoundationDocSaved={handleFoundationDocSaved}
                          onFoundationDocRemoved={handleFoundationDocRemoved}
                          onStoreDocSaved={handleStoreDocSaved}
                          onStoreDocRemoved={handleStoreDocRemoved}
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
