import {
  drugAssistanceData,
  type DrugAssistanceEntry,
  type ProgramType,
} from "@/lib/assistancePrograms";

export type PapQuestion = {
  key: string;
  question: string;
  hasDetail?: boolean;
  detailLabel?: string;
  hint?: string;
};

export type PapContext = {
  entries: DrugAssistanceEntry[];
  programTypes: Set<ProgramType>;
  manufacturers: string[];
  questions: PapQuestion[];
};

const BASE_QUESTIONS: PapQuestion[] = [
  {
    key: "insurance-type",
    question:
      "What is the patient's current insurance status? (Uninsured, Commercial/Private, Medicare, Medicaid, TRICARE/VA, or Underinsured)",
    hasDetail: true,
    detailLabel: "Insurance type / plan name",
    hint: "Most manufacturer copay cards exclude government insurance (Medicare, Medicaid, TRICARE, VA).",
  },
  {
    key: "income-fpl",
    question:
      "Has the patient shared estimated annual household income or % of Federal Poverty Level (FPL)?",
    hasDetail: true,
    detailLabel: "Household income or % FPL (e.g. $35k / ~250% FPL)",
    hint: "Most PAPs require income at or below 400–500% FPL.",
  },
  {
    key: "us-residency",
    question:
      "Is the patient a U.S. resident with valid identification/proof of residency?",
    hint: "Most manufacturer PAPs require U.S. residency.",
  },
];

export function derivePapContext(selectedDrugIds: string[]): PapContext {
  const seen = new Set<string>();
  const entries: DrugAssistanceEntry[] = [];
  for (const id of selectedDrugIds) {
    const match = drugAssistanceData.find((e) => e.drugIds.includes(id));
    if (match && !seen.has(match.brandName)) {
      seen.add(match.brandName);
      entries.push(match);
    }
  }

  const programTypes = new Set<ProgramType>();
  entries.forEach((e) => e.programs.forEach((p) => programTypes.add(p.type)));

  const manufacturers = Array.from(new Set(entries.map((e) => e.manufacturer)));

  const questions: PapQuestion[] = [...BASE_QUESTIONS];

  if (programTypes.has("copay")) {
    questions.push({
      key: "copay-enrolled",
      question:
        "Is the patient already enrolled in a manufacturer copay savings card for any of the selected medications?",
      hasDetail: true,
      detailLabel: "Which program / member ID",
      hint: "Copay cards typically require commercial insurance.",
    });
  }
  if (programTypes.has("pap")) {
    questions.push({
      key: "pap-enrolled",
      question:
        "Is the patient currently enrolled in a Patient Assistance Program (free medication) for any HIV med?",
      hasDetail: true,
      detailLabel: "Program name / enrollment status",
    });
  }
  if (programTypes.has("adap") || programTypes.has("foundation")) {
    questions.push({
      key: "adap-foundation",
      question:
        "Is the patient enrolled in ADAP or any independent foundation grant (e.g., PAN Foundation, Patient Advocate Foundation)?",
      hasDetail: true,
      detailLabel: "ADAP state program or foundation name",
    });
  }
  questions.push({
    key: "prior-applied",
    question:
      "Has the patient previously applied for assistance for this medication or had a prior denial?",
    hasDetail: true,
    detailLabel: "Date / outcome / reason for denial",
  });
  questions.push({
    key: "rx-coverage-issue",
    question:
      "Has the patient experienced a recent prior-authorization denial, formulary exclusion, or copay surprise on this medication?",
    hasDetail: true,
    detailLabel: "Plan / amount / details",
  });

  return { entries, programTypes, manufacturers, questions };
}

type Direction = "yes" | "no" | "any";
const QUESTION_SCORING: Record<string, { weight: number; favorable: Direction }> = {
  "insurance-type": { weight: 1, favorable: "any" },
  "income-fpl": { weight: 2, favorable: "yes" },
  "us-residency": { weight: 2, favorable: "yes" },
  "copay-enrolled": { weight: 1, favorable: "no" },
  "pap-enrolled": { weight: 1, favorable: "no" },
  "adap-foundation": { weight: 1, favorable: "any" },
  "prior-applied": { weight: 1, favorable: "no" },
  "rx-coverage-issue": { weight: 2, favorable: "yes" },
};

export type PapProbability = {
  score: number;
  label: "Low" | "Moderate" | "High";
  answered: number;
  total: number;
};

export function computePapProbability(args: {
  context: PapContext;
  papAnswers: Record<string, "yes" | "no" | "">;
}): PapProbability | null {
  const { context, papAnswers } = args;
  if (context.entries.length === 0) return null;
  const relevant = context.questions.filter((q) => QUESTION_SCORING[q.key]);
  if (relevant.length === 0) return null;

  let earned = 0;
  let possible = 0;
  let answered = 0;
  relevant.forEach((q) => {
    const cfg = QUESTION_SCORING[q.key];
    possible += cfg.weight;
    const ans = papAnswers[q.key];
    if (!ans) return;
    answered += 1;
    if (cfg.favorable === "any") earned += cfg.weight;
    else if (cfg.favorable === ans) earned += cfg.weight;
  });

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  const label: PapProbability["label"] = score >= 70 ? "High" : score >= 40 ? "Moderate" : "Low";
  return { score, label, answered, total: relevant.length };
}

export function formatPapContextForNote(args: {
  papNotApplicable: boolean;
  papNotApplicableReason: string;
  papAnswers: Record<string, "yes" | "no" | "">;
  papDetails: Record<string, string>;
  context: PapContext;
}): string {
  const { papNotApplicable, papNotApplicableReason, papAnswers, papDetails, context } = args;
  const lines: string[] = [];
  if (papNotApplicable) {
    lines.push("Patient Assistance Program (PAP): Not applicable for this consultation.");
    if (papNotApplicableReason.trim()) {
      lines.push(`  Reason: ${papNotApplicableReason.trim()}`);
    }
    return lines.join("\n");
  }
  if (context.entries.length === 0) {
    return "Patient Assistance Program (PAP): No manufacturer programs found for the selected medication(s).";
  }
  lines.push("Patient Assistance Program (PAP) Context:");
  lines.push("  Available programs for selected medication(s):");
  context.entries.forEach((e) => {
    e.programs.forEach((p) => {
      const savings = p.savings ? ` — ${p.savings}` : "";
      lines.push(`    • ${e.brandName}: ${p.name} [${p.type}]${savings}`);
    });
  });
  const answered = context.questions.filter((q) => papAnswers[q.key]);
  if (answered.length > 0) {
    lines.push("  Eligibility responses:");
    answered.forEach((q) => {
      const ans = papAnswers[q.key] === "yes" ? "Yes" : "No";
      const detail = q.hasDetail ? (papDetails[q.key] ?? "").trim() : "";
      lines.push(`    - ${q.question} → ${ans}${detail ? ` (${detail})` : ""}`);
    });
  }
  const probability = computePapProbability({ context, papAnswers });
  if (probability) {
    lines.push(
      `  Estimated probability of PAP enrollment success: ${probability.score}% (${probability.label}) — based on ${probability.answered} of ${probability.total} eligibility questions answered.`,
    );
  }
  return lines.join("\n");
}
