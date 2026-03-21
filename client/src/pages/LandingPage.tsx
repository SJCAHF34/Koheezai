import { Link } from "wouter";
import { Activity, Shield, Pill, HeartHandshake, ArrowRight, CheckCircle, Zap, Users, BookOpen } from "lucide-react";

const LOGO_GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)";
const CTA_GRADIENT  = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)";

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
    icon: Zap,
    title: "AI That Reads Your EHR Context",
    description:
      "Pull patient data from your EHR into AI-powered assessments instantly. No re-entry — Koheez.ai bridges your chart and your clinical thinking.",
  },
  {
    icon: Shield,
    title: "Connected Drug Interaction Screening",
    description:
      "Automatically cross-reference the full medication list from the EHR against ARV regimens. Catch interactions without toggling between systems.",
  },
  {
    icon: Pill,
    title: "Regimen Builder Tied to the Chart",
    description:
      "Build or switch ARV regimens with full context from the patient's chart — labs, diagnoses, current meds — all in one connected workflow.",
  },
  {
    icon: HeartHandshake,
    title: "Patient Communications, Ready to Send",
    description:
      "Generate plain-language medication counseling summaries and assistance program referrals that can be sent directly to patients or documented in the chart.",
  },
  {
    icon: BookOpen,
    title: "AI + Evidence, Side by Side",
    description:
      "Koheez.ai pairs OpenEvidence's peer-reviewed citations with AI synthesis so every recommendation is backed by literature and ready to document.",
  },
  {
    icon: Users,
    title: "One Hub for Every Clinical Tool",
    description:
      "Athena, Ramsell, UpToDate, and OpenEvidence — connected through a single interface so your team stops switching tabs and starts closing loops.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your patient's chart",
    description:
      "Open a patient in your EHR and bring their demographics, labs, and medications into Koheez.ai in seconds — no copy-paste required.",
  },
  {
    number: "02",
    title: "Let AI and evidence do the work",
    description:
      "Koheez.ai screens interactions, validates organ function, and generates an AI assessment grounded in peer-reviewed literature.",
  },
  {
    number: "03",
    title: "Communicate and document",
    description:
      "Send patient-friendly counseling notes, log consultation findings back to the chart, and close the loop — all from one place.",
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
        {/* Subtle gradient wash behind hero */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: CTA_GRADIENT }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full text-xs font-semibold tracking-wide uppercase border border-purple-200 bg-purple-50 text-purple-700">
            <Activity className="w-3 h-3 text-purple-500 shrink-0" />
            EHR · AI · Patient Communications — Connected
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-slate-900">
            Your EHR, your AI,{" "}
            <span className="text-slate-700">your patients —</span>{" "}
            <span className="text-slate-900">one platform.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Koheez.ai connects your EHR, AI-powered clinical tools, and patient
            communications into a single workflow — so HIV pharmacists spend less time
            switching systems and more time with patients.
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
              Everything your HIV consult needs
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
              From intake to assessment in minutes
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
