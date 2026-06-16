// ── Microsoft Teams SSO helper ──────────────────────────────────────────────
//
// Detects whether the app is running embedded inside a Microsoft Teams client
// and, if so, silently signs the user in using their Entra (Azure AD) identity.
// In a normal browser none of this runs and the standard email/password login
// is used instead.

import { app, authentication } from "@microsoft/teams-js";

let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return true;
  try {
    await app.initialize();
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort check for whether we're hosted inside a Teams client. Returns
 * false in a plain browser. Never throws.
 */
export async function isInTeams(): Promise<boolean> {
  // Quick heuristic first: Teams hosts the app in an iframe.
  const framed = typeof window !== "undefined" && window.parent !== window.self;
  if (!framed) return false;
  if (!(await ensureInitialized())) return false;
  try {
    const context = await app.getContext();
    return Boolean(context?.app?.host?.name);
  } catch {
    return false;
  }
}

export interface TeamsLoginResult {
  ok: boolean;
  user?: { email: string; name: string };
  error?: string;
}

/**
 * Attempt a silent Teams SSO login. Acquires an Entra token via the Teams SDK,
 * exchanges it for an app session on the server, and returns the result.
 */
export async function teamsSilentLogin(): Promise<TeamsLoginResult> {
  if (!(await ensureInitialized())) {
    return { ok: false, error: "Teams SDK not available" };
  }
  let token: string;
  try {
    token = await authentication.getAuthToken();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not acquire Teams token",
    };
  }
  try {
    const res = await fetch("/api/auth/teams-sso-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || `Sign-in failed (${res.status})` };
    }
    const body = await res.json();
    return { ok: true, user: body.user };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign-in request failed",
    };
  }
}
