"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  MessageSquare,
  Search,
  Filter,
  Bot,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/axios";
import { cn } from "@/lib/utils";

interface AutomationLogItem {
  id: string;
  commentId: string;
  commentText: string | null;
  mediaId: string | null;
  senderInstagramId: string;
  senderUsername: string | null;
  publicReplySent: boolean;
  privateDmSent: boolean;
  status: "SUCCESS" | "FAILED";
  error: string | null;
  createdAt: string;
  rule?: {
    id: string;
    name: string;
  } | null;
}

interface InstagramLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelUsername: string;
}

export function InstagramLogsModal({
  isOpen,
  onClose,
  channelId,
  channelUsername,
}: InstagramLogsModalProps) {
  const [logs, setLogs] = useState<AutomationLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/channels/instagram/${channelId}/logs`);
      const list = res.data?.data?.logs;
      if (Array.isArray(list)) {
        setLogs(list);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Failed to load automation logs:", err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = statusFilter === "ALL" || log.status === statusFilter;
    const matchesSearch =
      (log.senderUsername || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.commentText || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.rule?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Automation Telemetry & Execution Logs
                </h2>
                <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Channel: <strong className="text-foreground">@{channelUsername}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="h-8 text-xs gap-1"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar Filter */}
        <div className="flex items-center justify-between gap-3 p-3.5 border-b bg-muted/10 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by @user, comment or rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs h-7.5 bg-background"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                statusFilter === "ALL"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("SUCCESS")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                statusFilter === "SUCCESS"
                  ? "bg-background text-emerald-600 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Success
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("FAILED")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                statusFilter === "FAILED"
                  ? "bg-background text-destructive font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Failed
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-muted-foreground">Time</th>
                <th className="py-2.5 px-3 font-semibold text-muted-foreground">Commenter</th>
                <th className="py-2.5 px-3 font-semibold text-muted-foreground">Comment Text</th>
                <th className="py-2.5 px-3 font-semibold text-muted-foreground">Matched Rule</th>
                <th className="py-2.5 px-3 font-semibold text-muted-foreground">Public Reply</th>
                <th className="py-2.5 px-3 font-semibold text-muted-foreground">Private DM</th>
                <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading automation logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-1" />
                      <p className="font-semibold text-foreground">No execution logs recorded yet</p>
                      <p className="text-[11px]">
                        When someone comments a trigger keyword on your Instagram posts, real-time telemetry will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                      <p className="text-foreground font-medium">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <span className="text-[10px]">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Sender */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <p className="font-semibold text-foreground">
                        @{log.senderUsername || "unknown"}
                      </p>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {log.senderInstagramId ? `${log.senderInstagramId.substring(0, 10)}...` : ""}
                      </span>
                    </td>

                    {/* Comment text */}
                    <td className="py-2.5 px-3 max-w-xs truncate text-foreground font-mono">
                      &quot;{log.commentText || "—"}&quot;
                    </td>

                    {/* Rule */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.rule?.name ? (
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {log.rule.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Public Reply */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.publicReplySent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Sent</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Skipped</span>
                      )}
                    </td>

                    {/* Private DM */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.privateDmSent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Delivered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-destructive font-medium">
                          <AlertCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* Overall Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right">
                      <Badge
                        className={cn(
                          "text-[10px] px-2 py-0.5",
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20",
                        )}
                      >
                        {log.status}
                      </Badge>
                      {log.error && (
                        <p className="text-[9px] text-destructive mt-0.5 max-w-xs truncate text-right" title={log.error}>
                          {log.error}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filteredLogs.length} logged events</span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-7">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
