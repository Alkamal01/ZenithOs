"use client";

import { AuditEntry } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface AuditLogProps {
    entries: AuditEntry[];
}

export function AuditLog({ entries }: AuditLogProps) {
    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-300 font-semibold tracking-wider">AUDIT HISTORY</span>
                </div>
                <Badge variant="outline" className="text-slate-500 border-slate-700 text-xs">
                    {entries.length} {entries.length === 1 ? "event" : "events"}
                </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-3 min-h-0">
                {entries.length === 0 ? (
                    <div className="text-slate-600 text-sm text-center italic mt-8">
                        No remediation decisions yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {entries.map((entry) => (
                            <div
                                key={entry.id}
                                className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-mono ${entry.action === "approved"
                                        ? "border-green-900/40 bg-green-950/20"
                                        : "border-red-900/40 bg-red-950/20"
                                    }`}
                            >
                                <div className="flex items-center space-x-2 min-w-0">
                                    {entry.action === "approved" ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    ) : (
                                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-slate-300 truncate">{entry.resourceId}</div>
                                        <div className="text-slate-500 text-[10px]">{entry.ruleId}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end shrink-0 ml-2">
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 py-0 ${entry.action === "approved"
                                                ? "text-green-400 border-green-800"
                                                : "text-red-400 border-red-800"
                                            }`}
                                    >
                                        {entry.action.toUpperCase()}
                                    </Badge>
                                    <span className="text-slate-600 text-[10px] mt-0.5">
                                        {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
