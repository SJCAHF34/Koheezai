let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

function isConfigured(): boolean {
  return !!(
    process.env.SF_CLIENT_ID &&
    process.env.SF_CLIENT_SECRET &&
    process.env.SF_USERNAME &&
    process.env.SF_PASSWORD &&
    process.env.SF_INSTANCE_URL
  );
}

async function getAccessToken(): Promise<string | null> {
  if (!isConfigured()) return null;
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const params = new URLSearchParams({
    grant_type: "password",
    client_id: process.env.SF_CLIENT_ID!,
    client_secret: process.env.SF_CLIENT_SECRET!,
    username: process.env.SF_USERNAME!,
    password: `${process.env.SF_PASSWORD}${process.env.SF_SECURITY_TOKEN ?? ""}`,
  });

  try {
    const res = await fetch(`${process.env.SF_INSTANCE_URL}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[Salesforce] Token fetch failed:", text);
      return null;
    }
    const data: { access_token: string } = await res.json() as { access_token: string };
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + 90 * 60 * 1000;
    return cachedToken;
  } catch (err) {
    console.warn("[Salesforce] Token fetch error:", err);
    return null;
  }
}

async function findContactIdByPhone(token: string, phone: string): Promise<string | null> {
  const query = encodeURIComponent(`SELECT Id FROM Contact WHERE Phone = '${phone}' LIMIT 1`);
  try {
    const res = await fetch(
      `${process.env.SF_INSTANCE_URL}/services/data/v58.0/query/?q=${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data: { records: { Id: string }[] } = await res.json() as { records: { Id: string }[] };
    return data.records?.[0]?.Id ?? null;
  } catch {
    return null;
  }
}

export async function logRetentionEvent(
  phone: string,
  initials: string,
  eventType: string,
  detail: string
): Promise<boolean> {
  if (!isConfigured()) {
    console.log(`[Salesforce] Not configured — skipping event: ${eventType}`);
    return false;
  }
  const token = await getAccessToken();
  if (!token) return false;

  const contactId = await findContactIdByPhone(token, phone);
  const today = new Date().toISOString().split("T")[0];

  const task: Record<string, string> = {
    Subject: `AHF Pharmacy — ${eventType}`,
    Description: `Patient: ${initials} | ${detail}`,
    Status: "Completed",
    ActivityDate: today,
    Type: "Call",
    Priority: "Normal",
  };
  if (contactId) task.WhoId = contactId;

  try {
    const res = await fetch(
      `${process.env.SF_INSTANCE_URL}/services/data/v58.0/sobjects/Task`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[Salesforce] Task create failed for ${initials}:`, text);
      return false;
    }
    console.log(`[Salesforce] Logged "${eventType}" for patient ${initials}`);
    return true;
  } catch (err) {
    console.warn(`[Salesforce] Task create error for ${initials}:`, err);
    return false;
  }
}
