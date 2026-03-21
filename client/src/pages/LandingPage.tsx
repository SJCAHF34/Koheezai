import { Link } from "wouter";
import { Activity, Shield, Pill, HeartHandshake, ArrowRight, CheckCircle, Zap, Users, BookOpen } from "lucide-react";

const GRADIENT = "linear-gradient(90deg, #9333ea, #3b82f6, #ef4444, #facc15)";

function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`bg-clip-text text-transparent inline ${className}`}
      style={{ backgroundImage: GRADIENT }}
    >
      {children}
    </span>
  );
}

function KoheezLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <GradientText>Koheez.ai</GradientText>
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
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <KoheezLogo className="text-xl" />
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <button
                data-testid="nav-sign-in"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md"
              >
                Sign in
              </button>
            </Link>
            <Link href="/login?tab=signup">
              <button
                data-testid="nav-get-started"
                className="px-4 py-2 text-sm font-semibold text-white rounded-md transition-opacity hover:opacity-90"
                style={{ backgroundImage: GRADIENT }}
              >
                Get started
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-24 pb-28 px-6 bg-white">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: GRADIENT }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full text-xs font-semibold tracking-wide uppercase border border-purple-200 bg-purple-50">
            <Activity className="w-3 h-3 text-purple-500 shrink-0" />
            <GradientText>Clinical Decision Support for HIV Pharmacists</GradientText>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-slate-900">
            HIV clinical intelligence,{" "}
            <GradientText>built for pharmacists.</GradientText>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Koheez.ai streamlines HIV treatment consultations — from drug interaction
            screening and organ-function validation to AI-powered assessments and
            patient assistance program lookup.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login?tab=signup">
              <button
                data-testid="hero-get-started"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white rounded-md transition-opacity hover:opacity-90"
                style={{ backgroundImage: GRADIENT }}
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/login">
              <button
                data-testid="hero-sign-in"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold border border-slate-300 text-slate-700 rounded-md hover:border-slate-400 hover:bg-slate-50 transition-colors"
              >
                Sign in
              </button>
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
            {["No setup required", "HIPAA-conscious workflow", "OpenEvidence ready", "32+ ARV assistance programs"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 border-t border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900">
              Everything your HIV consult{" "}
              <GradientText>needs</GradientText>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Purpose-built for clinical pharmacists managing HIV patients in complex polypharmacy environments.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-md border border-slate-200 bg-white hover:shadow-sm transition-shadow"
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                  style={{ backgroundImage: "linear-gradient(135deg, #f3e8ff, #dbeafe)" }}
                >
                  <f.icon className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              From intake to assessment{" "}
              <GradientText>in minutes</GradientText>
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              A streamlined three-step workflow designed around how pharmacists actually work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col">
                <span
                  className="text-5xl font-extrabold mb-4 leading-none bg-clip-text text-transparent"
                  style={{ backgroundImage: GRADIENT }}
                >
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
      <section className="py-20 px-6 border-t border-slate-100">
        <div
          className="max-w-4xl mx-auto rounded-md px-8 py-14 text-center text-white"
          style={{ backgroundImage: GRADIENT }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-5 text-white">
            Ready to elevate your HIV consultations?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Join pharmacists using Koheez.ai to deliver faster, more evidence-based HIV care.
          </p>
          <Link href="/login?tab=signup">
            <button
              data-testid="cta-get-started"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-slate-900 rounded-md hover:bg-white/90 transition-colors"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <KoheezLogo className="text-base" />
          <p className="text-slate-400 text-xs">
            For clinical pharmacist use only. Not a substitute for professional clinical judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}
