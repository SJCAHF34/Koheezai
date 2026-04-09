const CLERKCHAT_API_BASE = "https://api.clerkchat.com/v1";

export async function sendSms(to: string, body: string): Promise<boolean> {
  const apiKey = process.env.CLERKCHAT_API_KEY;
  const channelId = process.env.CLERKCHAT_CHANNEL_ID;

  if (!apiKey || !channelId) {
    console.warn("[Clerkchat] CLERKCHAT_API_KEY or CLERKCHAT_CHANNEL_ID not configured — SMS not sent");
    return false;
  }

  try {
    const response = await fetch(`${CLERKCHAT_API_BASE}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: channelId,
        to,
        body,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Clerkchat] SMS send failed (${response.status}): ${text}`);
      return false;
    }

    console.log(`[Clerkchat] SMS sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Clerkchat] SMS send error:", err);
    return false;
  }
}
