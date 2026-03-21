import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function KoheezLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Koheez<span className="text-[#22c55e]">.ai</span>
    </span>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isSignup = typeof window !== "undefined" && window.location.search.includes("tab=signup");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(isSignup ? "signup" : "signin");

  useEffect(() => {
    const signup = window.location.search.includes("tab=signup");
    setActiveTab(signup ? "signup" : "signin");
  }, [location]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }) =>
      apiRequest("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/app");
    },
    onError: (err: any) => {
      const msg = err?.message ?? "";
      const extracted = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : "";
      try {
        const parsed = JSON.parse(extracted);
        setError(parsed?.error || "Invalid email or password.");
      } catch {
        setError("Invalid email or password.");
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) =>
      apiRequest("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/app");
    },
    onError: (err: any) => {
      const msg = err?.message ?? "";
      const extracted = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : "";
      try {
        const parsed = JSON.parse(extracted);
        setError(parsed?.error || "Could not create account.");
      } catch {
        setError("Could not create account.");
      }
    },
  });

  const isPending = loginMutation.isPending || signupMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (activeTab === "signin") {
      loginMutation.mutate({ email, password });
    } else {
      signupMutation.mutate({ email, password, name });
    }
  }

  function switchTab(tab: "signin" | "signup") {
    setActiveTab(tab);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  }

  return (
    <div className="min-h-screen bg-[#080c1a] flex flex-col">
      {/* Top nav */}
      <header className="px-6 h-16 flex items-center border-b border-white/10">
        <Link href="/">
          <KoheezLogo className="text-xl text-white cursor-pointer" />
        </Link>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo mark */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-[#22c55e]/10 border border-[#22c55e]/30 mb-4">
              <Activity className="w-6 h-6 text-[#22c55e]" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {activeTab === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {activeTab === "signin"
                ? "Sign in to your Koheez.ai account"
                : "Start your clinical intelligence journey"}
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-md overflow-hidden">
            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-white/[0.08]">
              <button
                data-testid="tab-signin"
                onClick={() => switchTab("signin")}
                className={`py-3.5 text-sm font-medium transition-colors ${
                  activeTab === "signin"
                    ? "text-white bg-white/[0.06] border-b-2 border-[#22c55e]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign in
              </button>
              <button
                data-testid="tab-signup"
                onClick={() => switchTab("signup")}
                className={`py-3.5 text-sm font-medium transition-colors ${
                  activeTab === "signup"
                    ? "text-white bg-white/[0.06] border-b-2 border-[#22c55e]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === "signup" && (
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    data-testid="input-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    className="w-full px-3.5 py-2.5 rounded-md bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/40 transition-colors"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide"
                >
                  Email address
                </label>
                <input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-md bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/40 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide"
                >
                  Password
                </label>
                <input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  autoComplete={activeTab === "signin" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-md bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-[#22c55e]/60 focus:ring-1 focus:ring-[#22c55e]/40 transition-colors"
                />
              </div>

              {error && (
                <p data-testid="auth-error" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <button
                type="submit"
                data-testid="btn-submit-auth"
                disabled={isPending}
                className="w-full py-3 text-sm font-semibold bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors mt-2"
              >
                {isPending
                  ? activeTab === "signin"
                    ? "Signing in…"
                    : "Creating account…"
                  : activeTab === "signin"
                  ? "Sign in"
                  : "Create account"}
              </button>

              {activeTab === "signin" && (
                <p className="text-center text-xs text-slate-500 pt-1">
                  Test login:{" "}
                  <button
                    type="button"
                    data-testid="btn-autofill-demo"
                    className="text-[#22c55e] hover:underline font-medium"
                    onClick={() => {
                      setEmail("test@koheez.ai");
                      setPassword("Koheez1");
                    }}
                  >
                    test@koheez.ai
                  </button>
                </p>
              )}
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            <Link href="/">
              <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                Back to home
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
