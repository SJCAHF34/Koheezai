import { Link } from "wouter";
import { Activity, Shield, HeartHandshake, ArrowRight, CheckCircle, Zap, Users, BarChart2, ListChecks, ClipboardCheck } from "lucide-react";

const LOGO_GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)";
const CTA_GRADIENT  = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444, #facc15)";

function KoheezLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span
        className="bg-clip-text text-transparent"
        style={{ backgroundImage: LOGO_GRADIENT }}
      >
        Koheez.ai
      </span>
    </span>
  );
}

const features = [
  {
    icon: ListChecks,
    title: "Daily Task Management",
    description:
      "Assign and track tasks across your pharmacy team. See what's complete, what's overdue, and what needs your attention — every single day.",
  },
  {
    icon: ClipboardCheck,
    title: "ACHC Compliance Workbook",
    description:
      "Stay audit-ready with a built-in workbook covering every ACHC standard. Know where your site stands and close compliance gaps before the assessor arrives.",
  },
  {
    icon: HeartHandshake,
    title: "Patient Assistance Programs",
    description:
      "32+ HIV manufacturer assistance programs with direct enrollment links. Help your patients get their medications covered and reduce dispensing gaps at your site.",
  },
  {
    icon: Zap,
    title: "AI Clinical Assessment Tools",
    description:
      "AI-powered ARV assessments with drug interaction screening, regimen building, and evidence-backed recommendations — ready for your pharmacist team to use with every patient.",
  },
  {
    icon: BarChart2,
    title: "Store Performance Dashboard",
    description:
      "See your site's key metrics in one place: task completion rates, at-risk patients, category scores, and performance trends over time.",
  },
  {
    icon: Users,
    title: "Regional & National Visibility",
    description:
      "RPDs and the CPO can monitor completion and performance across every site in their footprint — so pharmacy directors stay aligned with network priorities.",
  },
];

const steps = [
  {
    number: "01",
    title: "Start your day with a clear picture",
    description:
      "Open your site dashboard and see today's tasks, any compliance gaps, and your team's completion rate. No digging through spreadsheets.",
  },
  {
    number: "02",
    title: "Take action where it matters",
    description:
      "Assign tasks to your team, enroll patients in assistance programs, or run an AI clinical assessment — all from the same platform.",
  },
  {
    number: "03",
    title: "Stay ready for every audit",
    description:
      "The ACHC workbook tracks every standard in real time so your site is always prepared, not just when a review is scheduled.",
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
                style={{ backgroundImage: CTA_GRADIENT }}
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
          style={{ backgroundImage: CTA_GRADIENT }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full text-xs font-semibold tracking-wide uppercase border border-purple-200 bg-purple-50 text-purple-700">
            <Activity className="w-3 h-3 text-purple-500 shrink-0" />
            Tasks · Compliance · Patients — One Platform
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-slate-900">
            Your tasks, your team,{" "}
            <span className="whitespace-nowrap">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #3b82f6, #9333ea)" }}>your patients,</span>
              {" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #9333ea, #ef4444)" }}>one platform.</span>
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Koheez.ai brings daily task management, ACHC compliance tracking, patient
            assistance programs, and AI clinical tools into a single workflow — so
            pharmacy directors spend less time juggling systems and more time leading their team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login?tab=signup">
              <button
                data-testid="hero-get-started"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white rounded-md transition-opacity hover:opacity-90"
                style={{ backgroundImage: CTA_GRADIENT }}
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
            {["Daily task accountability", "ACHC-ready workbook", "32+ PAP programs", "AI-powered clinical tools"].map((t) => (
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
              Everything a pharmacy director needs
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Purpose-built for AHF pharmacy directors managing HIV care operations, compliance, and clinical quality.
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
                  style={{ backgroundImage: "linear-gradient(135deg, #dbeafe, #ede9fe)" }}
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
              A workflow built for your day
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              From morning check-in to audit prep — Koheez.ai fits how pharmacy directors actually work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.number} className="flex flex-col">
                <span
                  className="text-5xl font-extrabold mb-4 leading-none bg-clip-text text-transparent"
                  style={{ backgroundImage: CTA_GRADIENT }}
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
          style={{ backgroundImage: CTA_GRADIENT }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-5 text-white">
            Finally, one platform that runs with you — not against you.
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Koheez.ai gives pharmacy directors the tools to manage daily operations,
            serve patients better, and stay ahead of compliance — without the chaos.
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
            For pharmacy director and clinical staff use. Not a substitute for professional clinical judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}
