import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/App";
import { getUserProfile, isDirectorRole, getRoleLabel } from "@/lib/userProfile";
import { getDueTasksForToday, type DueTaskSummary } from "@/lib/taskStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, AlertTriangle, RefreshCw, CalendarClock, Clock, ImagePlus, X } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  achc: "ACHC",
  state_board: "State Board",
  retention: "Retention",
  operations: "Operations",
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB client-side guard

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScheduleAssistant() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;

  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dueTasks: DueTaskSummary[] = useMemo(() => {
    if (!profile) return [];
    const roleForTasks = isDirectorRole(profile.role) ? "director" : profile.role;
    const tasks = getDueTasksForToday(roleForTasks, profile.siteId, profile.region, new Date());
    return tasks.sort((a, b) => {
      const rank = (t: DueTaskSummary) => (t.isOverdue ? 0 : t.isUrgent ? 1 : 2);
      return rank(a) - rank(b);
    });
  }, [profile]);

  function scrollToBottom() {
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !stagedImage) || loading || !profile) return;
    setError(null);
    setInput("");
    const imageToSend = stagedImage;
    setStagedImage(null);
    setImageError(null);

    const newMsg: ChatMessage = { role: "user", content: trimmed };
    if (imageToSend) newMsg.imageDataUrl = imageToSend;

    const updated: ChatMessage[] = [...messages, newMsg];
    setMessages(updated);
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/ai/schedule-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          context: {
            date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
            role: getRoleLabel(profile.role),
            workStart,
            workEnd,
            tasks: dueTasks,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
        scrollToBottom();
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleBuildSchedule() {
    sendMessage("Please build me a time-blocked schedule for today using the tasks due, fitting my working hours.");
  }

  async function processImageFile(file: File) {
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("Only image files are supported.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be under 4 MB.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setStagedImage(dataUrl);
      textareaRef.current?.focus();
    } catch {
      setImageError("Could not read the image file.");
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processImageFile(file);
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    const file = item.getAsFile();
    if (file) {
      e.preventDefault();
      await processImageFile(file);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!profile) return null;

  const canSend = (input.trim().length > 0 || stagedImage !== null) && !loading;

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground" data-testid="text-page-title">Schedule Assistant</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Chat with an AI assistant to build a time-blocked plan for today's tasks — daily tasks plus anything else that's currently due. You can also drop or paste an image to share context.
        </p>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" />
              Tasks due today ({dueTasks.length})
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <Input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="h-8 w-28"
                data-testid="input-work-start"
              />
              <span>–</span>
              <Input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="h-8 w-28"
                data-testid="input-work-end"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {dueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-due-tasks">
                No tasks are due today for your role.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dueTasks.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className={
                      t.isOverdue
                        ? "text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                        : t.isUrgent
                          ? "text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800"
                          : "text-muted-foreground border-border bg-muted/40"
                    }
                    data-testid={`badge-due-task-${t.id}`}
                  >
                    {t.title}
                    {t.frequency !== "daily" && <span className="ml-1 opacity-70">({CATEGORY_LABEL[t.category] ?? t.category})</span>}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Chat card — drag-and-drop target ─────────────────────────── */}
        <div
          className={`relative rounded-lg border transition-colors ${
            isDragging ? "border-purple-400 bg-purple-50/60 dark:bg-purple-950/30" : "border-border bg-card"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay hint */}
          {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg pointer-events-none">
              <ImagePlus className="w-8 h-8 text-purple-500" />
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Drop image to attach</p>
            </div>
          )}

          <div className={`transition-opacity ${isDragging ? "opacity-20 pointer-events-none" : "opacity-100"}`}>
            {/* Card header */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-sm font-semibold text-foreground">Chat</p>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-3">
              {/* ── Message thread ──────────────────────────────────────── */}
              <div
                ref={threadRef}
                className="overflow-y-auto space-y-3 pr-1"
                style={{ minHeight: "200px", maxHeight: "440px" }}
                data-testid="chat-thread"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Ask for a time-blocked schedule, or tell me about your day (meetings, a shorter shift, etc.) and I'll work it in. You can also drop or paste a screenshot for context.
                    </p>
                    <Button size="sm" onClick={handleBuildSchedule} disabled={loading} data-testid="button-build-schedule">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Build my schedule
                    </Button>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap space-y-2 ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground border border-border"
                      }`}
                      data-testid={`text-chat-message-${i}`}
                    >
                      {m.imageDataUrl && (
                        <img
                          src={m.imageDataUrl}
                          alt="Attached"
                          className="max-w-full max-h-48 rounded-md object-contain"
                        />
                      )}
                      {m.content && <p>{m.content}</p>}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground border border-border flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* ── Error banner ─────────────────────────────────────────── */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md px-3 py-2" data-testid="text-chat-error">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* ── Staged image preview ─────────────────────────────────── */}
              {stagedImage && (
                <div className="flex items-start gap-2">
                  <div className="relative shrink-0">
                    <img
                      src={stagedImage}
                      alt="Staged attachment"
                      className="h-20 w-auto max-w-[160px] rounded-md border border-border object-contain bg-muted"
                    />
                    <button
                      type="button"
                      onClick={() => { setStagedImage(null); setImageError(null); }}
                      data-testid="button-remove-staged-image"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center hover-elevate"
                    >
                      <X className="w-3 h-3 text-foreground" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">Image ready to send</p>
                </div>
              )}

              {imageError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {imageError}
                </p>
              )}

              {/* ── Input row ────────────────────────────────────────────── */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-end gap-2"
              >
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid="input-image-file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await processImageFile(file);
                    e.target.value = "";
                  }}
                />

                {/* Image attach button */}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={loading}
                  data-testid="button-attach-image"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>

                {/* Text input */}
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="e.g. Build my schedule for today — or drop / paste an image"
                  disabled={loading}
                  rows={1}
                  className="flex-1 resize-none text-sm min-h-9"
                  data-testid="input-chat-message"
                />

                <Button type="submit" size="icon" disabled={!canSend} data-testid="button-send-chat">
                  <Send className="w-4 h-4" />
                </Button>
              </form>

              <p className="text-[11px] text-muted-foreground">
                Drop or paste an image anywhere in this panel, or use the image button. Press Enter to send, Shift+Enter for a new line.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
