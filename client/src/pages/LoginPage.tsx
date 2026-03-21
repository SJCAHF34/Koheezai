import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Activity } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const GRADIENT = "linear-gradient(90deg, #9333ea, #3b82f6, #ef4444, #facc15)";

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-clip-text text-transparent" style={{ backgroundImage: GRADIENT }}>
      {children}
    </span>
  );
}

function KoheezLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <GradientText>Koheez.ai</GradientText>
    </span>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const queryClient = useQueryClient();

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
      apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      }),
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
      apiRequest("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top nav */}
      <header className="px-6 h-16 flex items-center border-b border-slate-200">
        <Link href="/">
          <KoheezLogo className="text-xl cursor-pointer" />
        </Link>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Logo mark */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-md mb-4"
              style={{ backgroundImage: "linear-gradient(135deg, #f3e8ff, #dbeafe)" }}
            >
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === "signin"
                ? "Sign in to your Koheez.ai account"
                : "Start your clinical intelligence journey"}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-200">
              <button
                data-testid="tab-signin"
                onClick={() => switchTab("signin")}
                className={`py-3.5 text-sm font-medium transition-colors ${
                  activeTab === "signin"
                    ? "text-slate-900 bg-white border-b-2 border-purple-500"
                    : "text-slate-400 hover:text-slate-700 bg-slate-50"
                }`}
              >
                Sign in
              </button>
              <button
                data-testid="tab-signup"
                onClick={() => switchTab("signup")}
                className={`py-3.5 text-sm font-medium transition-colors ${
                  activeTab === "signup"
                    ? "text-slate-900 bg-white border-b-2 border-purple-500"
                    : "text-slate-400 hover:text-slate-700 bg-slate-50"
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
                    className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide"
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
                    className="w-full px-3.5 py-2.5 rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300 transition-colors"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide"
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
                  className="w-full px-3.5 py-2.5 rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide"
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
                  className="w-full px-3.5 py-2.5 rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300 transition-colors"
                />
              </div>

              {error && (
                <p data-testid="auth-error" className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <button
                type="submit"
                data-testid="btn-submit-auth"
                disabled={isPending}
                className="w-full py-3 text-sm font-semibold text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                style={{ backgroundImage: GRADIENT }}
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
                <p className="text-center text-xs text-slate-400 pt-1">
                  Test login:{" "}
                  <button
                    type="button"
                    data-testid="btn-autofill-demo"
                    className="text-purple-600 hover:underline font-medium"
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

          <p className="text-center text-sm text-slate-400 mt-6">
            <Link href="/">
              <span className="hover:text-slate-600 transition-colors cursor-pointer">
                Back to home
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
