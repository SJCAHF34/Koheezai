import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { AuditLogEntry } from "@shared/schema";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function downloadCsv() {
  const url = "/api/audit-log/export";
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  a.click();
}

export default function AuditLog() {
  const { data, isLoading, error } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-log"],
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-audit-title">
            Access Audit Log
          </h1>
          <p className="text-sm text-muted-foreground">
            HIPAA access record of who viewed or changed patient information and when.
          </p>
        </div>
        <Button
          variant="outline"
          size="default"
          data-testid="button-audit-export"
          onClick={downloadCsv}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground" data-testid="text-audit-loading">
              Loading…
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" data-testid="text-audit-error">
              You do not have permission to view this log.
            </p>
          )}
          {data && data.length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-audit-empty">
              No access events recorded yet.
            </p>
          )}
          {data && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4 font-medium">When</th>
                    <th className="py-2 pr-4 font-medium">User</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b last:border-0"
                      data-testid={`row-audit-${e.id}`}
                    >
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatWhen(e.at)}
                      </td>
                      <td className="py-2 pr-4">
                        <div>{e.actorName || e.actorEmail}</div>
                        <div className="text-xs text-muted-foreground">{e.actorEmail}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">{e.role}</Badge>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">{e.action}</td>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {e.resource}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
