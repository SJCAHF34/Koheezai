import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, RefreshCw, AlertTriangle, CheckCircle2, XCircle, FileText } from "lucide-react";

interface FaxLogEntry {
  submissionID: string;
  patientName: string;
  submittedAt: string;
  status: "sent" | "failed";
  sfaxJobId?: string;
  errorMessage?: string;
}

interface FaxLogResponse {
  entries: FaxLogEntry[];
  config: { ok: boolean; missing: string[] };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FaxLog() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<FaxLogResponse>({
    queryKey: ["/api/fax-log"],
    refetchInterval: 15000,
  });

  const retryMutation = useMutation({
    mutationFn: (submissionID: string) =>
      apiRequest(`/api/fax-retry/${submissionID}`, { method: "POST" }),
    onSuccess: (res: { entry: FaxLogEntry }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fax-log"] });
      if (res.entry.status === "sent") {
        toast({ title: "Fax sent", description: `Re-sent for ${res.entry.patientName}.` });
      } else {
        toast({
          title: "Retry failed",
          description: res.entry.errorMessage ?? "The fax could not be sent.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({ title: "Retry failed", description: "Could not reach the server.", variant: "destructive" });
    },
  });

  const entries = data?.entries ?? [];
  const config = data?.config;
  const sentCount = entries.filter((e) => e.status === "sent").length;
  const failedCount = entries.filter((e) => e.status === "failed").length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-md bg-purple-50 flex items-center justify-center">
          <Send className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-faxlog-title">
            Fax Log
          </h1>
          <p className="text-sm text-muted-foreground">
            Auto-faxed Patient Service Agreements sent to the McKesson ICQ queue
          </p>
        </div>
      </div>

      {config && !config.ok && (
        <div
          className="flex items-start gap-3 mt-4 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 px-4 py-3"
          data-testid="banner-fax-config-warning"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            Auto-fax is not fully configured. Missing secrets:{" "}
            <span className="font-medium">{config.missing.join(", ")}</span>. Faxes will fail until these
            are added.
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-6">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold" data-testid="stat-total">{entries.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total attempts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-green-600" data-testid="stat-sent">{sentCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-red-500" data-testid="stat-failed">{failedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Failed</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent Faxes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center" data-testid="empty-faxlog">
              <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No faxes yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                New Patient Service Agreement submissions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.submissionID}
                  data-testid={`row-fax-${entry.submissionID}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.status === "sent" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="font-medium truncate" data-testid={`text-patient-${entry.submissionID}`}>
                        {entry.patientName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(entry.submittedAt)}
                      {entry.sfaxJobId && entry.status === "sent" && (
                        <span className="ml-2">· Job {entry.sfaxJobId}</span>
                      )}
                    </div>
                    {entry.status === "failed" && entry.errorMessage && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                        {entry.errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {entry.status === "sent" ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Sent
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Failed
                      </Badge>
                    )}
                    {entry.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-retry-${entry.submissionID}`}
                        onClick={() => retryMutation.mutate(entry.submissionID)}
                        disabled={retryMutation.isPending}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${retryMutation.isPending ? "animate-spin" : ""}`}
                        />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
