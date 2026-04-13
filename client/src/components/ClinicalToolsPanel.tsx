import { useState, useRef, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContentNoOverlay,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Wrench,
  RotateCw,
  ExternalLink,
  Shield,
  BookOpen,
  Pill,
  Lock,
  X,
  Loader2,
  Maximize2,
  Minimize2,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BrowserTool = {
  id: string;
  label: string;
  url: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  loginViaTab?: boolean;
};

type FrameStatus = "checking" | "frameable" | "blocked" | "error" | "cookie-required";

const browserTools: BrowserTool[] = [
  {
    id: "ramsell",
    label: "Ramsell ADAP",
    url: "https://pbm.ramsellcorp.com/Security/SignIn.aspx?enc=alO9koyFXt1nW1sY4HUjZj3qlnLQ7z3Q%2fNrcaIWibZ8UChXT24cNOSdVDVQHj4QK",
    icon: Shield,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
  },
  {
    id: "openevidence",
    label: "OpenEvidence",
    url: "https://www.openevidence.com/",
    icon: BookOpen,
    iconColor: "text-green-600",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    loginViaTab: true,
  },
  {
    id: "uptodate",
    label: "UpToDate DDI",
    url: "https://www.uptodate.com/drug-interactions/#di-druglist",
    icon: Pill,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
  },
];

const MIN_WIDTH = 360;

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

export function ClinicalToolsPanel({
  navMode = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  navMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  const [activeId, setActiveId] = useState(browserTools[0].id);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>("checking");
  const [frameReason, setFrameReason] = useState<string>("");
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const savedWidthRef = useRef<number>(720);
  const statusCacheRef = useRef<Record<string, { status: FrameStatus; reason: string }>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTool = browserTools.find((t) => t.id === activeId) ?? browserTools[0];
  const ActiveIcon = activeTool.icon;

  // Init panel width on first open
  useEffect(() => {
    if (open && panelWidth === null) {
      const w = Math.min(Math.round(window.innerWidth * 0.65), 960);
      setPanelWidth(w);
      savedWidthRef.current = w;
    }
  }, [open, panelWidth]);

  // Check if the active tool's URL can be framed
  useEffect(() => {
    if (!open) return;

    // Tools that require cookies for login can't authenticate inside an iframe
    if (activeTool.loginViaTab) {
      setFrameStatus("cookie-required");
      setFrameReason("");
      return;
    }

    const cached = statusCacheRef.current[activeId];
    if (cached) {
      setFrameStatus(cached.status);
      setFrameReason(cached.reason);
      return;
    }

    setFrameStatus("checking");
    setFrameReason("");

    fetch(`/api/check-frameable?url=${encodeURIComponent(activeTool.url)}`)
      .then((r) => r.json())
      .then((data: { frameable: boolean; reason?: string }) => {
        const status: FrameStatus = data.frameable ? "frameable" : "blocked";
        const reason = data.reason ?? "";
        statusCacheRef.current[activeId] = { status, reason };
        setFrameStatus(status);
        setFrameReason(reason);
        if (status === "frameable") {
          setIframeLoading(true);
          setIframeKey((k) => k + 1);
        }
      })
      .catch(() => {
        statusCacheRef.current[activeId] = { status: "error", reason: "Request failed" };
        setFrameStatus("error");
        setFrameReason("Request failed");
      });
  }, [open, activeId, activeTool.url]);

  // Global cursor + select-none while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = window.innerWidth - ev.clientX;
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(newWidth, window.innerWidth - 48)));
    };
    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      setIsMaximized(false);
      setPanelWidth(savedWidthRef.current);
    } else {
      savedWidthRef.current = panelWidth ?? 720;
      setIsMaximized(true);
      setPanelWidth(window.innerWidth - 48);
    }
  }, [isMaximized, panelWidth]);

  const handleTabChange = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleRefresh = useCallback(() => {
    // Clear cache for this tab and re-check
    delete statusCacheRef.current[activeId];
    setFrameStatus("checking");
    setFrameReason("");
    setIframeLoading(true);
    setIframeKey((k) => k + 1);
  }, [activeId]);

  const currentWidth = panelWidth ?? 720;

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <button
          className={navMode
            ? "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors text-foreground hover:bg-muted"
            : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          }
          data-testid="button-clinical-tools-panel"
        >
          <Wrench className="w-4 h-4 shrink-0" />
          {navMode ? (
            <span>Clinical Tools</span>
          ) : (
            <>
              <span className="hidden sm:inline">Clinical Tools</span>
              <span className="sm:hidden">Tools</span>
            </>
          )}
        </button>
      </SheetTrigger>

      <SheetContentNoOverlay
        side="right"
        style={{ width: `${currentWidth}px`, maxWidth: "100vw" }}
        className="shadow-2xl flex flex-col p-0"
        onInteractOutside={(e) => {
          if (!isDragging) setOpen(false);
          else e.preventDefault();
        }}
        data-testid="panel-clinical-tools"
      >
        <SheetTitle className="sr-only">Clinical Tools Browser</SheetTitle>
        <SheetDescription className="sr-only">
          Embedded browser for ADAP, Medicare, and clinical guideline portals.
        </SheetDescription>

        {/* Drag-to-resize handle */}
        <div
          onMouseDown={handleResizeStart}
          data-testid="handle-panel-resize"
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize",
            "transition-colors hover:bg-primary/30",
            isDragging && "bg-primary/40"
          )}
          title="Drag to resize"
        />

        {/* Tool tabs */}
        <div className="flex items-center border-b bg-muted/40 shrink-0 pl-1.5">
          {browserTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = tool.id === activeId;
            return (
              <button
                key={tool.id}
                onClick={() => handleTabChange(tool.id)}
                data-testid={`tab-browser-${tool.id}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0",
                  isActive
                    ? "border-primary text-foreground bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    isActive ? tool.iconColor : "text-muted-foreground"
                  )}
                />
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-card shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            data-testid="button-browser-refresh"
            title="Refresh"
            className="shrink-0"
          >
            <RotateCw
              className={cn(
                "w-3.5 h-3.5",
                (frameStatus === "checking" || iframeLoading) && "animate-spin"
              )}
            />
          </Button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-muted rounded-md px-2.5 py-1.5">
            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span
              className="text-xs text-muted-foreground truncate font-mono"
              data-testid="text-browser-url"
            >
              {displayUrl(activeTool.url)}
            </span>
          </div>

          <a
            href={activeTool.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-browser-new-tab"
            title="Open in new tab"
            className="shrink-0"
          >
            <Button size="icon" variant="ghost">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleMaximize}
            data-testid="button-browser-maximize"
            title={isMaximized ? "Restore width" : "Maximize width"}
            className="shrink-0"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setOpen(false)}
            data-testid="button-close-browser-panel"
            title="Close panel"
            className="shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Main content area */}
        <div className="flex-1 relative bg-background min-h-0">

          {/* ── Checking state ── */}
          {frameStatus === "checking" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Connecting to {activeTool.label}…
              </p>
            </div>
          )}

          {/* ── Cookie-required state (login needs a real browser tab) ── */}
          {frameStatus === "cookie-required" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-background px-8 text-center">
              <div className={cn("p-4 rounded-full", activeTool.iconBg)}>
                <Lock className={cn("w-8 h-8", activeTool.iconColor)} />
              </div>
              <div className="space-y-2 max-w-xs">
                <p className="text-base font-semibold text-foreground">
                  Log in to {activeTool.label} in a new tab
                </p>
                <p className="text-sm text-muted-foreground">
                  Browsers block cookies when sites are embedded, which prevents
                  login from working here. Open {activeTool.label} in a full tab to
                  sign in — your session will stay active as long as that tab is open.
                </p>
              </div>
              <a
                href={activeTool.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-cookie-open-${activeId}`}
              >
                <Button className="gap-2" size="lg">
                  Open {activeTool.label} in New Tab
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          )}

          {/* ── Blocked state ── */}
          {frameStatus === "blocked" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-background px-8 text-center">
              <div className={cn("p-4 rounded-full", activeTool.iconBg)}>
                <AlertTriangle className={cn("w-8 h-8", activeTool.iconColor)} />
              </div>
              <div className="space-y-2 max-w-xs">
                <p className="text-base font-semibold text-foreground">
                  {activeTool.label} can't be embedded
                </p>
                <p className="text-sm text-muted-foreground">
                  This site uses security headers ({frameReason}) that prevent it from
                  loading inside another page. Open it in a full browser tab to log in.
                </p>
              </div>
              <a
                href={activeTool.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-blocked-open-${activeId}`}
              >
                <Button className="gap-2" size="lg">
                  Open {activeTool.label} in New Tab
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          )}

          {/* ── Error / connection failed state ── */}
          {frameStatus === "error" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-background px-8 text-center">
              <div className="p-4 rounded-full bg-muted">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2 max-w-xs">
                <p className="text-base font-semibold text-foreground">
                  Couldn't reach {activeTool.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  The connection check timed out or failed. The site may be temporarily
                  unavailable. Try opening it directly in a new tab.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleRefresh} className="gap-2">
                  <RotateCw className="w-4 h-4" />
                  Retry
                </Button>
                <a
                  href={activeTool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`link-error-open-${activeId}`}
                >
                  <Button className="gap-2">
                    Open in New Tab
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* ── iframe (only shown when frameable) ── */}
          {frameStatus === "frameable" && (
            <>
              {iframeLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
                  <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Loading {activeTool.label}…
                  </p>
                </div>
              )}
              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={activeTool.url}
                onLoad={() => setIframeLoading(false)}
                title={activeTool.label}
                data-testid={`iframe-browser-${activeId}`}
                className={cn("w-full h-full border-0", isDragging && "pointer-events-none")}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </>
          )}
        </div>

        {/* Footer — only shown when the site is actually frameable */}
        {frameStatus === "frameable" && (
          <div className="shrink-0 px-4 py-2 border-t bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Session cookies stay in the embedded frame — no credentials are stored by this app.
            </p>
            <a
              href={activeTool.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-browser-fallback-new-tab"
            >
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                Open in new tab
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          </div>
        )}
      </SheetContentNoOverlay>
    </Sheet>
  );
}
