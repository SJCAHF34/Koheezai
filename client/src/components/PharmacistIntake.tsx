import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClipboardList } from "lucide-react";

export default function PharmacistIntake() {
  const [bin, setBin] = useState("");
  const [pcn, setPcn] = useState("");
  const [insuranceId, setInsuranceId] = useState("");
  const [rxgrp, setRxgrp] = useState("");
  const [yesNoAnswers, setYesNoAnswers] = useState<Record<string, "yes" | "no" | null>>({});
  const [yesNoDetails, setYesNoDetails] = useState<Record<string, string>>({});
  const [counselingChecks, setCounselingChecks] = useState<Record<string, boolean>>({});
  const [assessmentMethod, setAssessmentMethod] = useState<Record<string, boolean>>({});

  const setYesNo = (key: string, val: "yes" | "no") =>
    setYesNoAnswers((prev) => ({ ...prev, [key]: prev[key] === val ? null : val }));

  const yesNoQuestions = [
    { key: "allergies", question: "Do you have any medication allergies?", detailLabel: "Please list allergies", hasDetail: true },
    { key: "other-pharmacies", question: "Do you have any prescriptions that you are filling at other pharmacies?", detailLabel: "Please list medications and pharmacies", hasDetail: true },
    { key: "otc", question: "Do you use any over the counter medications?", detailLabel: "Please list OTC medications", hasDetail: true },
    { key: "conditions", question: "Do you have any additional health conditions that we haven't discussed?", hasDetail: false },
    { key: "physical", question: "Do you ever have concerns being able to physically take your medications (pill size, ability to swallow, etc)?", hasDetail: false },
    { key: "helper", question: "Is there anyone who helps you with your medications?", hasDetail: false },
    { key: "cost", question: "Do you have any issues affording your medications? Do you skip doses or avoid refilling medications due to cost?", hasDetail: false },
    { key: "housing", question: "Do you have any safety, health or security concerns with your current housing or living arrangements?", hasDetail: false },
    { key: "memory", question: "Do you have any issues with memory or reasoning?", hasDetail: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Pharmacist Consultation Questions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Initial patient intake assessment
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Free-text fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="font-medium text-sm">What is your current insurance?</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="intake-bin" className="text-xs text-muted-foreground">BIN</Label>
                <Input
                  id="intake-bin"
                  data-testid="input-intake-bin"
                  placeholder="BIN"
                  value={bin}
                  onChange={(e) => setBin(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intake-pcn" className="text-xs text-muted-foreground">PCN</Label>
                <Input
                  id="intake-pcn"
                  data-testid="input-intake-pcn"
                  placeholder="PCN"
                  value={pcn}
                  onChange={(e) => setPcn(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intake-id" className="text-xs text-muted-foreground">ID</Label>
                <Input
                  id="intake-id"
                  data-testid="input-intake-id"
                  placeholder="Member ID"
                  value={insuranceId}
                  onChange={(e) => setInsuranceId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intake-rxgrp" className="text-xs text-muted-foreground">RXGRP</Label>
                <Input
                  id="intake-rxgrp"
                  data-testid="input-intake-rxgrp"
                  placeholder="RX Group"
                  value={rxgrp}
                  onChange={(e) => setRxgrp(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Yes / No questions */}
        <div className="space-y-3">
          {yesNoQuestions.map(({ key, question, hasDetail, detailLabel }) => (
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
                  onChange={(e) =>
                    setYesNoDetails((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* Counseling checkboxes */}
        <div className="space-y-2">
          <p className="font-medium text-sm">The patient was counseled on the following information:</p>
          {[
            { key: "booklet", label: "Patient was given the welcome booklet that outlines the pharmacy's current contact information and overview of AHF's services." },
            { key: "monograph", label: "Patient was given the specialty medication monograph." },
            { key: "advocate", label: "AHF Pharmacist acts as patient's advocate to help support their overall health. Patient was informed to contact the pharmacist for any medication needs." },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-start gap-3 p-3 rounded-md border" data-testid={`counseling-${key}`}>
              <Checkbox
                id={`counsel-${key}`}
                data-testid={`checkbox-counsel-${key}`}
                checked={!!counselingChecks[key]}
                onCheckedChange={(checked) =>
                  setCounselingChecks((prev) => ({ ...prev, [key]: !!checked }))
                }
              />
              <Label htmlFor={`counsel-${key}`} className="font-normal cursor-pointer text-sm leading-snug">
                {label}
              </Label>
            </div>
          ))}
        </div>

        {/* Assessment method */}
        <div className="space-y-2">
          <p className="font-medium text-sm">This initial assessment was completed with the patient:</p>
          {[
            { key: "in-person", label: "In person" },
            { key: "phone", label: "Via phone" },
            { key: "other", label: "Other" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-md border" data-testid={`method-${key}`}>
              <Checkbox
                id={`method-${key}`}
                data-testid={`checkbox-method-${key}`}
                checked={!!assessmentMethod[key]}
                onCheckedChange={(checked) =>
                  setAssessmentMethod((prev) => ({ ...prev, [key]: !!checked }))
                }
              />
              <Label htmlFor={`method-${key}`} className="font-normal cursor-pointer text-sm">
                {label}
              </Label>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
