import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  saveCustomTask,
  type CustomTask,
  type CustomTaskScope,
} from "@/lib/taskStorage";
import type { PharmacyTask, TaskFrequency, TaskRole, TaskCategory } from "@/lib/taskData";
import { STORE_REGIONS } from "@/lib/storeDirectory";
import { getRPDsByRegion, getStoreStaff } from "@/lib/userProfile";
import type { UserRole } from "@/lib/userProfile";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Generic placeholder names that should be treated as fallbacks, not real assignees
const GENERIC_ROLE_NAMES = new Set([
  "Regional Pharmacy Director",
  "Pharmacy Director",
  "CPO",
  "Chief Pharmacy Officer",
]);

// Return named people; fall back to the full list if none have real names
function namedPeople<T extends { name: string }>(people: T[]): T[] {
  const named = people.filter((p) => !GENERIC_ROLE_NAMES.has(p.name));
  return named.length > 0 ? named : people;
}

// Short role label for display in the dropdown
function roleShortLabel(role: UserRole): string {
  if (role === "pharmacy_director") return "PD";
  if (role === "pharmacist_1" || role === "pharmacist_2") return "Pharmacist";
  return "Tech";
}

// Map a UserRole to the TaskRole used for task visibility
function userRoleToTaskRole(role: UserRole): TaskRole {
  if (role === "pharmacy_director") return "director";
  if (role === "pharmacist_1") return "pharmacist_1";
  if (role === "pharmacist_2") return "pharmacist_2";
  if (role === "pv2_tech") return "pv2_tech";
  if (role === "delivery_tech") return "delivery_tech";
  if (role === "data_entry_tech") return "data_entry_tech";
  return "all_staff";
}

// Role mapping for site-scope group options
const STORE_GROUP_ROLES: Record<string, TaskRole> = {
  "All Pharmacists": "pharmacist_1",
  "All Techs":       "data_entry_tech",
  "All Staff":       "all_staff",
};

// ── Schema ────────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Max 120 characters"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "one_time"] as const),
  role: z.enum(["data_entry_tech", "pv2_tech", "delivery_tech", "pharmacist_1", "pharmacist_2", "director", "all_staff"] as const),
  category: z.enum(["operations", "achc", "state_board", "retention"] as const),
  taskGroup: z.string(),
  scope: z.enum(["site", "regional", "national"] as const),
  selectedRegion: z.string().optional(),
  selectedStore: z.string().optional(),
  assignedToLabel: z.string().optional(),
  dueDate: z.string().optional(),
});

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

