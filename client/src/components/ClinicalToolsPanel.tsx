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
  CreditCard,
  BookOpen,
  Lock,
  X,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BrowserTool = {
  id: string;
  label: string;
  url: string;
  icon: LucideIcon;
  iconColor: string;
};

const browserTools: BrowserTool[] = [
  {
    id: "ramsell",
    label: "Ramsell ADAP",
    url: "https://pbm.ramsellcorp.com/Security/SignIn.aspx?enc=alO9koyFXt1nW1sY4HUjZj3qlnLQ7z3Q%2fNrcaIWibZ8UChXT24cNOSdVDVQHj4QK",
    icon: Shield,
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "onesource",
    label: "OneSource",
    url: "https://www.onesource.passporthealth.com/_members/Home/Login.aspx",
    icon: CreditCard,
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "openevidence",
    label: "OpenEvidence",
    url: "https://www.openevidence.com/",
    icon: BookOpen,
    iconColor: "text-green-600 dark:text-green-400",
  },
];

const MIN_WIDTH = 360;

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function ClinicalToolsPanel() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(browserTools[0].id);
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const savedWidthRef = useRef<number>(720);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTool = browserTools.find((t) => t.id === activeId) ?? browserTools[0];

  // Initialise panel width on first open
  useEffect(() => {
    if (open && panelWidth === null) {
      const w = Math.min(Math.round(window.innerWidth * 0.65), 960);
      setPanelWidth(w);
      savedWidthRef.current = w;
    }
  }, [open, panelWidth]);

  // Prevent text selection globally while dragging
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
    setLoading(true);
    setIframeKey((k) => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setIframeKey((k) => k + 1);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const currentWidth = panelWidth ?? 720;

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          data-testid="button-clinical-tools-panel"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Clinical Tools</span>
          <span className="sm:hidden">Tools</span>
        </button>
      </SheetTrigger>

      {/* Non-modal — no overlay — background form stays fully interactive */}
      <SheetContentNoOverlay
        side="right"
        style={{ width: `${currentWidth}px`, maxWidth: "100vw" }}
        className="shadow-2xl flex flex-col p-0"
        onInteractOutside={(e) => {
          // Don't close while the user is dragging the resize handle
          if (!isDragging) setOpen(false);
          else e.preventDefault();
        }}
        data-testid="panel-clinical-tools"
      >
        {/* Hidden accessibility labels */}
        <SheetTitle className="sr-only">Clinical Tools Browser</SheetTitle>
        <SheetDescription className="sr-only">
          Embedded browser for ADAP, Medicare, and clinical guideline portals.
        </SheetDescription>

        {/* ── Drag handle (left edge) ── */}
        <div
          onMouseDown={handleResizeStart}
          data-testid="handle-panel-resize"
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize group",
            "transition-colors hover:bg-primary/30",
            isDragging && "bg-primary/40"
          )}
          title="Drag to resize"
        />

        {/* ── Tool tabs ── */}
        <div className="flex items-center gap-0 border-b bg-muted/40 shrink-0 pl-1.5">
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
                <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? tool.iconColor : "text-muted-foreground")} />
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Browser chrome / address bar ── */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-card shrink-0">
          {/* Refresh */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            data-testid="button-browser-refresh"
            className="shrink-0"
            title="Refresh"
          >
            <RotateCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>

          {/* URL bar */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-muted rounded-md px-2.5 py-1.5">
            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span
              className="text-xs text-muted-foreground truncate font-mono"
              data-testid="text-browser-url"
            >
              {displayUrl(activeTool.url)}
            </span>
          </div>

          {/* Open in new tab */}
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

          {/* Maximize / restore */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleMaximize}
            data-testid="button-browser-maximize"
            className="shrink-0"
            title={isMaximized ? "Restore width" : "Maximize width"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </Button>

          {/* Close panel */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setOpen(false)}
            data-testid="button-close-browser-panel"
            className="shrink-0"
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* ── iframe viewport ── */}
        <div className="flex-1 relative bg-background min-h-0">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading {activeTool.label}…</p>
            </div>
          )}

          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={activeTool.url}
            onLoad={handleIframeLoad}
            title={activeTool.label}
            data-testid={`iframe-browser-${activeId}`}
            className={cn(
              "w-full h-full border-0",
              isDragging && "pointer-events-none"
            )}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>

        {/* ── Fallback hint ── */}
        <div className="shrink-0 px-4 py-2 border-t bg-muted/30 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground">
            If the site can't be embedded, click{" "}
            <ExternalLink className="inline w-3 h-3 align-middle" />{" "}
            above to open it in a full tab.
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
      </SheetContentNoOverlay>
    </Sheet>
  );
}
