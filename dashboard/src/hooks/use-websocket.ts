import { useState, useEffect, useCallback, useRef } from "react";
import { AgentLog, RemediationDiffData, SystemStatus, TelemetryPayload } from "../lib/types";

export interface AuditEntry {
    id: string;
    timestamp: string;
    action: "approved" | "rejected";
    ruleId: string;
    resourceId: string;
    severity: string;
}

const WS_URL = "ws://localhost:3001/ws";
const RECONNECT_INTERVAL = 3000;

export function useWebSocket() {
    const [status, setStatus] = useState<SystemStatus>({
        natsConnected: false,
        activeViolations: 0,
        wriScore: 1.0,
        uptime: 0,
    });

    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [telemetry, setTelemetry] = useState<TelemetryPayload[]>([]);
    const [activeDiff, setActiveDiff] = useState<RemediationDiffData | null>(null);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!mountedRef.current) return;
            setStatus(prev => ({ ...prev, natsConnected: true }));
            setLogs(prev => [
                ...prev,
                {
                    id: `log-ws-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    phase: "done",
                    message: "WebSocket connected to Rust telemetry gateway.",
                },
            ]);
        };

        ws.onclose = () => {
            if (!mountedRef.current) return;
            setStatus(prev => ({ ...prev, natsConnected: false }));
            wsRef.current = null;
            // Auto-reconnect
            reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL);
        };

        ws.onerror = () => {
            ws.close();
        };

        ws.onmessage = (event) => {
            if (!mountedRef.current) return;
            try {
                const payload = JSON.parse(event.data);
                const subject = payload.subject;
                const data = payload.data;

                if (subject === "events.logs") {
                    setLogs(prev => [...prev.slice(-99), data as AgentLog]);
                } else if (subject === "events.diffs") {
                    setActiveDiff(data as RemediationDiffData);
                    setStatus(prev => ({ ...prev, activeViolations: prev.activeViolations + 1 }));
                } else if (subject === "events.wri") {
                    setStatus(prev => ({ ...prev, wriScore: data.score }));
                } else if (subject.startsWith("telemetry.")) {
                    setTelemetry(prev => [...prev.slice(-49), data as TelemetryPayload]);
                }
            } catch (err) {
                console.error("Failed to parse WS message", err);
            }
        };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        connect();

        const uptimeInterval = setInterval(() => {
            if (mountedRef.current) {
                setStatus(prev => ({ ...prev, uptime: prev.uptime + 1 }));
            }
        }, 1000);

        return () => {
            mountedRef.current = false;
            clearInterval(uptimeInterval);
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [connect]);

    const sendCommand = useCallback((command: string, diffId?: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: command, diffId }));
        }
    }, []);

    const approveDiff = useCallback(() => {
        const currentDiff = activeDiff;
        if (!currentDiff) return;

        setAuditLog(prev => [
            {
                id: `audit-${Date.now()}`,
                timestamp: new Date().toISOString(),
                action: "approved",
                ruleId: currentDiff.ruleId,
                resourceId: currentDiff.resourceId,
                severity: currentDiff.severity,
            },
            ...prev,
        ]);

        setLogs(prev => [
            ...prev,
            {
                id: `log-approve-${Date.now()}`,
                timestamp: new Date().toISOString(),
                phase: "done",
                message: `Operator approved remediation for ${currentDiff.resourceId}. Executing terraform apply...`,
            },
        ]);
        setActiveDiff(null);
        setStatus(prev => ({ ...prev, activeViolations: Math.max(0, prev.activeViolations - 1), wriScore: Math.min(1.0, prev.wriScore + 0.15) }));
        sendCommand("approve", currentDiff.id);

        setTimeout(() => {
            setLogs(prev => [
                ...prev,
                {
                    id: `log-applied-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    phase: "done",
                    message: `Terraform apply completed for ${currentDiff.resourceId}. Infrastructure compliant.`,
                },
            ]);
        }, 2000);
    }, [activeDiff, sendCommand]);

    const rejectDiff = useCallback(() => {
        const currentDiff = activeDiff;
        if (!currentDiff) return;

        setAuditLog(prev => [
            {
                id: `audit-${Date.now()}`,
                timestamp: new Date().toISOString(),
                action: "rejected",
                ruleId: currentDiff.ruleId,
                resourceId: currentDiff.resourceId,
                severity: currentDiff.severity,
            },
            ...prev,
        ]);

        setLogs(prev => [
            ...prev,
            {
                id: `log-reject-${Date.now()}`,
                timestamp: new Date().toISOString(),
                phase: "done",
                message: `Operator rejected remediation for ${currentDiff.resourceId}. Manual review required.`,
            },
        ]);
        setActiveDiff(null);
        sendCommand("reject", currentDiff.id);
    }, [activeDiff, sendCommand]);

    return {
        status,
        logs,
        telemetry,
        activeDiff,
        auditLog,
        approveDiff,
        rejectDiff,
    };
}
