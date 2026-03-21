import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardList, FileText, Check, Copy, ExternalLink } from "lucide-react";

const ONESOURCE_URL = "https://www.onesource.passporthealth.com/_members/Home/Login.aspx";

const YES_NO_QUESTIONS = [
  { key: "allergies",        label: "Medication allergies",                  question: "Do you have any medication allergies?",                                                                                          detailLabel: "Please list allergies",                    hasDetail: true },
  { key: "other-pharmacies", label: "Prescriptions at other pharmacies",     question: "Do you have any prescriptions that you are filling at other pharmacies?",                                                        detailLabel: "Please list medications and pharmacies",   hasDetail: true },
  { key: "otc",              label: "OTC medications",                       question: "Do you use any over the counter medications?",                                                                                    detailLabel: "Please list OTC medications",              hasDetail: true },
  { key: "conditions",       label: "Additional health conditions",          question: "Do you have any additional health conditions that we haven't discussed?",                                                        detailLabel: "Please list conditions",                   hasDetail: true },
  { key: "physical",         label: "Physical medication concerns",          question: "Do you ever have concerns being able to physically take your medications (pill size, ability to swallow, etc)?",                  hasDetail: false },
  { key: "helper",           label: "Medication helper",                     question: "Is there anyone who helps you with your medications?",                                                                            hasDetail: false },
  { key: "cost",             label: "Medication affordability concerns",     question: "Do you have any issues affording your medications? Do you skip doses or avoid refilling medications due to cost?",               hasDetail: false },
  { key: "housing",          label: "Housing / safety concerns",             question: "Do you have any safety, health or security concerns with your current housing or living arrangements?",                          hasDetail: false },
  { key: "memory",           label: "Memory or reasoning concerns",          question: "Do you have any issues with memory or reasoning?",                                                                                hasDetail: false },
];

const COUNSELING_ITEMS = [
  { key: "booklet",   label: "Patient was given the welcome booklet that outlines the pharmacy's current contact information and overview of AHF's services." },
  { key: "monograph", label: "Patient was given the specialty medication monograph." },
  { key: "advocate",  label: "AHF Pharmacist acts as patient's advocate to help support their overall health. Patient was informed to contact the pharmacist for any medication needs." },
];

const METHOD_ITEMS = [
  { key: "in-person", label: "In person" },
  { key: "phone",     label: "Via phone" },
  { key: "other",     label: "Other" },
];

