import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

type GeneticResistanceNotesProps = {
  notes: string;
  onNotesChange: (notes: string) => void;
};

export default function GeneticResistanceNotes({
  notes,
  onNotesChange,
}: GeneticResistanceNotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Genetic Resistance Information</CardTitle>
        <p className="text-sm text-muted-foreground">
          Document resistance mutations and testing results
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Enter genetic resistance notes, mutations, or testing results..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-32 resize-none font-mono text-sm"
            data-testid="textarea-resistance-notes"
          />
          <p className="text-xs text-muted-foreground">
            {notes.length} characters
          </p>
        </div>

        <Button
          variant="outline"
          asChild
          className="w-full sm:w-auto"
          data-testid="button-stanford-link"
        >
          <a
            href="https://hivdb.stanford.edu/hivdb/by-mutations/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Stanford HIV Drug Resistance Database
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
