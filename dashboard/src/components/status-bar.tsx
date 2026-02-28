"use client";

import { SystemStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldAlert, Wifi, Clock } from "lucide-react";

interface StatusBarProps {
    status: SystemStatus;
}

export function StatusBar({ status }: StatusBarProps) {
    return (
        <div className="h-14 w-full bg-[#0c0c0e] border-b border-slate-800 flex items-center justify-between px-6 shadow-md">
            <div className="flex items-center space-x-4">
                <div className="text-xl font-bold tracking-tighter bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                    ZenithOS
                </div>
                <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-400 font-mono text-xs">
                    COMMAND CENTER
                </Badge>
            </div>

            <div className="flex items-center space-x-6 text-sm flex-wrap gap-y-2">
                <div className="flex items-center text-slate-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="font-mono">{status.uptime}s uptime</span>
                </div>

                <div className="flex items-center text-slate-400">
                    {status.activeViolations > 0 ? (
                        <ShieldAlert className="w-4 h-4 mr-2 text-red-500 animate-pulse" />
                    ) : (
                        <ShieldAlert className="w-4 h-4 mr-2 text-slate-600" />
                    )}
                    <span className="font-mono">
                        Violations: <span className={status.activeViolations > 0 ? "text-red-400 font-bold" : ""}>{status.activeViolations}</span>
                    </span>
                </div>

                <div className="flex items-center">
                    <Wifi className={`w-4 h-4 mr-2 ${status.natsConnected ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="font-mono text-slate-400">NATS: {status.natsConnected ? 'Connected' : 'Disconnected'}</span>
                </div>

                <div className="flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="font-mono text-slate-400">Rust Telemetry: Active</span>
                </div>
            </div>
        </div>
    );
}
