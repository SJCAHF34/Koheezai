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
import NotFound from "@/pages/not-found";
import { ClinicalToolsPanel } from "@/components/ClinicalToolsPanel";
import { Activity, HeartHandshake, LogOut } from "lucide-react";

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
  const active = location === href;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
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
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm hidden sm:block">
              Koheez<span className="text-[#22c55e]">.ai</span>
            </span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            <NavLink href="/app" testId="nav-assessment">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Clinical Assessment</span>
              <span className="sm:hidden">Assessment</span>
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
function Protected({ component: Component }: { component: () => JSX.Element }) {
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
        <Protected component={AssessmentForm} />
      </Route>
      <Route path="/app/patient-assistance">
        <Protected component={PatientAssistance} />
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
