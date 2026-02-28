"use client";

import { useEffect, useRef } from "react";
import { AgentLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface AgentFeedProps {
    logs: AgentLog[];
}

export function AgentFeed({ logs }: AgentFeedProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const getPhaseBadge = (phase: string) => {
        switch (phase) {
            case "analyzing":
                return <Badge variant="outline" className="text-blue-400 border-blue-400 bg-blue-950/30">ANALYZING</Badge>;
            case "evaluating":
                return <Badge variant="outline" className="text-amber-400 border-amber-400 bg-amber-950/30">EVALUATING</Badge>;
            case "remediating":
                return <Badge variant="outline" className="text-red-400 border-red-400 bg-red-950/30">REMEDIATING</Badge>;
            case "done":
                return <Badge variant="outline" className="text-green-400 border-green-400 bg-green-950/30">DONE</Badge>;
            default:
                return <Badge variant="outline">{phase.toUpperCase()}</Badge>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] border border-slate-800 rounded-lg overflow-hidden font-mono shadow-2xl">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-slate-300 font-semibold tracking-wider">AGENT INTELLIGENCE FEED</span>
                </div>
                <span className="text-xs text-slate-500">Live</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="flex flex-col space-y-1 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center space-x-2 text-xs">
                                <span className="text-slate-500">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}
                                </span>
                                {getPhaseBadge(log.phase)}
                            </div>
                            <div className="text-sm text-slate-300 pl-2 border-l-2 border-slate-800 break-words">
                                <span className="text-slate-500 mr-2">›</span>
                                {log.message}
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-slate-600 text-sm text-center italic mt-10">
                            Agent is idle. Waiting for telemetry...
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
