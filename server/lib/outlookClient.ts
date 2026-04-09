export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  accessToken?: string
): Promise<boolean> {
  const token = accessToken || process.env.OUTLOOK_ACCESS_TOKEN;

  if (!token) {
    console.warn("[Outlook] No access token available — email not sent. Provide OUTLOOK_ACCESS_TOKEN secret or connect the Microsoft Outlook integration.");
    return false;
  }

  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          sensitivity: "confidential",
          body: {
            contentType: "Text",
            content: body,
          },
          toRecipients: [
            {
              emailAddress: { address: to },
            },
          ],
        },
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Outlook] Email send failed (${response.status}): ${text}`);
      return false;
    }

    console.log(`[Outlook] Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Outlook] Email send error:", err);
    return false;
  }
}
