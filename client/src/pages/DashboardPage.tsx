import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity, HeartHandshake, Wrench, ArrowRight, Pill, Trash2, Clock, ChevronRight, ClipboardList } from "lucide-react";
import { useAuth } from "@/App";
import { loadAllAssessments, deleteAssessment, type SavedAssessment } from "@/lib/patientStorage";
import { TASKS, type TaskFrequency } from "@/lib/taskData";
import { loadCompletions, getPeriodKey } from "@/lib/taskStorage";
import { getUserProfile } from "@/lib/userProfile";

const GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444, #facc15)";

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
      {children}
    </span>
  );
}

const tools = [
  {
    id: "hiv-prep",
    href: "/app/assessment",
    icon: Pill,
    label: "HIV/PrEP",
    title: "Treatment Assessor",
    description:
      "Build ARV regimens, screen drug interactions, validate organ function, and generate AI-powered clinical summaries.",
    badge: "Core Tool",
    featured: true,
  },
  {
    id: "tasks",
    href: "/app/tasks",
    icon: ClipboardList,
    label: "Task Manager",
    title: "Daily Workflows",
    description:
      "Role-based daily, weekly, monthly, and quarterly task checklists with ACHC, state board, and retention tracking.",
    badge: null,
    featured: false,
  },
  {
    id: "patient-assistance",
    href: "/app/patient-assistance",
    icon: HeartHandshake,
    label: "Patient Assistance",
    title: "Programs & Resources",
    description:
      "Look up manufacturer copay cards and PAPs for 32+ HIV medications. ADAP, Ryan White, and more.",
    badge: null,
    featured: false,
  },
  {
    id: "clinical-tools",
    href: "/app/clinical-tools",
    icon: Wrench,
    label: "Clinical Tools",
    title: "External Integrations",
    description:
      "One-click access to Ramsell, OpenEvidence, and UpToDate DDI checker — without leaving your workflow.",
    badge: null,
    featured: false,
  },
];

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getRegimenSummary(a: SavedAssessment): string {
  const drugs = a.formData.selectedDrugs;
  if (drugs.length === 0) return "No regimen selected";
  if (drugs.length <= 3) return drugs.join(" + ");
  return `${drugs.slice(0, 2).join(" + ")} +${drugs.length - 2} more`;
}

function stepProgress(a: SavedAssessment): { label: string; pct: number } {
  const { assessmentResult, oeResponse, comprehensiveNote } = a.formData;
  if (comprehensiveNote) return { label: "Note generated", pct: 100 };
  if (oeResponse?.trim()) return { label: "OE response entered", pct: 75 };
  if (assessmentResult) return { label: "Query created", pct: 50 };
  return { label: "In progress", pct: 25 };
}

function TaskSummaryWidget({ userEmail, userName }: { userEmail: string; userName: string }) {
  const profile = getUserProfile(userEmail, userName);
  const freq: TaskFrequency = "daily";
  const completions = loadCompletions(profile.siteId, freq);
  const dailyTasks = TASKS.filter(
    (t) =>
      t.frequency === freq &&
      (t.role === profile.role || t.role === "all_staff" ||
        (profile.role === "director" || profile.role === "regional_director"))
  );
  const done = dailyTasks.filter((t) => completions.has(t.id)).length;
  const pct = dailyTasks.length > 0 ? Math.round((done / dailyTasks.length) * 100) : 0;

  return (
    <Link href="/app/tasks">
      <div
        data-testid="widget-tasks-today"
        className="bg-white border border-slate-200 rounded-md px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer group"
      >
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}
        >
          <ClipboardList className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Today's Tasks</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100 ? "bg-green-500" : "bg-purple-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {done}/{dailyTasks.length} complete
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-purple-600 group-hover:gap-2 transition-all text-xs font-semibold shrink-0">
          View tasks <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  const [assessments, setAssessments] = useState<SavedAssessment[]>([]);

  useEffect(() => {
    setAssessments(loadAllAssessments());
  }, []);

  const handleDelete = (patientId: string) => {
    deleteAssessment(patientId);
    setAssessments(loadAllAssessments());
  };

  const handleResume = (patientId: string) => {
    navigate(`/app/assessment?patientId=${encodeURIComponent(patientId)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header band */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <p className="text-sm text-slate-400 mb-1 uppercase tracking-wide font-medium">
            Welcome back, {firstName}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Clinical <GradientText>Dashboard</GradientText>
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            Select a tool or resume a recent patient.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Tool cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href}>
              <div
                data-testid={`card-tool-${tool.id}`}
                className={`group relative flex flex-col h-full rounded-md border bg-white hover:shadow-md transition-shadow cursor-pointer ${
                  tool.featured ? "border-purple-200 ring-1 ring-purple-100" : "border-slate-200"
                }`}
              >
                <div
                  className="h-1 w-full rounded-t-md"
                  style={{
                    backgroundImage: tool.featured ? GRADIENT : "none",
                    backgroundColor: tool.featured ? undefined : "transparent",
                  }}
                />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        backgroundImage: tool.featured
                          ? GRADIENT
                          : "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
                      }}
                    >
                      <tool.icon
                        className={`w-5 h-5 ${tool.featured ? "text-white" : "text-slate-500"}`}
                      />
                    </div>
                    {tool.badge && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundImage: GRADIENT }}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                    {tool.label}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">{tool.title}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed flex-1">
                    {tool.description}
                  </p>
                  <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
                    Open
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Today's task glance */}
        {user && (
          <TaskSummaryWidget userEmail={user.email} userName={user.name ?? ""} />
        )}

        {/* Recent Patients */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Patients</h2>
            <Link href="/app/assessment">
              <span className="text-sm font-semibold text-purple-600 hover:text-purple-700 cursor-pointer flex items-center gap-1">
                New patient
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>

          {assessments.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white px-6 py-10 text-center">
              <p className="text-slate-400 text-sm">No saved patients yet. Start an assessment and it will appear here automatically.</p>
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-white divide-y divide-slate-100">
              {assessments.map((a) => {
                const progress = stepProgress(a);
                return (
                  <div
                    key={a.patientId}
                    data-testid={`row-patient-${a.patientId}`}
                    className="flex items-center gap-4 px-5 py-4 flex-wrap"
                  >
                    {/* Patient ID pill */}
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full text-white shrink-0 tracking-wide"
                      style={{ backgroundImage: GRADIENT }}
                    >
                      {a.patientId}
                    </span>

                    {/* Regimen */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {getRegimenSummary(a)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Progress bar */}
                        <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${progress.pct}%`, backgroundImage: GRADIENT }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400">{progress.label}</span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(a.savedAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResume(a.patientId)}
                        data-testid={`button-resume-${a.patientId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-opacity hover:opacity-90"
                        style={{ backgroundImage: GRADIENT }}
                      >
                        Resume
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.patientId)}
                        data-testid={`button-delete-${a.patientId}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete patient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info strip */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-slate-400">
          {[
            "EHR-connected workflow",
            "AI-powered assessments",
            "32+ ARV assistance programs",
            "Evidence-based DDI engine",
          ].map((label) => (
            <span key={label} className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-purple-400" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
