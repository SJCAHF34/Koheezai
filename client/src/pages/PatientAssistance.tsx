import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Phone,
  Search,
  DollarSign,
  Users,
  Building2,
  Globe,
  HeartHandshake,
  Pill,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import {
  drugAssistanceData,
  broaderResources,
  getAllManufacturers,
  type DrugAssistanceEntry,
  type ProgramType,
} from "@/lib/assistancePrograms";

const programTypeConfig: Record<ProgramType, { label: string; color: string; icon: React.ReactNode }> = {
  pap: {
    label: "Patient Assistance (Free Rx)",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <HeartHandshake className="w-3 h-3" />,
  },
  copay: {
    label: "Copay Card / Savings",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: <DollarSign className="w-3 h-3" />,
  },
  adap: {
    label: "ADAP",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    icon: <Building2 className="w-3 h-3" />,
  },
  foundation: {
    label: "Foundation Grant",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    icon: <Users className="w-3 h-3" />,
  },
  manufacturer: {
    label: "Manufacturer",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    icon: <Pill className="w-3 h-3" />,
  },
};

function ProgramTypeBadge({ type }: { type: ProgramType }) {
  const config = programTypeConfig[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function DrugCard({ entry }: { entry: DrugAssistanceEntry }) {
  const [expanded, setExpanded] = useState(false);
  const showToggle = entry.programs.length > 2;
  const visiblePrograms = expanded ? entry.programs : entry.programs.slice(0, 2);

  return (
    <Card className="flex flex-col" data-testid={`drug-card-${entry.brandName.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">{entry.brandName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{entry.genericName}</p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">{entry.manufacturer}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        {visiblePrograms.map((program, idx) => (
          <div key={idx} className="border rounded-md p-3 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <ProgramTypeBadge type={program.type} />
              {program.savings && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
                  <DollarSign className="w-3 h-3" />
                  {program.savings}
                </span>
              )}
            </div>
            <p className="font-medium text-sm">{program.name}</p>
            <p className="text-xs text-muted-foreground">{program.description}</p>
            <div className="bg-muted rounded-md p-2">
              <p className="text-xs font-medium mb-0.5">Eligibility</p>
              <p className="text-xs text-muted-foreground">{program.eligibility}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {program.phone && (
                <a
                  href={`tel:${program.phone.replace(/[^0-9]/g, "")}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  data-testid={`phone-${entry.brandName}-${idx}`}
                >
                  <Phone className="w-3 h-3" />
                  {program.phone}
                </a>
              )}
              <a
                href={program.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid={`link-program-${entry.brandName}-${idx}`}
              >
                Program Website <ExternalLink className="w-3 h-3" />
              </a>
              {program.needymedsUrl && (
                <a
                  href={program.needymedsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  data-testid={`link-needymeds-${entry.brandName}-${idx}`}
                >
                  NeedyMeds <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {showToggle && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1"
            onClick={() => setExpanded(!expanded)}
            data-testid={`toggle-programs-${entry.brandName}`}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" /> Show fewer programs
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" /> Show {entry.programs.length - 2} more program{entry.programs.length - 2 > 1 ? "s" : ""}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function PatientAssistance() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<ProgramType | "all">("all");
  const [activeManufacturer, setActiveManufacturer] = useState<string>("all");

  const manufacturers = useMemo(() => getAllManufacturers(), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return drugAssistanceData.filter(entry => {
      const matchesSearch =
        !q ||
        entry.brandName.toLowerCase().includes(q) ||
        entry.genericName.toLowerCase().includes(q) ||
        entry.manufacturer.toLowerCase().includes(q) ||
        entry.programs.some(p => p.name.toLowerCase().includes(q));

      const matchesType =
        activeType === "all" || entry.programs.some(p => p.type === activeType);

      const matchesManufacturer =
        activeManufacturer === "all" || entry.manufacturer === activeManufacturer;

      return matchesSearch && matchesType && matchesManufacturer;
    });
  }, [search, activeType, activeManufacturer]);

  const totalPrograms = drugAssistanceData.reduce((acc, e) => acc + e.programs.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-md bg-primary/10">
              <HeartHandshake className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">HIV Patient Assistance Programs</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                Copay cards, patient assistance programs (PAPs), and financial resources for HIV/ARV medications. Data sourced from{" "}
                <a
                  href="https://www.needymeds.org/copay_diseases.taf?_function=summary&disease_id=745&disease_eng=HIV/AIDS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  NeedyMeds <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and manufacturer websites.
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{drugAssistanceData.length}</strong> medications
                </span>
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{totalPrograms}</strong> assistance programs
                </span>
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{manufacturers.length}</strong> manufacturers
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by brand name, generic, or manufacturer..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-assistance"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex gap-2 flex-wrap">
              {(["all", "copay", "pap", "adap", "foundation"] as const).map(type => (
                <Button
                  key={type}
                  variant={activeType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveType(type)}
                  data-testid={`filter-type-${type}`}
                >
                  {type === "all" ? "All Types" : programTypeConfig[type as ProgramType]?.label ?? type}
                </Button>
              ))}
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <select
              className="text-sm border rounded-md px-2 py-1.5 bg-background h-8"
              value={activeManufacturer}
              onChange={e => setActiveManufacturer(e.target.value)}
              data-testid="select-manufacturer"
            >
              <option value="all">All Manufacturers</option>
              {manufacturers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        {(search || activeType !== "all" || activeManufacturer !== "all") && (
          <p className="text-sm text-muted-foreground">
            Showing <strong className="text-foreground">{filtered.length}</strong> of {drugAssistanceData.length} medications
          </p>
        )}

        {/* Drug Cards Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(entry => (
              <DrugCard key={entry.brandName} entry={entry} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Pill className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No medications found matching your search.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => { setSearch(""); setActiveType("all"); setActiveManufacturer("all"); }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Broader Resources Section */}
        <div className="pt-4 border-t">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Broader Assistance Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {broaderResources.map((resource, idx) => (
              <Card key={idx} data-testid={`resource-card-${idx}`}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{resource.name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                      resource.category === "adap" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                      resource.category === "foundation" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                      resource.category === "federal" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    }`}>
                      {resource.category === "adap" ? "ADAP" :
                       resource.category === "foundation" ? "Foundation" :
                       resource.category === "federal" ? "Federal" : "Directory"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                  <div className="bg-muted rounded-md p-2">
                    <p className="text-xs font-medium mb-0.5">Eligibility</p>
                    <p className="text-xs text-muted-foreground">{resource.eligibility}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap pt-1">
                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone.replace(/[^0-9]/g, "")}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="w-3 h-3" />
                        {resource.phone}
                      </a>
                    )}
                    <a
                      href={resource.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      data-testid={`link-resource-${idx}`}
                    >
                      Visit Website <ExternalLink className="w-3 h-3" />
                    </a>
                    {resource.needymedsUrl && (
                      <a
                        href={resource.needymedsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        NeedyMeds <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground border-t pt-4 pb-2 space-y-1">
          <p>
            <strong>Disclaimer:</strong> Program eligibility, savings amounts, and contact information may change. Always verify current details directly with the program or manufacturer before advising patients. Information compiled from NeedyMeds (needymeds.org), manufacturer websites, and publicly available program materials.
          </p>
          <p>
            For Medicare/Medicaid patients, copay cards generally cannot be used. Direct those patients to ADAP, HealthWell Foundation, PAN Foundation, or Extra Help/Low Income Subsidy programs.
          </p>
        </div>
      </div>
    </div>
  );
}
