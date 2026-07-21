import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pill,
  Search,
  PlusCircle,
  ShieldCheck,
  Lock,
  ClipboardCheck,
  AlertTriangle,
  History,
  Trash2,
  ChevronRight,
  ListChecks,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  CONTROLLED_DRUG_CATALOG,
  type ControlledDrug,
  type DeaSchedule,
  ADJUSTMENT_TYPES,
  type AdjustmentType,
  adjustmentDelta,
  searchControlledDrugs,
  findControlledDrugByNdc,
  normalizeNdc,
  addCustomControlledDrug,
} from "@/lib/controlledDrugs";
import {
  appendAdjustment,
  currentBiAnnualPeriod,
  deleteBiAnnualCount,
  getAdjustmentsForSite,
  getBiAnnualCounts,
  getInventoryForSite,
  getInventoryItem,
  makeInventoryId,
  removeInventoryItem,
  upsertBiAnnualCount,
  upsertInventoryItem,
  type BiAnnualCount,
  type BiAnnualCountEntry,
  type InventoryAdjustment,
  type InventoryItem,
} from "@/lib/controlledInventoryStorage";
import { getUserProfile, isPharmacist } from "@/lib/userProfile";
import { STORE_REGIONS, findStore } from "@/lib/storeDirectory";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ─────────────────────────────────────────────────────────────────

