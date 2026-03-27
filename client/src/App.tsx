import type { ReactNode } from "react";
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
import NotFound from "@/pages/not-found";
import { ClinicalToolsPanel } from "@/components/ClinicalToolsPanel";
import { Activity, HeartHandshake, LogOut, LayoutDashboard, ClipboardList } from "lucide-react";

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

// ── App nav ────────────────────────────────────────────────────────────────
function NavLink({ href, children, testId }: { href: string; children: ReactNode; testId: string }) {
  const [location] = useLocation();
  const active = location === href || (href !== "/app" && location.startsWith(href));
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-purple-50 text-purple-700"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      data-testid={testId}
    >
      {children}
    </Link>
  );
}

function AppNav() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link href="/app">
            <span className="font-bold text-sm tracking-tight cursor-pointer">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: LOGO_GRADIENT }}
              >
                Koheez.ai
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 flex-wrap">
            <NavLink href="/app" testId="nav-dashboard">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </NavLink>
            <NavLink href="/app/assessment" testId="nav-assessment">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">HIV/PrEP</span>
              <span className="sm:hidden">Assess</span>
            </NavLink>
            <NavLink href="/app/tasks" testId="nav-tasks">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Tasks</span>
            </NavLink>
            <NavLink href="/app/patient-assistance" testId="nav-assistance">
              <HeartHandshake className="w-4 h-4" />
              <span className="hidden sm:inline">Patient Assistance</span>
              <span className="sm:hidden">Assistance</span>
            </NavLink>
            <ClinicalToolsPanel />
            <button
              data-testid="btn-logout"
              onClick={() => logoutMutation.mutate()}
              title={user?.email ?? "Sign out"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
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
      <Route path="/app/tasks">
        <Protected component={TaskManager} />
      </Route>
      <Route path="/app/clinical-tools">
        <Protected component={ClinicalTools} />
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
