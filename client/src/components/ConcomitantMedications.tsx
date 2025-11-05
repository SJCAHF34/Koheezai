import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { X, Plus, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type ConcomitantMedicationsProps = {
  medications: string[];
  onMedicationsChange: (medications: string[]) => void;
};

export default function ConcomitantMedications({
  medications,
  onMedicationsChange,
}: ConcomitantMedicationsProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Validate and fix medications array on mount and when it changes
  useEffect(() => {
    // Check if any element is not a string or is an array
    const hasInvalidElements = medications.some(
      (med) => typeof med !== 'string' || Array.isArray(med)
    );
    
    if (hasInvalidElements) {
      console.warn('Invalid medications array detected, flattening and filtering:', medications);
      // Flatten and ensure all elements are strings
      const fixedMeds = medications
        .flat(Infinity) // Flatten all nested arrays
        .filter((med): med is string => typeof med === 'string' && med.length > 0);
      
      if (JSON.stringify(fixedMeds) !== JSON.stringify(medications)) {
        onMedicationsChange(fixedMeds);
      }
    }
  }, [medications, onMedicationsChange]);

  // Fetch medication suggestions from NIH RxTerms API
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if input is too short or contains comma (user is entering multiple meds)
    if (inputValue.length < 2 || inputValue.includes(',')) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // Debounce API call
    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(inputValue)}&maxList=10`
        );
        const data = await response.json() as [number, string[], string[], string[], unknown[]];
        // Response format: [total_count, codes, code_systems, display_names, extra_data]
        const medicationNames: string[] = data[3] || [];
        
        // Filter out duplicates and medications already added
        const uniqueMeds = Array.from(new Set(medicationNames)).filter(
          (med) => !medications.includes(med)
        );
        
        setSuggestions(uniqueMeds);
        setOpen(uniqueMeds.length > 0);
      } catch (error) {
        console.error('Error fetching medication suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue, medications]);

  const addMedication = (medication?: string) => {
    const valueToAdd = medication || inputValue.trim();
    if (!valueToAdd) return;
    
    // Ensure valueToAdd is a string (defensive check)
    if (typeof valueToAdd !== 'string') {
      console.error('Invalid medication value:', valueToAdd);
      return;
    }
    
    // Parse comma-separated medications if no specific medication provided
    if (!medication && valueToAdd.includes(',')) {
      const meds = valueToAdd.split(',').map(m => m.trim()).filter(m => m);
      const newMeds = meds.filter(m => !medications.includes(m));
      
      if (newMeds.length > 0) {
        // Ensure all meds are strings
        const validMeds = newMeds.filter(m => typeof m === 'string' && m.length > 0);
        onMedicationsChange([...medications, ...validMeds]);
        setInputValue("");
        setOpen(false);
      }
      return;
    }
    
    // Add single medication
    if (!medications.includes(valueToAdd)) {
      onMedicationsChange([...medications, valueToAdd]);
      setInputValue("");
      setOpen(false);
    }
  };

  const removeMedication = (med: string) => {
    onMedicationsChange(medications.filter(m => m !== med));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMedication();
    }
  };

  const handleSelectSuggestion = (medication: string) => {
    addMedication(medication);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Concomitant Medications</CardTitle>
        <p className="text-sm text-muted-foreground">
          Search medications or enter comma-separated list
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div className="relative flex-1">
                <Input
                  placeholder="Search medications or enter comma-separated..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setOpen(true);
                    }
                  }}
                  data-testid="input-concomitant-med"
                  className="pr-8"
                />
                {isLoading && (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-pulse text-muted-foreground" />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[var(--radix-popover-trigger-width)] p-0" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command>
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? "Searching medications..." : "No medications found"}
                  </CommandEmpty>
                  <CommandGroup heading="Suggested Medications">
                    {suggestions.map((medication) => (
                      <CommandItem
                        key={medication}
                        value={medication}
                        onSelect={() => handleSelectSuggestion(medication)}
                        data-testid={`suggestion-${medication}`}
                      >
                        <span className="font-mono text-sm">{medication}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            onClick={() => addMedication()}
            disabled={!inputValue.trim()}
            data-testid="button-add-med"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {medications.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Added Medications ({medications.length})
              </p>
            </div>
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
                    onClick={() => removeMedication(med)}
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
