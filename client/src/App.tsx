import type { ReactNode } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AssessmentForm from "@/pages/AssessmentForm";
import PatientAssistance from "@/pages/PatientAssistance";
import NotFound from "@/pages/not-found";
import { Activity, HeartHandshake } from "lucide-react";

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

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm hidden sm:block">HIV Treatment Assessor</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink href="/" testId="nav-assessment">
              <Activity className="w-4 h-4" />
              Clinical Assessment
            </NavLink>
            <NavLink href="/patient-assistance" testId="nav-assistance">
              <HeartHandshake className="w-4 h-4" />
              Patient Assistance
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AssessmentForm} />
      <Route path="/patient-assistance" component={PatientAssistance} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Nav />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
