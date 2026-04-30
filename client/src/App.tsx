import { useState, type ReactNode, type ComponentType } from "react";
import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient as qc, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AssessmentForm from "@/pages/AssessmentForm";
import PatientAssistance from "@/pages/PatientAssistance";
import ClinicalTools from "@/pages/ClinicalTools";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import TaskManager from "@/pages/TaskManager";
import RegionalDashboard from "@/pages/RegionalDashboard";
import CategoryReport from "@/pages/CategoryReport";
import AchcWorkbook from "@/pages/AchcWorkbook";
import CQIMeeting from "@/pages/CQIMeeting";
import StoreDashboard from "@/pages/StoreDashboard";
import TaskTracker from "@/pages/TaskTracker";
import SchedulingPage from "@/pages/SchedulingPage";
import ControlledInventory from "@/pages/ControlledInventory";
import NotFound from "@/pages/not-found";
import { ClinicalToolsPanel } from "@/components/ClinicalToolsPanel";
import { getUserProfile, isRegionalOrAbove, isTechRole, isDirectorRole, isCPO } from "@/lib/userProfile";
import { Activity, HeartHandshake, LogOut, LayoutDashboard, ClipboardList, Globe, BookCheck, ClipboardCheck, Menu, X, Wrench, ListChecks, CalendarDays, Bell, ShieldCheck } from "lucide-react";
import type { AppNotification } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const LOGO_GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)";

