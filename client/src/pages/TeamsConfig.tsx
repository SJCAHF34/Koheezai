import { useEffect, useState } from "react";

// Settings page Microsoft Teams loads when a user adds/configures the tab.
// It registers the content URL the tab should display once saved.
export default function TeamsConfig() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { pages } = await import("@microsoft/teams-js");
        const { app } = await import("@microsoft/teams-js");
        await app.initialize();
        const origin = window.location.origin;
        pages.config.registerOnSaveHandler((saveEvent) => {
          pages.config.setConfig({
            entityId: "koheez-app",
            contentUrl: `${origin}/app`,
            websiteUrl: `${origin}/app`,
            suggestedDisplayName: "Koheez.ai",
          });
          saveEvent.notifySuccess();
        });
        pages.config.setValidityState(true);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 space-y-3 text-center">
      <h1 className="text-xl font-semibold" data-testid="text-teamsconfig-title">
        Add Koheez.ai
      </h1>
      <p className="text-sm text-muted-foreground">
        {ready
          ? "Click Save to add the Koheez.ai clinical decision support tab."
          : "Preparing…"}
      </p>
    </div>
  );
}
