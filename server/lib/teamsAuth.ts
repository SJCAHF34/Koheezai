import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// ── Microsoft Entra (Azure AD) SSO token validation ────────────────────────
//
// When the app runs inside Microsoft Teams, the Teams JS SDK obtains an Entra
// access token for our own API (the "webApplicationInfo" resource) and the
// frontend posts it here. We validate it against Microsoft's public signing
// keys and confirm it was minted for THIS app, in OUR tenant, then trust the
// email claim.
//
// All values are environment-driven so the same code works whether the app is
// hosted on Replit or on a custom production domain (e.g. koheez.aidshealth.org)
// behind Aptible — nothing about the host is hardcoded.

export interface TeamsSsoConfig {
  clientId: string;
  tenantId: string;
  domain: string;
  /** Application ID URI = api://<domain>/<clientId> */
  resource: string;
}

export function getTeamsSsoConfig(): TeamsSsoConfig | null {
  const clientId = process.env.AAD_APP_CLIENT_ID?.trim();
  const tenantId = process.env.AAD_TENANT_ID?.trim();
  const domain = process.env.APP_DOMAIN?.trim();
  if (!clientId || !tenantId || !domain) return null;
  return {
    clientId,
    tenantId,
    domain,
    resource: `api://${domain}/${clientId}`,
  };
}

export function isTeamsSsoConfigured(): boolean {
  return getTeamsSsoConfig() !== null;
}

// Cache one JWKS fetcher per tenant for the lifetime of the process.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(tenantId: string) {
  let jwks = jwksCache.get(tenantId);
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
    );
    jwksCache.set(tenantId, jwks);
  }
  return jwks;
}

export interface TeamsSsoUser {
  email: string;
  name: string;
}

export class TeamsSsoError extends Error {}

/**
 * Verify the Entra access token and return the work email + display name.
 * Throws TeamsSsoError on any validation failure.
 */
export async function verifyTeamsSsoToken(token: string): Promise<TeamsSsoUser> {
  const cfg = getTeamsSsoConfig();
  if (!cfg) {
    throw new TeamsSsoError("Microsoft Teams SSO is not configured on the server");
  }

  let payload: JWTPayload;
  try {
    const result = await jwtVerify(token, getJwks(cfg.tenantId), {
      // Azure access tokens for a custom API carry aud = clientId (v2) or the
      // Application ID URI (v1). Accept either.
      audience: [cfg.clientId, cfg.resource],
      issuer: [
        `https://login.microsoftonline.com/${cfg.tenantId}/v2.0`,
        `https://sts.windows.net/${cfg.tenantId}/`,
      ],
      // jose checks exp / nbf automatically.
    });
    payload = result.payload;
  } catch (err) {
    throw new TeamsSsoError(
      `Token validation failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  // Defense in depth: confirm the tenant (tid) matches.
  if (payload.tid && payload.tid !== cfg.tenantId) {
    throw new TeamsSsoError("Token is from a different tenant");
  }

  const email = pickEmail(payload);
  if (!email) {
    throw new TeamsSsoError("No email/UPN claim present in token");
  }
  const name = (payload.name as string | undefined) ?? email;
  return { email: email.toLowerCase(), name };
}

function pickEmail(payload: JWTPayload): string | undefined {
  const candidates = [
    payload.preferred_username,
    payload.upn,
    payload.email,
    (payload as Record<string, unknown>).unique_name,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.includes("@")) return c;
  }
  return undefined;
}