export default function PharmacistIntake() {
  const [bin, setBin] = useState("");
  const [pcn, setPcn] = useState("");
  const [insuranceId, setInsuranceId] = useState("");
  const [rxgrp, setRxgrp] = useState("");
  const [yesNoAnswers, setYesNoAnswers] = useState<Record<string, "yes" | "no" | null>>({});
  const [yesNoDetails, setYesNoDetails] = useState<Record<string, string>>({});
  const [counselingChecks, setCounselingChecks] = useState<Record<string, boolean>>({});
  const [assessmentMethod, setAssessmentMethod] = useState<Record<string, boolean>>({});

  const [summaryCopied, setSummaryCopied] = useState(false);

  const setYesNo = (key: string, val: "yes" | "no") =>
    setYesNoAnswers((prev) => ({ ...prev, [key]: prev[key] === val ? null : val }));

  const buildSummaryText = (): string => {
    const lines: string[] = ["PATIENT INTAKE SUMMARY", ""];
    if (bin || pcn || insuranceId || rxgrp) {
      lines.push("Insurance:");
      if (bin)        lines.push(`  BIN:   ${bin}`);
      if (pcn)        lines.push(`  PCN:   ${pcn}`);
      if (insuranceId) lines.push(`  ID:    ${insuranceId}`);
      if (rxgrp)      lines.push(`  RXGRP: ${rxgrp}`);
      lines.push("");
    }
    const answered = YES_NO_QUESTIONS.filter((q) => yesNoAnswers[q.key]);
    if (answered.length > 0) {
      lines.push("Intake Responses:");
      answered.forEach((q) => {
        const ans = yesNoAnswers[q.key] === "yes" ? "Yes" : "No";
        const detail = q.hasDetail && yesNoAnswers[q.key] === "yes" ? yesNoDetails[q.key] : "";
        lines.push(`  ${q.label}: ${ans}${detail ? ` — ${detail}` : ""}`);
      });
      lines.push("");
    }
    const counseled = COUNSELING_ITEMS.filter((i) => counselingChecks[i.key]);
    if (counseled.length > 0) {
      lines.push("Patient Counseled On:");
      counseled.forEach((i) => lines.push(`  - ${i.label}`));
      lines.push("");
    }
    const methods = METHOD_ITEMS.filter((i) => assessmentMethod[i.key]);
    if (methods.length > 0) {
      lines.push(`Assessment Completed: ${methods.map((m) => m.label).join(", ")}`);
    }
    return lines.join("\n");
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(buildSummaryText()).then(() => {
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    });
  };

  const hasInsurance = bin || pcn || insuranceId || rxgrp;
  const answeredCount = Object.values(yesNoAnswers).filter(Boolean).length;
  const counseledItems = COUNSELING_ITEMS.filter((i) => counselingChecks[i.key]);
  const methods = METHOD_ITEMS.filter((i) => assessmentMethod[i.key]);
  const hasSummary = hasInsurance || answeredCount > 0 || counseledItems.length > 0 || methods.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Initial Intake Assessment
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Insurance details, intake questions, and counseling checklist
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Insurance fields */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-medium text-sm">What is your current insurance?</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-onesource"
                onClick={() => window.open(ONESOURCE_URL, "_blank", "noopener,noreferrer")}
                className="flex items-center gap-1.5 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                Verify with OneSource
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="intake-bin" className="text-xs text-muted-foreground">BIN</Label>
                <Input id="intake-bin" data-testid="input-intake-bin" placeholder="BIN" value={bin} onChange={(e) => setBin(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intake-pcn" className="text-xs text-muted-foreground">PCN</Label>
                <Input id="intake-pcn" data-testid="input-intake-pcn" placeholder="PCN" value={pcn} onChange={(e) => setPcn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intake-id" className="text-xs text-muted-foreground">ID</Label>
                <Input id="intake-id" data-testid="input-intake-id" placeholder="Member ID" value={insuranceId} onChange={(e) => setInsuranceId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intake-rxgrp" className="text-xs text-muted-foreground">RXGRP</Label>
                <Input id="intake-rxgrp" data-testid="input-intake-rxgrp" placeholder="RX Group" value={rxgrp} onChange={(e) => setRxgrp(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Yes / No questions */}
          <div className="space-y-3">
            {YES_NO_QUESTIONS.map(({ key, question, hasDetail, detailLabel }) => (
              <div key={key} className="p-4 rounded-md border space-y-2" data-testid={`yesno-${key}`}>
                <p className="font-medium text-sm">{question}</p>
                <div className="flex gap-3">
                  {(["Yes", "No"] as const).map((opt) => {
                    const val = opt.toLowerCase() as "yes" | "no";
                    const active = yesNoAnswers[key] === val;
                    return (
                      <button
                        key={opt}
                        type="button"
                        data-testid={`btn-${key}-${val}`}
                        onClick={() => setYesNo(key, val)}
                        className={`px-5 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover-elevate"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {hasDetail && yesNoAnswers[key] === "yes" && (
                  <Input
                    data-testid={`input-detail-${key}`}
                    placeholder={detailLabel}
                    value={yesNoDetails[key] ?? ""}
                    onChange={(e) => setYesNoDetails((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Counseling checkboxes */}
          <div className="space-y-2">
            <p className="font-medium text-sm">The patient was counseled on the following information:</p>
            {COUNSELING_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-start gap-3 p-3 rounded-md border" data-testid={`counseling-${key}`}>
                <Checkbox
                  id={`counsel-${key}`}
                  data-testid={`checkbox-counsel-${key}`}
                  checked={!!counselingChecks[key]}
                  onCheckedChange={(checked) => setCounselingChecks((prev) => ({ ...prev, [key]: !!checked }))}
                />
                <Label htmlFor={`counsel-${key}`} className="font-normal cursor-pointer text-sm leading-snug">{label}</Label>
              </div>
            ))}
          </div>

          {/* Assessment method */}
          <div className="space-y-2">
            <p className="font-medium text-sm">This initial assessment was completed with the patient:</p>
            {METHOD_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-md border" data-testid={`method-${key}`}>
                <Checkbox
                  id={`method-${key}`}
                  data-testid={`checkbox-method-${key}`}
                  checked={!!assessmentMethod[key]}
                  onCheckedChange={(checked) => setAssessmentMethod((prev) => ({ ...prev, [key]: !!checked }))}
                />
                <Label htmlFor={`method-${key}`} className="font-normal cursor-pointer text-sm">{label}</Label>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>

      {/* Patient Summary — only shown when something has been entered */}
      {hasSummary && (
        <Card data-testid="patient-summary">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Patient Summary
              </CardTitle>
              <button
                type="button"
                data-testid="btn-copy-summary"
                onClick={handleCopySummary}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors hover-elevate ${
                  summaryCopied ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"
                }`}
              >
                {summaryCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {summaryCopied ? "Copied!" : "Copy Summary"}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Auto-generated from consultation responses
            </p>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">

            {/* Insurance */}
            {hasInsurance && (
              <div className="space-y-1">
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Insurance</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "BIN",   value: bin },
                    { label: "PCN",   value: pcn },
                    { label: "ID",    value: insuranceId },
                    { label: "RXGRP", value: rxgrp },
                  ].filter((f) => f.value).map((f) => (
                    <div key={f.label} className="bg-muted rounded-md px-3 py-2">
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="font-medium">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Intake responses */}
            {answeredCount > 0 && (
              <div className="space-y-1.5">
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Intake Responses</p>
                <div className="space-y-1">
                  {YES_NO_QUESTIONS.filter((q) => yesNoAnswers[q.key]).map((q) => {
                    const answer = yesNoAnswers[q.key]!;
                    const detail = q.hasDetail && answer === "yes" ? yesNoDetails[q.key] : "";
                    return (
                      <div key={q.key} className="flex items-start justify-between gap-3 py-1.5 border-b last:border-0">
                        <span className="text-foreground">{q.label}</span>
                        <div className="text-right shrink-0">
                          <span className={`font-medium ${answer === "yes" ? "text-foreground" : "text-muted-foreground"}`}>
                            {answer === "yes" ? "Yes" : "No"}
                          </span>
                          {detail && (
                            <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Counseling */}
            {counseledItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Patient Counseled On</p>
                <ul className="space-y-1">
                  {counseledItems.map((i) => (
                    <li key={i.key} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{i.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assessment method */}
            {methods.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Assessment Completed</p>
                <p>{methods.map((m) => m.label).join(", ")}</p>
              </div>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  );
}
