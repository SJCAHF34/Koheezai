import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/App";
import { getUserProfile, isDirectorRole, getRoleLabel } from "@/lib/userProfile";
import { getDueTasksForToday, type DueTaskSummary } from "@/lib/taskStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, AlertTriangle, RefreshCw, CalendarClock, Clock } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  achc: "ACHC",
  state_board: "State Board",
  retention: "Retention",
  operations: "Operations",
};

export default function ScheduleAssistant() {
  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name ?? "") : null;

  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

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
    if (!trimmed || loading || !profile) return;
    setError(null);
    setInput("");
    const updated: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
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
    sendMessage(
      "Please build me a time-blocked schedule for today using the tasks due, fitting my working hours."
    );
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground" data-testid="text-page-title">Schedule Assistant</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Chat with an AI assistant to build a time-blocked plan for today's tasks — daily tasks plus anything else that's currently due.
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
                        ? "text-red-700 border-red-200 bg-red-50"
                        : t.isUrgent
                          ? "text-orange-700 border-orange-200 bg-orange-50"
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

        <Card className="flex flex-col" style={{ minHeight: "420px" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <div
              ref={threadRef}
              className="flex-1 overflow-y-auto space-y-3 pr-1"
              style={{ maxHeight: "440px" }}
              data-testid="chat-thread"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Ask for a time-blocked schedule, or tell me about your day (meetings, a shorter shift, etc.) and I'll work it in.
                  </p>
                  <Button size="sm" onClick={handleBuildSchedule} disabled={loading} data-testid="button-build-schedule">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Build my schedule
                  </Button>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border"
                    }`}
                    data-testid={`text-chat-message-${i}`}
                  >
                    {m.content}
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

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="text-chat-error">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Build my schedule for today"
                disabled={loading}
                data-testid="input-chat-message"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} data-testid="button-send-chat">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
