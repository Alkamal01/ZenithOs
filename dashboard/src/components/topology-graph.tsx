"use client";

import { useMemo } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    Edge,
    Node,
    MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TopologyNodeData } from "@/lib/types";

// Custom Node Component to render health status beautifully
function InfrastructureNode({ data }: { data: TopologyNodeData }) {
    let bgColor = "bg-green-500/10";
    let borderColor = "border-green-500/50";
    let textColor = "text-green-400";
    let pulse = "";

    if (data.health === "risk") {
        bgColor = "bg-amber-500/10";
        borderColor = "border-amber-500/50";
        textColor = "text-amber-400";
    } else if (data.health === "violation") {
        bgColor = "bg-red-500/10";
        borderColor = "border-red-500/80";
        textColor = "text-red-400";
        pulse = "animate-pulse";
    }

    return (
        <div className={`px-4 py-2 shadow-md rounded-md border-2 bg-[#0c0c0e] ${borderColor}`}>
            <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${bgColor.replace('/10', '')} ${pulse}`} />
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-200">{data.label}</span>
                    <span className={`text-xs font-mono uppercase ${textColor}`}>{data.health}</span>
                </div>
            </div>
        </div>
    );
}

const nodeTypes = {
    infrastructure: InfrastructureNode,
};

interface TopologyGraphProps {
    hasActiveViolation: boolean;
}

export function TopologyGraph({ hasActiveViolation }: TopologyGraphProps) {
    const nodes: Node<TopologyNodeData>[] = useMemo(() => [
        {
            id: "lb",
            type: "infrastructure",
            position: { x: 250, y: 50 },
            data: { label: "Ingress ALB", type: "load_balancer", health: "healthy" }
        },
        {
            id: "api1",
            type: "infrastructure",
            position: { x: 100, y: 150 },
            data: { label: "API Gateway (us-east)", type: "gateway", health: "healthy" }
        },
        {
            id: "api2",
            type: "infrastructure",
            position: { x: 400, y: 150 },
            data: { label: "API Gateway (eu-west)", type: "gateway", health: "healthy" }
        },
        {
            id: "sg",
            type: "infrastructure",
            position: { x: 250, y: 250 },
            data: {
                label: "Prod Security Group",
                type: "security_group",
                health: hasActiveViolation ? "violation" : "healthy"
            }
        },
        {
            id: "db",
            type: "infrastructure",
            position: { x: 250, y: 350 },
            data: { label: "Primary Database", type: "database", health: "healthy" }
        }
    ], [hasActiveViolation]);

    const edges: Edge[] = useMemo(() => [
        { id: "e1", source: "lb", target: "api1", animated: true, style: { stroke: '#475569' } },
        { id: "e2", source: "lb", target: "api2", animated: true, style: { stroke: '#475569' } },
        {
            id: "e3",
            source: "api1",
            target: "sg",
            animated: true,
            style: { stroke: hasActiveViolation ? '#f87171' : '#475569', strokeWidth: hasActiveViolation ? 2 : 1 },
            markerEnd: { type: MarkerType.ArrowClosed, color: hasActiveViolation ? '#f87171' : '#475569' },
        },
        {
            id: "e4",
            source: "api2",
            target: "sg",
            animated: true,
            style: { stroke: hasActiveViolation ? '#f87171' : '#475569' },
            markerEnd: { type: MarkerType.ArrowClosed, color: hasActiveViolation ? '#f87171' : '#475569' },
        },
        { id: "e5", source: "sg", target: "db", animated: true, style: { stroke: '#475569' } },
    ], [hasActiveViolation]);

    return (
        <div className="h-full w-full bg-[#050505] rounded-xl border border-slate-800 overflow-hidden relative">
            <div className="absolute top-4 left-4 z-10 text-xs font-mono text-slate-500 uppercase tracking-widest hidden md:block">
                Live Topology Graph
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                className="dark"
                minZoom={0.5}
                maxZoom={2}
            >
                <Background color="#1e293b" gap={16} size={1} />
                <Controls className="fill-slate-400 [&>button]:bg-slate-900 [&>button]:border-slate-800 [&>button:hover]:bg-slate-800" />
            </ReactFlow>
        </div>
    );
}
