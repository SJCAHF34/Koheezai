import { Link } from "wouter";
import { Activity, HeartHandshake, Wrench, ArrowRight, Pill } from "lucide-react";
import { useAuth } from "@/App";

const GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)";

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
      "One-click access to Ramsell, OpenEvidence, UpToDate DDI checker, and Athena — without leaving your workflow.",
    badge: null,
    featured: false,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

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
            Select a tool to begin your session.
          </p>
        </div>
      </div>

      {/* Tool cards */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href}>
              <div
                data-testid={`card-tool-${tool.id}`}
                className={`group relative flex flex-col h-full rounded-md border bg-white hover:shadow-md transition-shadow cursor-pointer ${
                  tool.featured ? "border-purple-200 ring-1 ring-purple-100" : "border-slate-200"
                }`}
              >
                {/* Top gradient accent */}
                <div
                  className="h-1 w-full rounded-t-md"
                  style={{ backgroundImage: tool.featured ? GRADIENT : "none", backgroundColor: tool.featured ? undefined : "transparent" }}
                />

                <div className="p-6 flex flex-col flex-1">
                  {/* Icon + badge row */}
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

                  {/* Text */}
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                    {tool.label}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">{tool.title}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed flex-1">
                    {tool.description}
                  </p>

                  {/* CTA row */}
                  <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
                    Open
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info strip */}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs text-slate-400">
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
