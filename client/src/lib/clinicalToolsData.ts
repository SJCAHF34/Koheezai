import type { LucideIcon } from "lucide-react";
import { Shield, BookOpen, Pill, ClipboardList } from "lucide-react";

export type ToolCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  description: string;
  tips: string[];
  primaryAction: {
    label: string;
    url: string;
    testId: string;
  };
  secondaryAction?: {
    label: string;
    url: string;
    testId: string;
  };
  highlight?: {
    badge: string;
    badgeColor: string;
    text: string;
  };
};

export const clinicalTools: ToolCard[] = [
  {
    id: "ramsell",
    title: "Ramsell ADAP",
    subtitle: "AIDS Drug Assistance Program Eligibility",
    icon: Shield,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    description:
      "Ramsell manages ADAP programs across multiple states, allowing pharmacists and case managers to verify patient eligibility, process claims, and confirm enrollment status for the AIDS Drug Assistance Program.",
    tips: [
      "Login is state-specific — your state portal may differ from the main URL",
      "Use patient's full legal name, date of birth, and state ID number",
      "ADAP eligibility must be re-verified periodically — confirm active enrollment before dispensing",
      "Some states have sub-portals (e.g., DC, Colorado, Illinois) accessible through the main portal",
    ],
    primaryAction: {
      label: "Open Ramsell Portal",
      url: "https://pbm.ramsellcorp.com/Security/SignIn.aspx?enc=alO9koyFXt1nW1sY4HUjZj3qlnLQ7z3Q%2fNrcaIWibZ8UChXT24cNOSdVDVQHj4QK",
      testId: "link-ramsell-portal",
    },
    secondaryAction: {
      label: "Pharmacy Support Info",
      url: "https://www.ramsellcorp.com/pharmacies/",
      testId: "link-ramsell-pharmacies",
    },
  },
  {
    id: "openevidence",
    title: "OpenEvidence",
    subtitle: "Evidence-Based Clinical Guidelines & Literature",
    icon: BookOpen,
    iconColor: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    description:
      "OpenEvidence is a medical AI platform used by over 40% of U.S. physicians. It provides evidence-based clinical answers with citations from NEJM, JAMA, PubMed, and DHHS HIV Treatment Guidelines — ideal for real-time clinical decision support.",
    tips: [
      "Search by drug name or clinical question (e.g., \"dolutegravir renal dosing\" or \"PrEP in pregnancy\")",
      "References DHHS HIV Treatment Guidelines, IDSA, and peer-reviewed literature",
      "Best for complex drug interaction questions, dosing in organ impairment, and resistance management",
      "Available on web and mobile — accessible during patient consultations",
      "On mobile or embedded browsers, if prompted to enable cookies, tap \"Open in new tab\" to access OpenEvidence in your full browser with your login session.",
    ],
    primaryAction: {
      label: "Open OpenEvidence",
      url: "https://www.openevidence.com/",
      testId: "link-openevidence-portal",
    },
    secondaryAction: {
      label: "Sign Up Free (NPI Required)",
      url: "https://www.openevidence.com/sign-up",
      testId: "link-openevidence-signup",
    },
    highlight: {
      badge: "Free for Pharmacists",
      badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      text: "Individual pharmacist accounts are completely free with a valid NPI (National Provider Identifier). Sign up takes under 2 minutes — just verify your NPI and create a password. No institutional account or API key required.",
    },
  },
  {
    id: "uptodate",
    title: "UpToDate Drug Interactions",
    subtitle: "Comprehensive Drug-Drug Interaction Checker",
    icon: Pill,
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    description:
      "UpToDate's Drug Interactions tool allows pharmacists to check interactions between multiple drugs simultaneously. Covers HIV antiretrovirals, concomitant medications, and common drug classes with severity ratings and clinical management guidance.",
    tips: [
      "Add ARV regimen components individually to check all pairwise interactions",
      "Severity ratings: Contraindicated, Serious, Significant, Minor — prioritize Contraindicated and Serious",
      "Subscription required — confirm your institution has UpToDate access before relying on it",
      "Cross-reference with Liverpool HIV DDI checker for ARV-specific guidance",
    ],
    primaryAction: {
      label: "Open UpToDate DDI Checker",
      url: "https://www.uptodate.com/drug-interactions/#di-druglist",
      testId: "link-uptodate-portal",
    },
  },
  {
    id: "athena",
    title: "Athena (athenahealth)",
    subtitle: "Electronic Health Records & Patient Chart Access",
    icon: ClipboardList,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    description:
      "athenahealth is an EHR and practice management platform. Use the Athena portal to access patient charts, review medication histories, confirm diagnoses, and document clinical notes during HIV consultations.",
    tips: [
      "Log in with your athenahealth credentials — contact your practice administrator if access is needed",
      "Review the medication list and active problem list before completing your assessment",
      "Document pharmacist consultation notes in the patient's chart after each review",
      "Use the patient chart to verify insurance and prior authorization status for ARV medications",
    ],
    primaryAction: {
      label: "Open Athena Portal",
      url: "https://athenanet.athenahealth.com/1/1/login/startoidc.esp?IDP=0oay9fqjxcuda2iRm297",
      testId: "link-athena-portal",
    },
  },
];