// ── Assignee role groups ──────────────────────────────────────────────────────
// Fixed options the task creator can assign to — independent of who is in the PROFILE_MAP.
const ASSIGNEE_GROUPS: { value: string; label: string; role: TaskRole }[] = [
  { value: "All Pharmacy Directors", label: "All Pharmacy Directors", role: "director" },
  { value: "All RPDs",               label: "All RPDs",               role: "director" },
  { value: "All Technicians",        label: "All Technicians",        role: "all_staff" },
  { value: "PDs + RPDs",             label: "PDs + RPDs",             role: "director" },
  { value: "PDs + Technicians",      label: "PDs + Technicians",      role: "all_staff" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateTaskModal({
  open,
  siteId,
  profile,
  onClose,
  onCreated,
  isCpo,
  isRegional,
  userRegion,
  hasSiteContext,
  availableRegions,
}: {
  open: boolean;
  siteId: string;
  profile: { email: string; name: string; role: string };
  onClose: () => void;
  onCreated: (task: PharmacyTask) => void;
  isCpo: boolean;
  isRegional: boolean;
  userRegion?: string;
  hasSiteContext: boolean;
  availableRegions: string[];
}) {
  const showScopeSelector = isCpo || isRegional;
  const defaultScope: CustomTaskScope = isCpo ? "national" : isRegional ? "regional" : "site";

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: "daily",
      role: "director",
      category: "operations",
      taskGroup: "Custom Tasks",
      scope: defaultScope,
      selectedRegion: userRegion ?? "",
      selectedStore: "",
      assignedToLabel: "",
      dueDate: "",
    },
  });

  const watchScope = form.watch("scope");
  const watchRegion = form.watch("selectedRegion");
  const watchStore = form.watch("selectedStore");
  const watchFrequency = form.watch("frequency");

  // Assignee — tracks the selected assignee label (group name for national, person name for others)
  const [assigneeValue, setAssigneeValue] = useState<string>(() => {
    if (defaultScope === "national") return ASSIGNEE_GROUPS[0].value;
    if (defaultScope === "regional" && userRegion) {
      const rpds = namedPeople(getRPDsByRegion(userRegion));
      return rpds[0]?.name ?? "";
    }
    return "";
  });

  const handleScopeChange = (v: CustomTaskScope) => {
    form.setValue("scope", v);
    form.setValue("selectedStore", "");
    if (v === "national") {
      setAssigneeValue(ASSIGNEE_GROUPS[0].value);
    } else if (v === "regional") {
      const region = userRegion ?? availableRegions[0] ?? "";
      form.setValue("selectedRegion", region);
      if (region) {
        const rpds = namedPeople(getRPDsByRegion(region));
        setAssigneeValue(rpds[0]?.name ?? "");
      } else {
        setAssigneeValue("");
      }
    } else {
      // site — wait for user to pick a store
      setAssigneeValue("");
    }
  };

  // Sentinel value used when "All Stores" is selected in the store picker
  const ALL_STORES_SENTINEL = "_ALL_STORES_";

  // Label shown for the "All Stores" option depending on who's creating the task
  const allStoresLabel = isCpo ? "All Stores" : `All ${userRegion ?? ""} Stores`;

  // Scope-aware assignee options:
  //   National  → 5 role-group options from ASSIGNEE_GROUPS
  //   Regional  → specific RPD(s) for selected region
  //   Site      → named director(s) at that store (if any) + "All Staff" always
  const assigneeOptions: { label: string; value: string }[] = (() => {
    if (watchScope === "national") {
      return ASSIGNEE_GROUPS.map((g) => ({ label: g.label, value: g.value }));
    }
    if (watchScope === "regional" && watchRegion) {
      const rpds = namedPeople(getRPDsByRegion(watchRegion));
      return rpds.length > 0
        ? rpds.map((p) => ({ label: p.name, value: p.name }))
        : [{ label: "Regional Pharmacy Director", value: "Regional Pharmacy Director" }];
    }
    if (watchScope === "site" && watchStore) {
      const groupOptions = [
        { label: "All Pharmacists", value: "All Pharmacists" },
        { label: "All Techs",       value: "All Techs" },
        { label: "All Staff",       value: "All Staff" },
      ];
      // "All Stores" sentinel — no individual people, just groups
      if (watchStore === ALL_STORES_SENTINEL) return groupOptions;
      // Specific store — named individuals first, then groups
      const staff = getStoreStaff(watchStore);
      const individualOptions = staff.map((p) => ({
        label: `${p.name} — ${roleShortLabel(p.role)}`,
        value: p.name,
      }));
      return [...individualOptions, ...groupOptions];
    }
    return [];
  })();

  // Combobox open state for store picker
  const [storePickerOpen, setStorePickerOpen] = useState(false);

  // Stores available to pick from:
  //   CPO    → all stores nationwide, alphabetized
  //   RPD    → only stores in their region, alphabetized
  // An "All Stores" entry is prepended so you can target the full scope at once.
  const storesForPicker = (() => {
    const allStoresEntry = { id: ALL_STORES_SENTINEL, name: allStoresLabel, region: userRegion ?? "all" };
    if (isCpo) {
      const all = STORE_REGIONS.flatMap((r) =>
        r.stores.map((s) => ({ ...s, region: r.region }))
      ).sort((a, b) => a.name.localeCompare(b.name));
      return [allStoresEntry, ...all];
    }
    if (userRegion) {
      const reg = STORE_REGIONS.find((r) => r.region === userRegion);
      const regional = [...(reg?.stores ?? [])].map((s) => ({ ...s, region: userRegion }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return [allStoresEntry, ...regional];
    }
    return [];
  })();


  function handleSubmit(values: CreateTaskFormValues) {
    // Require a store when scope is site
    if (values.scope === "site" && !values.selectedStore) {
      form.setError("selectedStore", { message: "Please select a store" });
      return;
    }
    // Require a region when scope is regional and user is CPO
    if (values.scope === "regional" && isCpo && !values.selectedRegion) {
      form.setError("selectedRegion", { message: "Please select a region" });
      return;
    }

    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const roleAbbr =
      profile.role === "chief_pharmacy_officer" ? "CPO"
      : profile.role === "regional_pharmacy_director" ? "RPD"
      : "PD";

    const scope: CustomTaskScope = values.scope ?? "site";

    // Determine siteId for storage
    const isAllStores = values.selectedStore === ALL_STORES_SENTINEL;
    const storageSiteId =
      scope === "national" ? "NATIONAL"
      : scope === "regional" ? `REGION:${values.selectedRegion ?? userRegion ?? ""}`
      : scope === "site" && isAllStores
        ? (isCpo ? "NATIONAL" : `REGION:${userRegion ?? ""}`)
      : scope === "site" && values.selectedStore ? values.selectedStore
      : siteId;

    // Derive task role from assignee selection
    let taskRole: TaskRole = "director";
    if (scope === "national") {
      const group = ASSIGNEE_GROUPS.find((g) => g.value === assigneeValue);
      taskRole = group?.role ?? "director";
    } else if (scope === "site") {
      if (STORE_GROUP_ROLES[assigneeValue]) {
        // Group option (All Pharmacists / All Techs / All Staff)
        taskRole = STORE_GROUP_ROLES[assigneeValue];
      } else {
        // Individual named person — look up their role
        const member = getStoreStaff(values.selectedStore ?? siteId).find(
          (p) => p.name === assigneeValue
        );
        taskRole = member ? userRoleToTaskRole(member.role) : "all_staff";
      }
    }
    // Regional scope always stays "director" (RPD)

    const customTask: CustomTask = {
      id,
      siteId: storageSiteId,
      scope,
      region: scope === "regional" ? (values.selectedRegion ?? userRegion ?? "") : undefined,
      selectedStore: scope === "site" ? (values.selectedStore || siteId) : undefined,
      title: values.title,
      description: values.description || undefined,
      role: taskRole,
      assignedToLabel: assigneeValue || "All Pharmacy Directors",
      frequency: values.frequency,
      category: values.category,
      taskGroup: values.taskGroup || "Custom Tasks",
      createdBy: `${profile.name} ${roleAbbr}`,
      createdByRole: profile.role,
      createdAt: new Date().toISOString(),
      dueDate: values.dueDate || undefined,
    };
    saveCustomTask(customTask);
    const asPharmacyTask: PharmacyTask = { ...customTask, isCustom: true };
    onCreated(asPharmacyTask);
    form.reset({ ...form.formState.defaultValues, scope: defaultScope, selectedRegion: userRegion ?? "" });
    // Reset assignee to sensible default for this user's default scope
    if (defaultScope === "national") {
      setAssigneeValue(ASSIGNEE_GROUPS[0].value);
    } else if (defaultScope === "regional" && userRegion) {
      const rpds = namedPeople(getRPDsByRegion(userRegion));
      setAssigneeValue(rpds[0]?.name ?? "");
    } else {
      setAssigneeValue("");
    }
    onClose();
  }

  // Scope button definitions
  const scopeOptions: { value: CustomTaskScope; label: string; desc: string }[] = isCpo
    ? [
        { value: "national", label: "Nationwide", desc: "All stores nationwide" },
        { value: "regional", label: "Region", desc: "All stores in a region" },
        { value: "site", label: "Store", desc: "A specific pharmacy" },
      ]
    : [
        { value: "regional", label: "Entire Region", desc: userRegion ? `All ${userRegion} stores` : "All region stores" },
        { value: "site", label: "Specific Store", desc: "One pharmacy in your region" },
      ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            Create Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

          {/* ── Scope selector ───────────────────────────────────────── */}
          {showScopeSelector && (
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <div className={`grid gap-2 ${scopeOptions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {scopeOptions.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    data-testid={`scope-btn-${s.value}`}
                    onClick={() => handleScopeChange(s.value)}
                    className={`px-3 py-2.5 rounded-md border text-left transition-all ${
                      watchScope === s.value
                        ? "border-purple-400 bg-purple-50 text-purple-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-xs font-bold">{s.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-70">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Region picker (Regional scope, CPO only) ─────────────── */}
          {watchScope === "regional" && isCpo && availableRegions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select
                value={form.watch("selectedRegion") ?? ""}
                onValueChange={(v) => {
                  form.setValue("selectedRegion", v);
                  const rpds = namedPeople(getRPDsByRegion(v));
                  setAssigneeValue(rpds[0]?.name ?? "");
                }}
              >
                <SelectTrigger data-testid="select-task-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {availableRegions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── RPD: show locked region label ────────────────────────── */}
          {watchScope === "regional" && !isCpo && userRegion && (
            <div className="space-y-1.5">
              <Label>Region</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                {userRegion}
              </div>
            </div>
          )}

          {/* ── Store picker (Store scope) — searchable combobox ────── */}
          {watchScope === "site" && storesForPicker.length > 0 && (
            <div className="space-y-1.5">
              <Label>Store</Label>
              <Popover open={storePickerOpen} onOpenChange={setStorePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={storePickerOpen}
                    data-testid="select-task-store"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {watchStore === ALL_STORES_SENTINEL
                        ? allStoresLabel
                        : watchStore
                          ? (storesForPicker.find((s) => s.id === watchStore)?.name ?? watchStore)
                          : "Select a pharmacy"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search pharmacy..." />
                    <CommandList>
                      <CommandEmpty>No pharmacy found.</CommandEmpty>
                      {/* "All Stores" shortcut — visually separated from individual stores */}
                      <CommandGroup>
                        <CommandItem
                          key={ALL_STORES_SENTINEL}
                          value={allStoresLabel}
                          onSelect={() => {
                            form.setValue("selectedStore", ALL_STORES_SENTINEL);
                            setAssigneeValue("All Staff");
                            setStorePickerOpen(false);
                          }}
                          className="font-medium text-purple-700"
                        >
                          <Check className={cn("mr-2 h-4 w-4", watchStore === ALL_STORES_SENTINEL ? "opacity-100" : "opacity-0")} />
                          {allStoresLabel}
                        </CommandItem>
                      </CommandGroup>
                      {/* Individual stores */}
                      <CommandGroup heading="Specific Store">
                        {storesForPicker.slice(1).map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={() => {
                              form.setValue("selectedStore", s.id);
                              const staff = getStoreStaff(s.id);
                              setAssigneeValue(staff[0]?.name ?? "All Staff");
                              setStorePickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", watchStore === s.id ? "opacity-100" : "opacity-0")}
                            />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {watchScope === "site" && !watchStore && form.formState.isSubmitted && (
                <p className="text-xs text-red-600">Please select a store</p>
              )}
            </div>
          )}

          {/* ── Title ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="ct-title"
              data-testid="input-create-task-title"
              placeholder="e.g. Review daily log sheet"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* ── Description ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-desc">Description <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
            <Textarea
              id="ct-desc"
              data-testid="input-create-task-description"
              placeholder="Brief instructions or context..."
              rows={2}
              className="resize-none text-sm"
              {...form.register("description")}
            />
          </div>

          {/* ── Frequency + Assigned To ──────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={form.watch("frequency")}
                onValueChange={(v) => form.setValue("frequency", v as TaskFrequency)}
              >
                <SelectTrigger data-testid="select-create-task-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-Time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              {assigneeOptions.length > 0 ? (
                <Select
                  value={assigneeValue}
                  onValueChange={(v) => setAssigneeValue(v)}
                >
                  <SelectTrigger data-testid="select-create-task-assignee">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {assigneeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center px-3 h-9 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-400">
                  {watchScope === "site" ? "Select a store first" : "Select a region first"}
                </div>
              )}
            </div>
          </div>

          {/* ── Due Date ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-due">
              Due Date
              {watchFrequency !== "one_time" && (
                <span className="text-slate-400 font-normal text-xs ml-1">(optional)</span>
              )}
            </Label>
            <Input
              id="ct-due"
              type="date"
              data-testid="input-create-task-due-date"
              className="text-sm"
              {...form.register("dueDate")}
            />
          </div>

          {/* ── Category + Task Group ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.watch("category")}
                onValueChange={(v) => form.setValue("category", v as TaskCategory)}
              >
                <SelectTrigger data-testid="select-create-task-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="achc">ACHC Compliance</SelectItem>
                  <SelectItem value="state_board">State Board</SelectItem>
                  <SelectItem value="retention">Retention</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-group">Task Group</Label>
              <Input
                id="ct-group"
                data-testid="input-create-task-group"
                placeholder="Custom Tasks"
                {...form.register("taskGroup")}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" data-testid="button-create-task-submit">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
