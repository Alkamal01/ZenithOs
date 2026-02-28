"use client";

import { useWebSocket } from "@/hooks/use-websocket";
import { StatusBar } from "@/components/status-bar";
import { TopologyGraph } from "@/components/topology-graph";
import { AgentFeed } from "@/components/agent-feed";
import { RemediationDiff } from "@/components/remediation-diff";
import { WriGauge } from "@/components/wri-gauge";
import { AuditLog } from "@/components/audit-log";

export default function Dashboard() {
    const { status, logs, activeDiff, auditLog, approveDiff, rejectDiff } = useWebSocket();

    return (
        <div className="flex flex-col h-screen w-full bg-[#030303] text-slate-200 font-sans overflow-hidden">
            <StatusBar status={status} />

            <main className="flex-1 w-full p-4 gap-4 grid grid-cols-12 grid-rows-12 min-h-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-black to-black">

                {/* Main Infrastructure Topology (Large Left Panel) */}
                <section className="col-span-12 lg:col-span-8 row-span-7 lg:row-span-12 rounded-xl shadow-2xl flex flex-col min-h-0">
                    <TopologyGraph hasActiveViolation={status.activeViolations > 0} />
                </section>

                {/* WRI Gauge (Top Right) */}
                <section className="col-span-6 lg:col-span-2 row-span-2 lg:row-span-4 bg-[#0a0a0c] border border-slate-800 rounded-xl shadow-lg flex items-center justify-center min-h-0">
                    <WriGauge status={status} />
                </section>

                {/* Audit History (Top Right, next to WRI) */}
                <section className="col-span-6 lg:col-span-2 row-span-2 lg:row-span-4 min-h-0">
                    <AuditLog entries={auditLog} />
                </section>

                {/* Agent Feed / Remediation Diff (Bottom Right) */}
                <section className="col-span-12 lg:col-span-4 row-span-3 lg:row-span-8 flex flex-col gap-4 min-h-0">

                    {/* Agent Feed */}
                    <div className={`transition-all duration-500 ease-in-out min-h-0 ${activeDiff ? "h-[35%] shrink-0" : "h-full"}`}>
                        <AgentFeed logs={logs} />
                    </div>

                    {/* Remediation Diff Viewer */}
                    <div className={`transition-all duration-500 ease-in-out min-h-0 ${activeDiff ? "flex-1 opacity-100" : "h-0 opacity-0 overflow-hidden"}`}>
                        <RemediationDiff
                            diffData={activeDiff}
                            onApprove={approveDiff}
                            onReject={rejectDiff}
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}
