import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { X, Search, ClipboardPaste, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type ConcomitantMedicationsProps = {
  medications: string[];
  onMedicationsChange: (medications: string[]) => void;
};

/**
 * Parses a pharmacy-system med list dump and returns only the drug names.
 * Section headers (all-caps short labels like VIAL/MAIL, PRN, VIAL) are skipped.
 * Parenthetical annotations like "(PEP)" are stripped.
 */
function parseMedList(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // Section headers are all-uppercase (possibly with /, -, space) — skip them
    .filter((line) => !/^[A-Z][A-Z\s\/\-]*$/.test(line))
    // Strip trailing parenthetical notes, e.g. "doxycycline (PEP)" → "doxycycline"
    .map((line) => line.replace(/\s*\(.*?\)\s*$/, "").trim())
    .filter((line) => line.length > 0);
}

export default function ConcomitantMedications({
  medications,
  onMedicationsChange,
}: ConcomitantMedicationsProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<string[]>([]);
  const [showPaste, setShowPaste] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sanitize medications array on mount
  useEffect(() => {
    const hasInvalid = medications.some((m) => typeof m !== "string" || Array.isArray(m));
    if (hasInvalid) {
      const fixed = (medications as unknown[])
        .flat(Infinity)
        .filter((m): m is string => typeof m === "string" && m.length > 0);
      if (JSON.stringify(fixed) !== JSON.stringify(medications)) {
        onMedicationsChange(fixed);
      }
    }
  }, [medications, onMedicationsChange]);

  // Live preview while typing in the paste box
  useEffect(() => {
    if (pasteText.trim()) {
      const parsed = parseMedList(pasteText).filter((d) => !medications.includes(d));
      setParsedPreview(parsed);
    } else {
      setParsedPreview([]);
    }
  }, [pasteText, medications]);

  // NIH RxTerms autocomplete
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (inputValue.length < 2 || inputValue.includes(",")) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(inputValue)}&maxList=10`
        );
        const data = (await res.json()) as [number, string[], string[], string[], unknown[]];
        const names: string[] = data[3] || [];
        const unique = Array.from(new Set(names)).filter((m) => !medications.includes(m));
        setSuggestions(unique);
        setOpen(unique.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [inputValue, medications]);

  const commitParsed = () => {
    const newMeds = parseMedList(pasteText).filter((d) => !medications.includes(d));
    if (newMeds.length > 0) {
      onMedicationsChange([...medications, ...newMeds]);
    }
    setPasteText("");
    setParsedPreview([]);
    setShowPaste(false);
  };

  const addSingle = (med?: string) => {
    const val = (med ?? inputValue).trim();
    if (!val || medications.includes(val)) return;
    onMedicationsChange([...medications, val]);
    setInputValue("");
    setOpen(false);
  };

  const remove = (med: string) => {
    onMedicationsChange(medications.filter((m) => m !== med));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Med List</CardTitle>
        <p className="text-sm text-muted-foreground">
          Paste the pharmacy med list or search to add medications individually
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── Paste area toggle ─────────────────────────────────── */}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="button-toggle-paste"
            onClick={() => {
              setShowPaste((v) => !v);
              setPasteText("");
              setParsedPreview([]);
            }}
            className="gap-2"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            {showPaste ? "Hide paste area" : "Paste med list from pharmacy system"}
          </Button>
        </div>

        {showPaste && (
          <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Copy the full med list from your pharmacy software and paste below.
              Section labels like <span className="font-mono">VIAL/MAIL</span>, <span className="font-mono">PRN</span>,
              and <span className="font-mono">VIAL</span> are automatically ignored — only drug names are captured.
            </p>
            <Textarea
              data-testid="textarea-medlist-paste"
              placeholder={"VIAL/MAIL\n\nVIAL\ntruvada\n\nPRN\ndoxycycline (PEP)"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="font-mono text-sm resize-y min-h-[120px]"
            />

            {/* Live preview of parsed drugs */}
            {parsedPreview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Drugs found ({parsedPreview.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {parsedPreview.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-mono"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pasteText.trim() && parsedPreview.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No drug names detected — ensure lines are not all-caps section headers.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                data-testid="button-add-parsed"
                disabled={parsedPreview.length === 0}
                onClick={commitParsed}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add {parsedPreview.length > 0 ? `${parsedPreview.length} drug${parsedPreview.length !== 1 ? "s" : ""}` : "drugs"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                data-testid="button-cancel-paste"
                onClick={() => {
                  setShowPaste(false);
                  setPasteText("");
                  setParsedPreview([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Added medications ─────────────────────────────────── */}
        {medications.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Medications ({medications.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {medications.map((med) => (
                <Badge
                  key={med}
                  variant="secondary"
                  className="pl-3 pr-2 py-1.5 gap-2"
                  data-testid={`badge-med-${med}`}
                >
                  <span className="font-mono text-sm">{med}</span>
                  <button
                    onClick={() => remove(med)}
                    className="hover-elevate active-elevate-2 rounded-sm"
                    data-testid={`button-remove-${med}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
