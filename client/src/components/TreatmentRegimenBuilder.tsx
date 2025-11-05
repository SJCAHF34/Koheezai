import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { drugClasses, getDrugsByClass } from "@/lib/hivDrugs";

type TreatmentRegimenBuilderProps = {
  selectedDrugs: string[];
  onDrugsChange: (drugs: string[]) => void;
};

export default function TreatmentRegimenBuilder({
  selectedDrugs,
  onDrugsChange,
}: TreatmentRegimenBuilderProps) {
  const toggleDrug = (drugId: string) => {
    if (selectedDrugs.includes(drugId)) {
      onDrugsChange(selectedDrugs.filter(id => id !== drugId));
    } else {
      onDrugsChange([...selectedDrugs, drugId]);
    }
  };

  const getClassCount = (drugClass: string) => {
    const classeDrugs = getDrugsByClass(drugClass);
    return selectedDrugs.filter(id => classeDrugs.some(d => d.id === id)).length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Treatment Regimen</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select antiretroviral medications
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {drugClasses.map((drugClass) => {
            const drugs = getDrugsByClass(drugClass);
            const count = getClassCount(drugClass);
            
            return (
              <AccordionItem key={drugClass} value={drugClass}>
                <AccordionTrigger className="hover:no-underline" data-testid={`accordion-${drugClass.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{drugClass}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {count} selected
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {drugs.map((drug) => (
                      <div key={drug.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={drug.id}
                          checked={selectedDrugs.includes(drug.id)}
                          onCheckedChange={() => toggleDrug(drug.id)}
                          data-testid={`checkbox-drug-${drug.id}`}
                        />
                        <div className="grid gap-1 leading-none">
                          <Label
                            htmlFor={drug.id}
                            className="font-mono text-sm font-medium leading-none cursor-pointer"
                          >
                            {drug.name}
                            {drug.brandName && (
                              <span className="text-muted-foreground font-sans ml-1">
                                ({drug.brandName})
                              </span>
                            )}
                          </Label>
                          <p className="text-xs text-muted-foreground font-mono">
                            {drug.dosage}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
