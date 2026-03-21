import { Link } from "wouter";
import { Activity, Shield, Pill, HeartHandshake, ArrowRight, CheckCircle, Zap, Users, BookOpen } from "lucide-react";

function KoheezLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Koheez<span className="text-[#22c55e]">.ai</span>
    </span>
  );
}

const features = [
  {
    icon: Zap,
    title: "AI-Powered Clinical Assessments",
    description:
      "Generate comprehensive HIV treatment assessments in seconds. Our AI synthesizes patient demographics, lab values, and drug regimens into actionable clinical summaries.",
  },
  {
    icon: Shield,
    title: "Drug Interaction Screening",
    description:
      "Catch clinically significant drug-drug interactions across ARV regimens and concomitant medications using an evidence-based interaction engine.",
  },
  {
    icon: Pill,
    title: "Regimen Builder",
    description:
      "Build new therapy regimens or evaluate regimen changes side-by-side. Supports treatment-naive and experienced patients with full class coverage.",
  },
  {
    icon: HeartHandshake,
    title: "Patient Assistance Programs",
    description:
      "Instantly look up manufacturer copay cards and PAPs for 32+ HIV medications from Gilead, ViiV, Janssen, Merck, and more.",
  },
  {
    icon: BookOpen,
    title: "OpenEvidence Integration",
    description:
      "Generate ready-to-paste prompts for OpenEvidence so you can pull peer-reviewed citations directly from the literature for any clinical question.",
  },
  {
    icon: Users,
    title: "Clinical Tools at Your Fingertips",
    description:
      "One-click access to Ramsell, UpToDate DDI checker, and Athena — the external tools your workflow already depends on.",
  },
];

const steps = [
  {
    number: "01",
    title: "Enter patient information",
    description:
      "Input demographics, lab values (CD4, viral load, eGFR), and hepatic status. The intake form mirrors a real clinical workflow.",
  },
  {
    number: "02",
    title: "Build the ARV regimen",
    description:
      "Select HIV medications from our comprehensive library. Toggle between New Therapy and Change Regimen to evaluate switches.",
  },
  {
    number: "03",
    title: "Generate the assessment",
    description:
      "Get an AI-generated clinical summary, OpenEvidence query prompt, and pharmacist consultation checklist — ready for chart documentation.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c1a] text-white">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080c1a]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <KoheezLogo className="text-xl text-white" />
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <button
                data-testid="nav-sign-in"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors rounded-md hover-elevate"
              >
                Sign in
              </button>
            </Link>
            <Link href="/login?tab=signup">
              <button
                data-testid="nav-get-started"
                className="px-4 py-2 text-sm font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-md transition-colors"
              >
                Get started
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-24 pb-28 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e1a3a] via-[#080c1a] to-[#080c1a] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e] text-xs font-semibold tracking-wide uppercase">
            <Activity className="w-3 h-3" />
            Clinical Decision Support for HIV Pharmacists
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            HIV clinical intelligence,{" "}
            <span className="text-[#22c55e]">built for pharmacists.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Koheez.ai streamlines HIV treatment consultations — from drug interaction
            screening and organ-function validation to AI-powered assessments and
            patient assistance program lookup.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login?tab=signup">
              <button
                data-testid="hero-get-started"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-md transition-colors"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/login">
              <button
                data-testid="hero-sign-in"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold border border-white/20 text-white rounded-md hover:bg-white/5 transition-colors"
              >
                Sign in
              </button>
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
            {["No setup required", "HIPAA-conscious workflow", "OpenEvidence ready", "32+ ARV assistance programs"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 border-t border-white/[0.06] bg-[#0a0f22]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything your HIV consult needs
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Purpose-built for clinical pharmacists managing HIV patients in complex polypharmacy environments.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              From intake to assessment in minutes
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              A streamlined three-step workflow designed around how pharmacists actually work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col">
                <span className="text-5xl font-extrabold text-[#22c55e]/30 mb-4 leading-none">
                  {s.number}
                </span>
                <h3 className="text-slate-900 font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-6 bg-[#080c1a] border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Ready to elevate your HIV consultations?
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Join pharmacists using Koheez.ai to deliver faster, more evidence-based HIV care.
          </p>
          <Link href="/login?tab=signup">
            <button
              data-testid="cta-get-started"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-md transition-colors"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <KoheezLogo className="text-base text-white" />
          <p className="text-slate-600 text-xs">
            For clinical pharmacist use only. Not a substitute for professional clinical judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}