function scheduleBadgeColor(s: string): string {
  switch (s) {
    case "C-II":  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    case "C-III": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "C-IV":  return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "C-V":   return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    default:      return "bg-muted text-muted-foreground";
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function allStoresFlat(): { id: string; name: string; region: string }[] {
  const out: { id: string; name: string; region: string }[] = [];
  for (const region of STORE_REGIONS) {
    for (const store of region.stores) out.push({ id: store.id, name: store.name, region: region.region });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ControlledInventory() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;
  const userIsPharmacist = profile ? isPharmacist(profile.role) : false;

  const allStores = useMemo(() => allStoresFlat(), []);
  const homeStoreId = profile?.siteId && profile.siteId !== "ALL" ? profile.siteId : allStores[0]?.id ?? "";
  const [selectedSiteId, setSelectedSiteId] = useState<string>(homeStoreId);
  const selectedStore = findStore(selectedSiteId);

  // Refresh trigger so children re-pull from localStorage after mutations.
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  // Allow deep-links from elsewhere (e.g. the bi-annual count task in Task
  // Manager) to land on a specific tab via ?tab=biannual / ?tab=ledger.
  const initialTab = useMemo(() => {
    if (typeof window === "undefined") return "perpetual";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "biannual" || t === "ledger" || t === "perpetual" ? t : "perpetual";
  }, []);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  if (!profile) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </main>
    );
  }

  const isMultiStore = profile.siteId === "ALL" || profile.role === "regional_pharmacy_director" || profile.role === "chief_pharmacy_officer";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" data-testid="page-controlled-inventory">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Controlled Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per-store perpetual inventory, adjustment ledger, and biennial
            controlled-substance count for DEA Schedules II – V.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isMultiStore && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Store</span>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-[260px]" data-testid="select-store">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {allStores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} <span className="text-muted-foreground">— {s.region}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Badge variant="outline" className="gap-1" data-testid="badge-current-store">
            <Pill className="w-3 h-3" />
            {selectedStore ? `${selectedStore.name} · #${selectedStore.id}` : `Store #${selectedSiteId}`}
          </Badge>
          {userIsPharmacist ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1" data-testid="badge-pharmacist-on">
              <CheckCircle2 className="w-3 h-3" /> Pharmacist
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-300" data-testid="badge-readonly">
              <Lock className="w-3 h-3" /> Read-only
            </Badge>
          )}
        </div>
      </div>

      {!userIsPharmacist && (
        <Card>
          <CardContent className="py-3 flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Only pharmacists can adjust the perpetual inventory or finalize a
              biennial count. You can view all data below.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="perpetual" data-testid="tab-perpetual">
            <ListChecks className="w-4 h-4 mr-1.5" />
            Perpetual Inventory
          </TabsTrigger>
          <TabsTrigger value="biannual" data-testid="tab-biannual">
            <ClipboardCheck className="w-4 h-4 mr-1.5" />
            Biennial Count
          </TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">
            <History className="w-4 h-4 mr-1.5" />
            Adjustment Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perpetual" className="mt-4">
          <PerpetualInventoryPanel
            key={`perp-${selectedSiteId}-${tick}`}
            siteId={selectedSiteId}
            canEdit={userIsPharmacist}
            performerName={profile.name}
            performerRole={profile.role}
            onChanged={bump}
          />
        </TabsContent>

        <TabsContent value="biannual" className="mt-4">
          <BiAnnualPanel
            key={`bia-${selectedSiteId}-${tick}`}
            siteId={selectedSiteId}
            canEdit={userIsPharmacist}
            performerName={profile.name}
            performerRole={profile.role}
            onChanged={bump}
          />
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <LedgerPanel
            key={`ledger-${selectedSiteId}-${tick}`}
            siteId={selectedSiteId}
            canEdit={userIsPharmacist}
            onChanged={bump}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Perpetual inventory panel
// ─────────────────────────────────────────────────────────────────────────────

interface PanelProps {
  siteId: string;
  canEdit: boolean;
  performerName: string;
  performerRole: string;
  onChanged: () => void;
}

function PerpetualInventoryPanel({ siteId, canEdit, performerName, performerRole, onChanged }: PanelProps) {
  const items = getInventoryForSite(siteId);
  const [search, setSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [addCandidate, setAddCandidate] = useState<ControlledDrug | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.drugName.toLowerCase().includes(q) ||
        i.ndc.includes(q) ||
        i.schedule.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5" />
              Perpetual Inventory ({items.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Active on-hand counts for this store. Only pharmacists may adjust.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search inventory…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 w-[220px]"
                data-testid="input-search-inventory"
              />
            </div>
            {canEdit && (
              <Button onClick={() => setShowCatalog(true)} data-testid="button-add-inventory">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Add NDC
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {items.length === 0
              ? "No inventory yet. Add your first NDC to begin a perpetual count."
              : "No items match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">NDC</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead className="w-[120px]">Strength</TableHead>
                  <TableHead className="w-[120px]">Form</TableHead>
                  <TableHead className="w-[80px]">Sched.</TableHead>
                  <TableHead className="w-[100px] text-right">On-hand</TableHead>
                  <TableHead className="w-[200px]">Last adjusted</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((it) => (
                  <TableRow key={it.id} data-testid={`row-inventory-${it.ndc}`}>
                    <TableCell className="font-mono text-xs">{it.ndc}</TableCell>
                    <TableCell className="font-medium">{it.drugName}</TableCell>
                    <TableCell className="text-sm">{it.strength}</TableCell>
                    <TableCell className="text-sm">{it.form}</TableCell>
                    <TableCell>
                      <Badge className={scheduleBadgeColor(it.schedule)}>{it.schedule}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{it.currentCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(it.lastAdjustedAt)}
                      <br />
                      <span className="opacity-75">by {it.lastAdjustedBy}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAdjustingItem(it)}
                              data-testid={`button-adjust-${it.ndc}`}
                            >
                              Adjust
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Remove from inventory"
                              onClick={() => {
                                if (confirm(`Remove ${it.drugName} from inventory? This does not delete adjustment history.`)) {
                                  removeInventoryItem(siteId, it.ndc);
                                  onChanged();
                                }
                              }}
                              data-testid={`button-remove-${it.ndc}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* NDC catalog/search dialog */}
      <NdcCatalogDialog
        open={showCatalog}
        onOpenChange={(o) => {
          setShowCatalog(o);
          if (!o) setAddCandidate(null);
        }}
        siteId={siteId}
        onSelect={(drug) => setAddCandidate(drug)}
      />

      {/* Add candidate (initial count) */}
      <AddInventoryDialog
        drug={addCandidate}
        siteId={siteId}
        onClose={() => {
          setAddCandidate(null);
          setShowCatalog(false);
        }}
        performerName={performerName}
        performerRole={performerRole}
        onSaved={() => {
          setAddCandidate(null);
          setShowCatalog(false);
          onChanged();
        }}
      />

      {/* Adjustment dialog */}
      <AdjustmentDialog
        item={adjustingItem}
        onClose={() => setAdjustingItem(null)}
        performerName={performerName}
        performerRole={performerRole}
        onSaved={() => {
          setAdjustingItem(null);
          onChanged();
        }}
      />
    </Card>
  );
}

// ── NDC catalog/search dialog ───────────────────────────────────────────────

interface NdcCatalogDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  siteId: string;
  onSelect: (d: ControlledDrug) => void;
}

function NdcCatalogDialog({ open, onOpenChange, siteId, onSelect }: NdcCatalogDialogProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchControlledDrugs(query, 50), [query]);

  function handlePickByNdc() {
    const found = findControlledDrugByNdc(query);
    if (found) onSelect(found);
  }

  // If user types an exact 11-digit NDC, allow Enter to commit immediately.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const exact = findControlledDrugByNdc(query);
      if (exact) onSelect(exact);
    }
  }

  // Already-stocked NDCs at this store are surfaced but greyed out.
  const existing = useMemo(
    () => new Set(getInventoryForSite(siteId).map((i) => i.ndc)),
    [siteId, open],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            NDC Search
          </DialogTitle>
          <DialogDescription>
            Look up a controlled substance by National Drug Code or by name.
            Selecting a drug auto-populates name, strength, and form.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type NDC (e.g. 00574-0820-01) or drug name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              data-testid="input-ndc-search"
            />
            <Button variant="outline" onClick={handlePickByNdc} data-testid="button-ndc-lookup">
              Lookup
            </Button>
          </div>

          {query && findControlledDrugByNdc(query) && (
            <p className="text-xs text-emerald-600">
              Exact NDC match: {normalizeNdc(query)} — press Enter to use it.
            </p>
          )}

          <div className="max-h-[400px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">NDC</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead className="w-[110px]">Strength</TableHead>
                  <TableHead className="w-[110px]">Form</TableHead>
                  <TableHead className="w-[80px]">Sched.</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      No matches.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((d) => {
                    const already = existing.has(d.ndc);
                    return (
                      <TableRow key={d.ndc} data-testid={`row-catalog-${d.ndc}`}>
                        <TableCell className="font-mono text-xs">{d.ndc}</TableCell>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-sm">{d.strength}</TableCell>
                        <TableCell className="text-sm">{d.form}</TableCell>
                        <TableCell>
                          <Badge className={scheduleBadgeColor(d.schedule)}>{d.schedule}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {already ? (
                            <Badge variant="outline" className="text-xs">In stock</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => onSelect(d)}
                              data-testid={`button-pick-${d.ndc}`}
                            >
                              Pick
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-catalog">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add to inventory (initial count) dialog ─────────────────────────────────

interface AddInventoryDialogProps {
  drug: ControlledDrug | null;
  siteId: string;
  performerName: string;
  performerRole: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddInventoryDialog({ drug, siteId, performerName, performerRole, onClose, onSaved }: AddInventoryDialogProps) {
  const { toast } = useToast();
  const [count, setCount] = useState<string>("0");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (drug) {
      const existing = getInventoryItem(siteId, drug.ndc);
      setCount(String(existing?.currentCount ?? 0));
      setReason("");
    }
  }, [drug, siteId]);

  if (!drug) return null;

  const qty = parseInt(count, 10);
  const valid = !Number.isNaN(qty) && qty >= 0;

  function save() {
    if (!valid || !drug) return;
    const now = new Date().toISOString();
    const item: InventoryItem = {
      id: makeInventoryId(siteId, drug.ndc),
      siteId,
      ndc: drug.ndc,
      drugName: drug.name,
      strength: drug.strength,
      form: drug.form,
      schedule: drug.schedule,
      currentCount: qty,
      lastAdjustedAt: now,
      lastAdjustedBy: performerName,
      lastAdjustedByRole: performerRole,
    };
    upsertInventoryItem(item);
    appendAdjustment({
      id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      siteId,
      ndc: drug.ndc,
      drugName: drug.name,
      type: "Addition",
      quantity: qty,
      countAfter: qty,
      reason: reason.trim() || "Initial stocking count",
      performedBy: performerName,
      performedByRole: performerRole,
      performedAt: now,
    });
    toast({ title: "Added to inventory", description: `${drug.name} — ${qty} on hand.` });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to inventory</DialogTitle>
          <DialogDescription>
            Record the current on-hand count for this drug. This becomes the
            starting balance of the perpetual inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted p-3">
            <div className="font-medium">{drug.name}</div>
            <div className="text-muted-foreground">
              {drug.strength} · {drug.form}
            </div>
            <div className="text-xs mt-1 flex items-center gap-2">
              <Badge className={scheduleBadgeColor(drug.schedule)}>{drug.schedule}</Badge>
              <span className="font-mono text-muted-foreground">{drug.ndc}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="count">
              Current count
            </label>
            <Input
              id="count"
              type="number"
              min={0}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              autoFocus
              data-testid="input-initial-count"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="reason">
              Note (optional)
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Opening day stock from receiving invoice #12345"
              rows={2}
              data-testid="input-initial-reason"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid} data-testid="button-save-inventory">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Adjustment dialog ───────────────────────────────────────────────────────

interface AdjustmentDialogProps {
  item: InventoryItem | null;
  performerName: string;
  performerRole: string;
  onClose: () => void;
  onSaved: () => void;
}

function AdjustmentDialog({ item, performerName, performerRole, onClose, onSaved }: AdjustmentDialogProps) {
  const { toast } = useToast();
  const [type, setType] = useState<AdjustmentType>("Subtraction");
  const [qtyStr, setQtyStr] = useState("1");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (item) {
      setType("Subtraction");
      setQtyStr("1");
      setReason("");
    }
  }, [item]);

  if (!item) return null;

  const qty = parseInt(qtyStr, 10);
  const valid = !Number.isNaN(qty) && qty > 0;
  const delta = valid ? adjustmentDelta(type, qty) : 0;
  const projected = item.currentCount + delta;
  const wouldGoNegative = projected < 0;
  const requiresReason = type === "Lost Med";

  function save() {
    if (!valid || wouldGoNegative || !item) return;
    if (requiresReason && !reason.trim()) {
      toast({
        title: "Reason required",
        description: "Lost Med adjustments must include an explanation.",
        variant: "destructive",
      });
      return;
    }
    const now = new Date().toISOString();
    const newCount = projected;
    const updated: InventoryItem = {
      ...item,
      currentCount: newCount,
      lastAdjustedAt: now,
      lastAdjustedBy: performerName,
      lastAdjustedByRole: performerRole,
    };
    upsertInventoryItem(updated);
    appendAdjustment({
      id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      siteId: item.siteId,
      ndc: item.ndc,
      drugName: item.drugName,
      type,
      quantity: qty,
      countAfter: newCount,
      reason: reason.trim() || undefined,
      performedBy: performerName,
      performedByRole: performerRole,
      performedAt: now,
    });
    toast({ title: "Adjustment recorded", description: `${item.drugName}: ${type} ${qty} → ${newCount} on hand.` });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inventory adjustment</DialogTitle>
          <DialogDescription>
            All changes are logged to the adjustment ledger with timestamp and pharmacist signature.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted p-3">
            <div className="font-medium">{item.drugName}</div>
            <div className="text-muted-foreground">{item.strength} · {item.form}</div>
            <div className="text-xs mt-1 flex items-center gap-2">
              <Badge className={scheduleBadgeColor(item.schedule)}>{item.schedule}</Badge>
              <span className="font-mono text-muted-foreground">{item.ndc}</span>
            </div>
            <div className="mt-2 text-sm">
              On hand: <span className="font-bold">{item.currentCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Adjustment type</label>
              <Select value={type} onValueChange={(v) => setType(v as AdjustmentType)}>
                <SelectTrigger data-testid="select-adjustment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="qty">Quantity</label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
                data-testid="input-adjustment-qty"
              />
            </div>
          </div>

          <div className="rounded-md border bg-card p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Resulting on-hand</span>
            <span className={`font-bold ${wouldGoNegative ? "text-red-600" : ""}`} data-testid="text-projected-count">
              {valid ? projected : "—"}
            </span>
          </div>

          {wouldGoNegative && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 flex items-start gap-2 text-xs text-red-700 dark:text-red-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              That would drop on-hand below zero. Reduce the quantity or use Addition instead.
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="reason">
              Reason {requiresReason ? <span className="text-red-500">*</span> : "(optional)"}
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === "Dispensing"
                  ? "Rx#, patient initials, etc."
                  : type === "Lost Med"
                    ? "Where/how was the medication lost? Witness name?"
                    : type === "Addition"
                      ? "Invoice or transfer reference."
                      : "Reason for subtraction."
              }
              rows={2}
              data-testid="input-adjustment-reason"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid || wouldGoNegative} data-testid="button-save-adjustment">
            Record adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bi-Annual count panel
// ─────────────────────────────────────────────────────────────────────────────

function BiAnnualPanel({ siteId, canEdit, performerName, performerRole, onChanged }: PanelProps) {
  const counts = getBiAnnualCounts(siteId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const period = currentBiAnnualPeriod();

  const active = activeId ? counts.find((c) => c.id === activeId) : null;
  const inProgress = counts.find((c) => !c.completedAt);

  if (active) {
    return (
      <BiAnnualEditor
        count={active}
        canEdit={canEdit && !active.completedAt}
        performerName={performerName}
        performerRole={performerRole}
        onClose={() => setActiveId(null)}
        onChanged={onChanged}
      />
    );
  }

  function startNewCount() {
    if (!canEdit) return;
    if (inProgress) {
      setActiveId(inProgress.id);
      return;
    }
    const inventory = getInventoryForSite(siteId);
    const stockedNdcs = new Set(inventory.map((i) => i.ndc));
    // Bi-annual must cover ALL C2-C5 prescription drugs:
    // start with the catalog (so untracked items show variance) and merge stocked-only items.
    const entries: BiAnnualCountEntry[] = CONTROLLED_DRUG_CATALOG.map((d) => {
      const stocked = inventory.find((i) => i.ndc === d.ndc);
      return {
        ndc: d.ndc,
        drugName: d.name,
        strength: d.strength,
        form: d.form,
        schedule: d.schedule,
        expectedCount: stocked?.currentCount ?? 0,
        actualCount: stocked?.currentCount ?? 0,
        variance: 0,
      };
    });
    // Append any stocked items not in the catalog (defensive — shouldn't normally happen).
    inventory
      .filter((i) => !CONTROLLED_DRUG_CATALOG.find((d) => d.ndc === i.ndc))
      .forEach((i) => {
        entries.push({
          ndc: i.ndc,
          drugName: i.drugName,
          strength: i.strength,
          form: i.form,
          schedule: i.schedule,
          expectedCount: i.currentCount,
          actualCount: i.currentCount,
          variance: 0,
        });
      });
    const id = `bia-${siteId}-${Date.now()}`;
    const fresh: BiAnnualCount = {
      id,
      siteId,
      startedAt: new Date().toISOString(),
      performedBy: performerName,
      performedByRole: performerRole,
      entries,
    };
    upsertBiAnnualCount(fresh);
    onChanged();
    setActiveId(id);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Biennial Controlled Substance Count
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Required physical count of every C-II–C-V drug. Current period: <strong>{period}</strong>.
            </p>
          </div>
          {canEdit && (
            <Button onClick={startNewCount} data-testid="button-start-biannual">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              {inProgress ? "Resume in-progress count" : "Start new count"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {counts.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No biennial counts on file for this store yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Performed by</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map((c) => {
                  const totalVar = c.entries.reduce((sum, e) => sum + e.variance, 0);
                  const hasVar = c.entries.some((e) => e.variance !== 0);
                  return (
                    <TableRow key={c.id} data-testid={`row-biannual-${c.id}`}>
                      <TableCell className="text-sm">{formatDateTime(c.startedAt)}</TableCell>
                      <TableCell className="text-sm">{c.completedAt ? formatDateTime(c.completedAt) : "—"}</TableCell>
                      <TableCell className="text-sm">{c.performedBy}</TableCell>
                      <TableCell>{c.entries.length}</TableCell>
                      <TableCell className={`text-right font-medium ${hasVar ? (totalVar < 0 ? "text-red-600" : "text-amber-600") : ""}`}>
                        {totalVar > 0 ? `+${totalVar}` : totalVar}
                      </TableCell>
                      <TableCell>
                        {c.completedAt ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Complete</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">In progress</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setActiveId(c.id)} data-testid={`button-open-biannual-${c.id}`}>
                            {c.completedAt ? "View" : "Resume"}
                          </Button>
                          {canEdit && !c.completedAt && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Discard count"
                              onClick={() => {
                                if (confirm("Discard this in-progress biennial count?")) {
                                  deleteBiAnnualCount(c.id);
                                  onChanged();
                                }
                              }}
                              data-testid={`button-discard-biannual-${c.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Bi-Annual editor (single count) ─────────────────────────────────────────

interface BiAnnualEditorProps {
  count: BiAnnualCount;
  canEdit: boolean;
  performerName: string;
  performerRole: string;
  onClose: () => void;
  onChanged: () => void;
}

function BiAnnualEditor({ count, canEdit, performerName, performerRole, onClose, onChanged }: BiAnnualEditorProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<BiAnnualCountEntry[]>(count.entries);
  const [witnessedBy, setWitnessedBy] = useState(count.witnessedBy ?? "");
  const [notes, setNotes] = useState(count.notes ?? "");
  const [filterSchedule, setFilterSchedule] = useState<DeaSchedule | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterSchedule !== "ALL" && e.schedule !== filterSchedule) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!e.drugName.toLowerCase().includes(q) && !e.ndc.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filterSchedule, search]);

  const totalItems = entries.length;
  const itemsWithVariance = entries.filter((e) => e.variance !== 0).length;
  const totalVariance = entries.reduce((sum, e) => sum + e.variance, 0);

  function updateActual(ndc: string, value: string) {
    const num = parseInt(value, 10);
    setEntries((prev) =>
      prev.map((e) =>
        e.ndc === ndc
          ? {
              ...e,
              actualCount: Number.isNaN(num) ? 0 : Math.max(0, num),
              variance: (Number.isNaN(num) ? 0 : Math.max(0, num)) - e.expectedCount,
            }
          : e,
      ),
    );
  }

  function persist(partial?: Partial<BiAnnualCount>) {
    upsertBiAnnualCount({
      ...count,
      entries,
      witnessedBy: witnessedBy.trim() || undefined,
      notes: notes.trim() || undefined,
      ...partial,
    });
  }

  function saveDraft() {
    persist();
    toast({ title: "Draft saved", description: "Biennial count saved as in-progress." });
    onChanged();
  }

  function complete() {
    if (!canEdit) return;
    if (!witnessedBy.trim()) {
      toast({
        title: "Witness required",
        description: "Enter the witnessing pharmacist's name before completing.",
        variant: "destructive",
      });
      return;
    }
    const now = new Date().toISOString();
    persist({ completedAt: now });
    // Reconcile perpetual inventory to actual counts and write a ledger entry per variance.
    entries.forEach((e) => {
      if (e.variance === 0) return;
      const existing = getInventoryItem(count.siteId, e.ndc);
      if (existing) {
        upsertInventoryItem({
          ...existing,
          currentCount: e.actualCount,
          lastAdjustedAt: now,
          lastAdjustedBy: performerName,
          lastAdjustedByRole: performerRole,
        });
      } else if (e.actualCount > 0) {
        upsertInventoryItem({
          id: makeInventoryId(count.siteId, e.ndc),
          siteId: count.siteId,
          ndc: e.ndc,
          drugName: e.drugName,
          strength: e.strength,
          form: e.form,
          schedule: e.schedule,
          currentCount: e.actualCount,
          lastAdjustedAt: now,
          lastAdjustedBy: performerName,
          lastAdjustedByRole: performerRole,
        });
      }
      appendAdjustment({
        id: `adj-bia-${count.id}-${e.ndc}`,
        siteId: count.siteId,
        ndc: e.ndc,
        drugName: e.drugName,
        type: e.variance > 0 ? "Addition" : "Subtraction",
        quantity: Math.abs(e.variance),
        countAfter: e.actualCount,
        reason: `Biennial count reconciliation (${count.id})`,
        performedBy: performerName,
        performedByRole: performerRole,
        performedAt: now,
      });
    });
    toast({ title: "Biennial count complete", description: "Inventory reconciled to physical count." });
    onChanged();
    onClose();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Biennial Count {count.completedAt ? "(Completed)" : "(In progress)"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Started {formatDateTime(count.startedAt)} by {count.performedBy}
              {count.completedAt ? ` · Completed ${formatDateTime(count.completedAt)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-back-biannual">
              Back
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={saveDraft} data-testid="button-save-draft-biannual">
                  Save draft
                </Button>
                <Button onClick={complete} data-testid="button-complete-biannual">
                  Complete & reconcile
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile label="Items in scope" value={String(totalItems)} />
          <SummaryTile label="Items with variance" value={String(itemsWithVariance)} tone={itemsWithVariance ? "warn" : undefined} />
          <SummaryTile label="Net variance" value={totalVariance > 0 ? `+${totalVariance}` : String(totalVariance)} tone={totalVariance === 0 ? undefined : totalVariance < 0 ? "danger" : "warn"} />
          <SummaryTile label="Schedules covered" value="II–V" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 w-[220px]"
              data-testid="input-biannual-search"
            />
          </div>
          <Select value={filterSchedule} onValueChange={(v) => setFilterSchedule(v as DeaSchedule | "ALL")}>
            <SelectTrigger className="w-[160px]" data-testid="select-schedule-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All schedules</SelectItem>
              <SelectItem value="C-II">C-II only</SelectItem>
              <SelectItem value="C-III">C-III only</SelectItem>
              <SelectItem value="C-IV">C-IV only</SelectItem>
              <SelectItem value="C-V">C-V only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">NDC</TableHead>
                <TableHead>Drug</TableHead>
                <TableHead className="w-[100px]">Strength</TableHead>
                <TableHead className="w-[80px]">Sched.</TableHead>
                <TableHead className="w-[110px] text-right">Expected</TableHead>
                <TableHead className="w-[140px] text-right">Actual</TableHead>
                <TableHead className="w-[110px] text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.ndc} data-testid={`row-biannual-entry-${e.ndc}`}>
                  <TableCell className="font-mono text-xs">{e.ndc}</TableCell>
                  <TableCell className="font-medium">
                    {e.drugName}
                    <div className="text-xs text-muted-foreground">{e.form}</div>
                  </TableCell>
                  <TableCell className="text-sm">{e.strength}</TableCell>
                  <TableCell><Badge className={scheduleBadgeColor(e.schedule)}>{e.schedule}</Badge></TableCell>
                  <TableCell className="text-right">{e.expectedCount}</TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <Input
                        type="number"
                        min={0}
                        value={String(e.actualCount)}
                        onChange={(ev) => updateActual(e.ndc, ev.target.value)}
                        className="w-20 ml-auto text-right"
                        data-testid={`input-actual-${e.ndc}`}
                      />
                    ) : (
                      <span>{e.actualCount}</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${e.variance < 0 ? "text-red-600" : e.variance > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {e.variance > 0 ? `+${e.variance}` : e.variance}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                    No items match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sign-off */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="witness">
              Witnessing pharmacist <span className="text-red-500">*</span>
            </label>
            <Input
              id="witness"
              value={witnessedBy}
              onChange={(e) => setWitnessedBy(e.target.value)}
              placeholder="Full name"
              disabled={!canEdit}
              data-testid="input-witness"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="notes">Notes</label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={!canEdit}
              placeholder="Discrepancy explanations, DEA Form 222 references, etc."
              data-testid="input-biannual-notes"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: "warn" | "danger" }) {
  const toneCls =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${toneCls}`}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Adjustment ledger panel
// ─────────────────────────────────────────────────────────────────────────────

function LedgerPanel({ siteId, canEdit, onChanged }: { siteId: string; canEdit: boolean; onChanged: () => void }) {
  const adjustments = getAdjustmentsForSite(siteId);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AdjustmentType | "ALL">("ALL");
  const [showAddNdc, setShowAddNdc] = useState(false);

  const filtered = useMemo(() => {
    return adjustments.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!a.drugName.toLowerCase().includes(q) && !a.ndc.includes(q) && !a.performedBy.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [adjustments, search, typeFilter]);

  function typeBadgeColor(t: AdjustmentType): string {
    switch (t) {
      case "Addition":    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "Subtraction": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "Dispensing":  return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
      case "Lost Med":    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Adjustment Ledger ({adjustments.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Read-only audit trail of every change to the perpetual inventory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 w-[220px]"
                data-testid="input-search-ledger"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AdjustmentType | "ALL")}>
              <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {ADJUSTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit && (
              <Button onClick={() => setShowAddNdc(true)} data-testid="button-add-new-ndc">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Add new NDC
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No adjustments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">When</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead className="w-[140px]">NDC</TableHead>
                  <TableHead className="w-[80px] text-right">Qty</TableHead>
                  <TableHead className="w-[100px] text-right">After</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id} data-testid={`row-ledger-${a.id}`}>
                    <TableCell className="text-xs">{formatDateTime(a.performedAt)}</TableCell>
                    <TableCell><Badge className={typeBadgeColor(a.type)}>{a.type}</Badge></TableCell>
                    <TableCell className="font-medium">{a.drugName}</TableCell>
                    <TableCell className="font-mono text-xs">{a.ndc}</TableCell>
                    <TableCell className="text-right">{a.type === "Addition" ? `+${a.quantity}` : `−${a.quantity}`}</TableCell>
                    <TableCell className="text-right font-medium">{a.countAfter}</TableCell>
                    <TableCell className="text-xs">{a.performedBy}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AddCustomNdcDialog
        open={showAddNdc}
        onOpenChange={setShowAddNdc}
        onSaved={() => {
          setShowAddNdc(false);
          onChanged();
        }}
      />
    </Card>
  );
}

// ── Add new NDC (custom catalog entry) dialog ───────────────────────────────

interface AddCustomNdcDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

function AddCustomNdcDialog({ open, onOpenChange, onSaved }: AddCustomNdcDialogProps) {
  const { toast } = useToast();
  const [ndc, setNdc] = useState("");
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [form, setForm] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [schedule, setSchedule] = useState<DeaSchedule>("C-II");
  const [submitting, setSubmitting] = useState(false);

  // Reset whenever the dialog re-opens.
  useEffect(() => {
    if (open) {
      setNdc("");
      setName("");
      setStrength("");
      setForm("");
      setPackageSize("");
      setManufacturer("");
      setSchedule("C-II");
      setSubmitting(false);
    }
  }, [open]);

  const ndcDigits = ndc.replace(/[^0-9]/g, "");
  const ndcValid = ndcDigits.length === 10 || ndcDigits.length === 11;
  const allValid =
    ndcValid &&
    name.trim().length > 0 &&
    strength.trim().length > 0 &&
    form.trim().length > 0 &&
    packageSize.trim().length > 0 &&
    manufacturer.trim().length > 0;

  function save() {
    if (!allValid || submitting) return;
    setSubmitting(true);
    try {
      const saved = addCustomControlledDrug({
        ndc,
        name,
        strength,
        form,
        packageSize,
        manufacturer,
        schedule,
      });
      toast({
        title: "NDC added to catalog",
        description: `${saved.name} (${saved.ndc}) is now searchable from Add NDC and the biennial count.`,
      });
      onSaved();
    } catch (err) {
      toast({
        title: "Could not add NDC",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Add new NDC to catalog
          </DialogTitle>
          <DialogDescription>
            Register a controlled-substance NDC that isn't in the built-in
            catalog. Once saved it can be searched from the perpetual inventory
            and is included in the next biennial count.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="new-ndc" className="text-xs font-medium text-muted-foreground">
              NDC <span className="text-red-500">*</span>
            </label>
            <Input
              id="new-ndc"
              value={ndc}
              onChange={(e) => setNdc(e.target.value)}
              placeholder="e.g. 00574-0820-01"
              data-testid="input-new-ndc"
              autoFocus
            />
            {ndc && !ndcValid && (
              <p className="text-xs text-red-600 mt-1">
                Enter a 10- or 11-digit NDC. Hyphens are optional.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="new-name" className="text-xs font-medium text-muted-foreground">
              Drug name <span className="text-red-500">*</span>
            </label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Oxycodone HCl"
              data-testid="input-new-drug-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-strength" className="text-xs font-medium text-muted-foreground">
                Strength <span className="text-red-500">*</span>
              </label>
              <Input
                id="new-strength"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 5 mg"
                data-testid="input-new-strength"
              />
            </div>
            <div>
              <label htmlFor="new-form" className="text-xs font-medium text-muted-foreground">
                Formulation <span className="text-red-500">*</span>
              </label>
              <Input
                id="new-form"
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder="e.g. Tablet, Injection"
                data-testid="input-new-form"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-pkg" className="text-xs font-medium text-muted-foreground">
                Package size <span className="text-red-500">*</span>
              </label>
              <Input
                id="new-pkg"
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                placeholder="e.g. 100 ct, 10 mL vial"
                data-testid="input-new-package-size"
              />
            </div>
            <div>
              <label htmlFor="new-mfr" className="text-xs font-medium text-muted-foreground">
                Manufacturer <span className="text-red-500">*</span>
              </label>
              <Input
                id="new-mfr"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Mallinckrodt"
                data-testid="input-new-manufacturer"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              DEA schedule <span className="text-red-500">*</span>
            </label>
            <Select value={schedule} onValueChange={(v) => setSchedule(v as DeaSchedule)}>
              <SelectTrigger data-testid="select-new-schedule">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C-II">C-II</SelectItem>
                <SelectItem value="C-III">C-III</SelectItem>
                <SelectItem value="C-IV">C-IV</SelectItem>
                <SelectItem value="C-V">C-V</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-new-ndc">
            Cancel
          </Button>
          <Button onClick={save} disabled={!allValid || submitting} data-testid="button-save-new-ndc">
            Save NDC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