// ── Auth hook ──────────────────────────────────────────────────────────────
export function useAuth() {
  const { data, isLoading } = useQuery<{ user: { email: string; name: string } } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Auth check failed");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!(data?.user),
  };
}

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Notifications bell ────────────────────────────────────────────────────
function NotificationsBell() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const qClient = useQueryClient();

  const { data: notifications } = useQuery<AppNotification[]>({
    queryKey: ["/api/notifications"],
    enabled: isAuthenticated,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const list = notifications ?? [];
  const unread = list.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiRequest(`/api/notifications/read-all`, { method: "POST" }),
    onSuccess: () => qClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  if (!isAuthenticated) return null;

  const formatRel = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.round(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="btn-notifications"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span
              data-testid="badge-notifications-unread"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold inline-flex items-center justify-center"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0" data-testid="popover-notifications">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && (
            <button
              type="button"
              data-testid="btn-mark-all-read"
              onClick={() => markAll.mutate()}
              className="text-xs text-purple-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {list.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
              You're all caught up.
            </div>
          ) : (
            list.map((n) => (
              <button
                key={n.id}
                type="button"
                data-testid={`row-notification-${n.id}`}
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                  if (n.link) {
                    setOpen(false);
                    setLocation(n.link);
                  }
                }}
                className={`w-full text-left px-3 py-2.5 border-b hover-elevate ${n.read ? "" : "bg-purple-50/40"}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />}
                  <div className={`flex-1 min-w-0 ${n.read ? "" : ""}`}>
                    <div className="text-xs font-medium truncate">{n.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">{n.body}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatRel(n.createdAt)}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── App nav ────────────────────────────────────────────────────────────────
function NavMenuItem({
  href,
  icon: Icon,
  label,
  testId,
  onClick,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  testId: string;
  onClick?: () => void;
}) {
  const [location] = useLocation();
  const active = location === href || (href !== "/app" && location.startsWith(href));
  return (
    <Link
      href={href}
      data-testid={testId}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-purple-50 text-purple-700"
          : "text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );
}

function AppNav() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clinicalOpen, setClinicalOpen] = useState(false);

  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;
  const isRegional = profile ? isRegionalOrAbove(profile.role) : false;
  const isCpoUser = profile ? isCPO(profile.role) : false;
  const showWorkbook = profile ? !isTechRole(profile.role) : false;
  const showCQI = profile ? isDirectorRole(profile.role) : false;

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href={isCpoUser ? "/app/tasks/national" : isRegional ? "/app/tasks/regional" : "/app"} onClick={close}>
              <span className="font-bold text-sm tracking-tight cursor-pointer">
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: LOGO_GRADIENT }}
                >
                  Koheez.ai
                </span>
              </span>
            </Link>

            {/* Right side: notifications + hamburger + logout */}
            <div className="flex items-center gap-1">
              <NotificationsBell />
              <button
                data-testid="btn-logout"
                onClick={() => logoutMutation.mutate()}
                title={user?.email ?? "Sign out"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>

              <button
                data-testid="btn-menu-toggle"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={open}
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dropdown nav panel */}
      {open && (
        <div
          className="fixed top-14 inset-x-0 sm:inset-x-auto sm:right-0 sm:w-72 z-40 bg-background border-b sm:border-l border-border shadow-lg sm:rounded-bl-lg"
          data-testid="nav-dropdown-menu"
        >
          <nav className="p-2 space-y-0.5">
            {isCpoUser ? (
              <NavMenuItem href="/app/tasks/national" icon={Globe} label="National Dashboard" testId="nav-national" onClick={close} />
            ) : isRegional ? (
              <NavMenuItem href="/app/tasks/regional" icon={Globe} label="Regional Dashboard" testId="nav-regional" onClick={close} />
            ) : (
              <NavMenuItem href="/app" icon={LayoutDashboard} label="Dashboard" testId="nav-dashboard" onClick={close} />
            )}

            <NavMenuItem href="/app/assessment" icon={Activity} label="HIV/PrEP Assessor" testId="nav-assessment" onClick={close} />
            <NavMenuItem href="/app/tasks" icon={ClipboardList} label="Tasks" testId="nav-tasks" onClick={close} />

            {isRegional && (
              <NavMenuItem href="/app/task-tracker" icon={ListChecks} label="Task Tracker" testId="nav-task-tracker" onClick={close} />
            )}

            {showWorkbook && (
              <NavMenuItem href="/app/achc-workbook" icon={BookCheck} label="ACHC Workbook" testId="nav-achc-workbook" onClick={close} />
            )}

            {showCQI && (
              <NavMenuItem href="/app/cqi-meeting" icon={ClipboardCheck} label="CQI Meeting" testId="nav-cqi-meeting" onClick={close} />
            )}

            <NavMenuItem href="/app/scheduling" icon={CalendarDays} label="Team Scheduling" testId="nav-scheduling" onClick={close} />

            <NavMenuItem href="/app/controlled-inventory" icon={ShieldCheck} label="Controlled Inv Mgmt" testId="nav-controlled-inventory" onClick={close} />

            <NavMenuItem href="/app/patient-assistance" icon={HeartHandshake} label="Patient Assistance" testId="nav-assistance" onClick={close} />

            <button
              data-testid="button-clinical-tools-nav"
              onClick={() => { close(); setClinicalOpen(true); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors text-foreground hover:bg-muted"
            >
              <Wrench className="w-4 h-4 shrink-0" />
              <span>Clinical Tools</span>
            </button>
          </nav>
        </div>
      )}

      {/* Backdrop to close menu */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Clinical tools panel — always mounted so the sheet animates correctly */}
      <ClinicalToolsPanel navMode open={clinicalOpen} onOpenChange={setClinicalOpen} />
    </>
  );
}

// ── Protected page wrapper ─────────────────────────────────────────────────
function Protected({ component: Component }: { component: () => JSX.Element | null }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return (
    <>
      <AppNav />
      <Component />
    </>
  );
}

// ── RegionalProtected: role-gated wrapper for /app/tasks/regional ──────────
function RegionalProtected({ component: Component }: { component: () => JSX.Element | null }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user) {
    const profile = getUserProfile(user.email, user.name ?? "");
    if (!isRegionalOrAbove(profile.role)) return <Redirect to="/app/tasks" />;
  }
  return (
    <>
      <AppNav />
      <Component />
    </>
  );
}

// ── DirectorProtected: allows pharmacy_director and above ───────────────────
function DirectorProtected({ component: Component }: { component: () => JSX.Element | null }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user) {
    const profile = getUserProfile(user.email, user.name ?? "");
    if (!isDirectorRole(profile.role)) return <Redirect to="/app/tasks" />;
  }
  return (
    <>
      <AppNav />
      <Component />
    </>
  );
}

// ── Main router ────────────────────────────────────────────────────────────
function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login">
        {isLoading ? <Spinner /> : isAuthenticated ? <Redirect to="/app" /> : <LoginPage />}
      </Route>
      <Route path="/app">
        <Protected component={DashboardPage} />
      </Route>
      <Route path="/app/assessment">
        <Protected component={AssessmentForm} />
      </Route>
      <Route path="/app/patient-assistance">
        <Protected component={PatientAssistance} />
      </Route>
      {/* Regional dashboard — role-gated; must appear before /app/tasks */}
      <Route path="/app/tasks/regional">
        <RegionalProtected component={RegionalDashboard} />
      </Route>
      {/* National dashboard — CPO view of all regions */}
      <Route path="/app/tasks/national">
        <RegionalProtected component={RegionalDashboard} />
      </Route>
      {/* Category report — regional director only */}
      <Route path="/app/category-report">
        <RegionalProtected component={CategoryReport} />
      </Route>
      {/* Task Tracker — CPO & RPD only */}
      <Route path="/app/task-tracker">
        <RegionalProtected component={TaskTracker} />
      </Route>
      <Route path="/app/tasks">
        <Protected component={TaskManager} />
      </Route>
      <Route path="/app/clinical-tools">
        <Protected component={ClinicalTools} />
      </Route>
      <Route path="/app/achc-workbook">
        <Protected component={AchcWorkbook} />
      </Route>
      <Route path="/app/cqi-meeting">
        <Protected component={CQIMeeting} />
      </Route>
      {/* Store Performance Dashboard — director and above only */}
      <Route path="/app/store/:siteId">
        <DirectorProtected component={StoreDashboard} />
      </Route>
      {/* Team Scheduling — directors edit, all authenticated staff view (own site) */}
      <Route path="/app/scheduling">
        <Protected component={SchedulingPage} />
      </Route>
      {/* Controlled Inventory Management — view by all authenticated; pharmacist-only writes */}
      <Route path="/app/controlled-inventory">
        <Protected component={ControlledInventory} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
