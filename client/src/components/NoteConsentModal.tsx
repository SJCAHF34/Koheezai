import { useEffect, useRef, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import SignaturePad, { type SignaturePadHandle } from "./SignaturePad";
import { CURRENT_WAIVER_VERSION, type ConsentRecord } from "@shared/schema";

const GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444, #facc15)";

interface NoteConsentModalProps {
  open: boolean;
  patientId: string;
  signerName: string;
  signerRole: string;
  priorConsent?: ConsentRecord | null;
  onCancel: () => void;
  onConfirm: (consent: ConsentRecord) => void;
}

const WAIVER_SECTIONS = [
  {
    title: "1. Independent Clinical Judgment Required",
    body: "All output from this tool — drug interaction alerts, dosing guidance, AI-generated summaries, and consultation questions — is for informational support only. I will apply independent clinical judgment to this patient and will not rely solely on this tool's output when making clinical decisions.",
  },
  {
    title: "2. Review Obligation",
    body: "As the licensed pharmacist of record, I will thoroughly review every section of the generated note — including drug-interaction alerts against current evidence, AI-generated summaries for accuracy, and the appropriateness of any recommendation for this specific patient — before acting on it or filing it.",
  },
  {
    title: "3. Acceptance of Liability",
    body: "I accept full professional and legal liability for clinical decisions made in connection with my use of this tool for this patient. Koheez.ai, its developers, and its affiliated organizations disclaim liability for any patient harm or adverse outcome arising from my clinical decisions, regardless of whether the tool's output contained errors or omissions.",
  },
  {
    title: "4. Professional Accountability",
    body: "Failure to perform a complete, independent review of this note may constitute a breach of my professional duty of care and may expose me to disciplinary action by my state Board of Pharmacy, my employer, and other applicable licensing or regulatory authorities.",
  },
];

export default function NoteConsentModal({
  open,
  patientId,
  signerName,
  signerRole,
  priorConsent,
  onCancel,
  onConfirm,
}: NoteConsentModalProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [checked, setChecked] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [sigEmpty, setSigEmpty] = useState(true);
  const [reSigning, setReSigning] = useState(false);

  const hasPrior = !!priorConsent && priorConsent.waiverVersion === CURRENT_WAIVER_VERSION;

  // Reset state when opened / patient changes
  useEffect(() => {
    if (!open) return;
    setChecked(false);
    setReSigning(false);
    if (hasPrior && priorConsent) {
      setTypedName(priorConsent.typedName);
      // load prior signature into pad after mount tick
      setTimeout(() => {
        padRef.current?.loadDataUrl(priorConsent.signatureDataUrl);
        setSigEmpty(false);
      }, 0);
    } else {
      setTypedName("");
      setTimeout(() => {
        padRef.current?.clear();
        setSigEmpty(true);
      }, 0);
    }
  }, [open, patientId, hasPrior, priorConsent]);

  if (!open) return null;

  const readOnlyPrior = hasPrior && !reSigning;
  const canConfirm =
    checked && typedName.trim().length > 0 && (readOnlyPrior || !sigEmpty);

  const handleReSign = () => {
    setReSigning(true);
    padRef.current?.clear();
    setSigEmpty(true);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    const sigUrl = readOnlyPrior
      ? priorConsent!.signatureDataUrl
      : padRef.current?.toDataUrl() ?? "";
    const consent: ConsentRecord = {
      signerName,
      signerRole,
      typedName: typedName.trim(),
      signatureDataUrl: sigUrl,
      timestamp: new Date().toISOString(),
      waiverVersion: CURRENT_WAIVER_VERSION,
      patientId,
    };
    onConfirm(consent);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-testid="consent-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card rounded-md shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundImage: GRADIENT }}
              >
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Patient {patientId}
                </p>
                <h2 className="text-lg font-bold text-foreground">
                  Consent to Generate Comprehensive Note
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              data-testid="button-consent-close"
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-2.5">
            Before generating the consultation note for this patient, please acknowledge the clinical responsibility agreement and sign below.
          </p>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-sm text-foreground leading-relaxed">
          <div className="space-y-4">
            {WAIVER_SECTIONS.map((s) => (
              <section key={s.title}>
                <h3 className="font-bold text-foreground mb-1 text-[13px]">{s.title}</h3>
                <p className="text-[13px]">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer" data-testid="consent-checkbox-label">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                data-testid="consent-checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-purple-600 cursor-pointer shrink-0"
              />
              <span className="text-[13px] text-foreground leading-relaxed">
                I have read and understood this agreement and accept full professional responsibility for the clinical decisions I make using the note generated for patient {patientId}.
              </span>
            </label>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Typed full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={signerName || "Type your full legal name"}
                data-testid="input-consent-typed-name"
                disabled={readOnlyPrior}
                className="w-full px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300 disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Digital signature <span className="text-red-500">*</span>
                </label>
                {readOnlyPrior && (
                  <button
                    type="button"
                    onClick={handleReSign}
                    data-testid="button-consent-resign"
                    className="text-xs font-medium text-purple-700 hover:text-purple-900"
                  >
                    Re-sign
                  </button>
                )}
              </div>
              <SignaturePad
                ref={padRef}
                disabled={readOnlyPrior}
                onChange={(empty) => setSigEmpty(empty)}
                data-testid="consent-signature-pad"
              />
              {readOnlyPrior && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Showing the signature you previously provided for this patient. Click <strong>Re-sign</strong> to capture a new one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/40 rounded-b-md shrink-0 flex items-center justify-end gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            data-testid="button-consent-cancel"
            className="px-4 py-2 rounded-md border border-border bg-card text-sm font-semibold text-foreground hover-elevate"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-testid="button-consent-confirm"
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-md transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundImage: GRADIENT }}
          >
            Confirm &amp; Generate Note
          </button>
        </div>
      </div>
    </div>
  );
}
