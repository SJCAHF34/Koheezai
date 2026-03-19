import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    icon: <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    description:
      "Verify patient ADAP eligibility, process claims, and confirm enrollment status across multiple states.",
    tips: [
      "Login is state-specific — your state portal may differ",
      "Use full legal name, date of birth, and state ID",
      "Verify active enrollment before dispensing",
    ],
    primaryAction: {
      label: "Open Ramsell Portal",
      url: "https://pbm.ramsellcorp.com/Security/SignIn.aspx?enc=alO9koyFXt1nW1sY4HUjZj3qlnLQ7z3Q%2fNrcaIWibZ8UChXT24cNOSdVDVQHj4QK",
      testId: "panel-link-ramsell-portal",
    },
    secondaryAction: {
      label: "Pharmacy Support",
      url: "https://www.ramsellcorp.com/pharmacies/",
      testId: "panel-link-ramsell-pharmacies",
    },
  },
  {
    id: "onesource",
    title: "OneSource Medicare",
    subtitle: "Medicare Part B & Advantage Verification",
    icon: <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    description:
      "Real-time insurance eligibility and benefit verification for Medicare Part B and Medicare Advantage plans.",
    tips: [
      "Part B covers infusible/injectable HIV drugs (e.g., Trogarzo, Cabenuva)",
      "Check the patient's Medicare Beneficiary Identifier (MBI)",
      "Confirm Supplemental (Medigap) coverage for Part B 20% coinsurance",
    ],
    primaryAction: {
      label: "Open OneSource Portal",
      url: "https://www.onesource.passporthealth.com/_members/Home/Login.aspx",
      testId: "panel-link-onesource-portal",
    },
    secondaryAction: {
      label: "CMS Eligibility Guide",
      url: "https://www.cms.gov/files/document/mln8816413-checking-medicare-eligibility.pdf",
      testId: "panel-link-cms-eligibility",
    },
  },
  {
    id: "openevidence",
    title: "OpenEvidence",
    subtitle: "Evidence-Based Clinical Guidelines & Literature",
    icon: <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />,
    iconBg: "bg-green-100 dark:bg-green-900/40",
    description:
      "Medical AI platform with citations from NEJM, JAMA, PubMed, and DHHS HIV Treatment Guidelines.",
    tips: [
      "Search by drug name or clinical question",
      "References DHHS guidelines, IDSA, and peer-reviewed literature",
      "Best for DDI questions, dosing in organ impairment, resistance",
    ],
    primaryAction: {
      label: "Open OpenEvidence",
      url: "https://www.openevidence.com/",
      testId: "panel-link-openevidence-portal",
    },
    secondaryAction: {
      label: "Sign Up Free (NPI Required)",
      url: "https://www.openevidence.com/sign-up",
      testId: "panel-link-openevidence-signup",
    },
    highlight: {
      badge: "Free for Pharmacists",
      badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      text: "Individual pharmacist accounts are free with a valid NPI. Sign up takes under 2 minutes — verify your NPI and create a password.",
    },
  },
];

export function ClinicalToolsPanel() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          data-testid="button-clinical-tools-panel"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Clinical Tools</span>
          <span className="sm:hidden">Tools</span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2 pr-6">
            <div className="p-2 rounded-md bg-primary/10 shrink-0">
              <Wrench className="w-4 h-4 text-primary" />
            </div>
            <div>
              <SheetTitle>Clinical Tools</SheetTitle>
              <SheetDescription className="mt-0.5">
                Quick access to ADAP, Medicare, and clinical guideline portals. Links open in a new tab.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable tool cards */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tools.map((tool) => (
            <Card key={tool.id} data-testid={`panel-tool-card-${tool.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md shrink-0 ${tool.iconBg}`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{tool.title}</CardTitle>
                      {tool.highlight && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${tool.highlight.badgeColor}`}
                          data-testid={`panel-badge-${tool.id}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {tool.highlight.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tool.subtitle}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{tool.description}</p>

                {tool.highlight && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                    <Info className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800 dark:text-green-300">{tool.highlight.text}</p>
                  </div>
                )}

                <div className="bg-muted rounded-md p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground mb-1.5">Tips for pharmacists</p>
                  {tool.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{tip}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <a
                    href={tool.primaryAction.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={tool.primaryAction.testId}
                  >
                    <Button size="sm" className="gap-1.5">
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
                      <Button size="sm" variant="outline" className="gap-1.5">
                        {tool.secondaryAction.label}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-muted-foreground border-t pt-3 pb-2">
            These tools open in a new tab using your existing credentials. No login information is stored in this application.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
