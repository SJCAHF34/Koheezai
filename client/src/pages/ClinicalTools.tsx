import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Wrench,
  Shield,
  CreditCard,
  BookOpen,
  Info,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type ToolCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
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

const tools: ToolCard[] = [
  {
    id: "ramsell",
    title: "Ramsell ADAP",
    subtitle: "AIDS Drug Assistance Program Eligibility",
    icon: <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
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
      url: "https://www.ramsellcorp.com/",
      testId: "link-ramsell-portal",
    },
    secondaryAction: {
      label: "Pharmacy Support Info",
      url: "https://www.ramsellcorp.com/pharmacies/",
      testId: "link-ramsell-pharmacies",
    },
  },
  {
    id: "onesource",
    title: "OneSource Medicare",
    subtitle: "Medicare Part B & Medicare Advantage Verification",
    icon: <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    description:
      "OneSource provides real-time insurance eligibility and benefit verification for Medicare Part B and Medicare Advantage plans. Use it to confirm coverage, verify copay/coinsurance amounts, and check prior authorization requirements for HIV medications.",
    tips: [
      "Medicare Part B covers infusible/injectable HIV drugs (e.g., Trogarzo, Cabenuva) — verify under Part B before routing to pharmacy",
      "Medicare Advantage plans may have different formulary tiers and PA requirements than traditional Medicare",
      "Check the patient's Medicare Beneficiary Identifier (MBI) — not their Social Security Number",
      "Confirm if the patient has a Supplemental (Medigap) plan that covers the Part B 20% coinsurance",
    ],
    primaryAction: {
      label: "Open OneSource Portal",
      url: "https://www.onesource.passporthealth.com/_members/Home/Login.aspx",
      testId: "link-onesource-portal",
    },
    secondaryAction: {
      label: "CMS Medicare Eligibility Guide",
      url: "https://www.cms.gov/files/document/mln8816413-checking-medicare-eligibility.pdf",
      testId: "link-cms-eligibility",
    },
  },
  {
    id: "openevidence",
    title: "OpenEvidence",
    subtitle: "Evidence-Based Clinical Guidelines & Literature",
    icon: <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />,
    iconBg: "bg-green-100 dark:bg-green-900/40",
    description:
      "OpenEvidence is a medical AI platform used by over 40% of U.S. physicians. It provides evidence-based clinical answers with citations from NEJM, JAMA, PubMed, and DHHS HIV Treatment Guidelines — ideal for real-time clinical decision support.",
    tips: [
      "Search by drug name or clinical question (e.g., \"dolutegravir renal dosing\" or \"PrEP in pregnancy\")",
      "References DHHS HIV Treatment Guidelines, IDSA, and peer-reviewed literature",
      "Best for complex drug interaction questions, dosing in organ impairment, and resistance management",
      "Available on web and mobile — accessible during patient consultations",
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
];

export default function ClinicalTools() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Clinical Tools</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                Quick access to ADAP eligibility verification, Medicare insurance portals, and evidence-based clinical guidelines. These tools open in a new tab using your existing login credentials.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {tools.map((tool) => (
          <Card key={tool.id} data-testid={`tool-card-${tool.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-md shrink-0 ${tool.iconBg}`}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                    {tool.highlight && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${tool.highlight.badgeColor}`}
                        data-testid={`badge-${tool.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {tool.highlight.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{tool.subtitle}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{tool.description}</p>

              {/* Free account highlight for OpenEvidence */}
              {tool.highlight && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <Info className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 dark:text-green-300">{tool.highlight.text}</p>
                </div>
              )}

              {/* Tips */}
              <div className="bg-muted rounded-md p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground mb-2">Tips for pharmacists</p>
                {tool.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <a
                  href={tool.primaryAction.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={tool.primaryAction.testId}
                >
                  <Button className="gap-1.5">
                    {tool.primaryAction.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
                {tool.secondaryAction && (
                  <a
                    href={tool.secondaryAction.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={tool.secondaryAction.testId}
                  >
                    <Button variant="outline" className="gap-1.5">
                      {tool.secondaryAction.label}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Footer note */}
        <div className="text-xs text-muted-foreground border-t pt-4 pb-2">
          <p>
            These tools open in a new browser tab using your existing credentials. No login information is stored in this application. Contact your organization's administrator if you need portal access credentials for Ramsell or OneSource.
          </p>
        </div>
      </div>
    </div>
  );
}
