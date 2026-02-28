"use client";

import { useRef, useEffect } from "react";
import { SystemStatus } from "@/lib/types";

interface WriGaugeProps {
    status: SystemStatus;
}

export function WriGauge({ status }: WriGaugeProps) {
    const score = status.wriScore;
    const percentage = Math.round(score * 100);

    // Calculate color:
    // Red to Amber to Green transition
    let colorClass = "text-green-500";
    if (score < 0.7) colorClass = "text-red-500";
    else if (score < 0.9) colorClass = "text-amber-500";

    // Arc calculation for SVG
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    // Let the arc be 270 degrees (0.75 of circle)
    const arcLength = circumference * 0.75;
    const strokeDashoffset = arcLength - (arcLength * score);

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="text-sm text-slate-400 font-medium mb-2 tracking-wider">
                WEIGHTED RELIABILITY INDEX
            </div>
            <div className="relative w-40 h-40">
                <svg
                    className="w-full h-full transform -rotate-135"
                    viewBox="0 0 140 140"
                >
                    {/* Background Arc */}
                    <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={arcLength + " " + circumference}
                        className="text-slate-800"
                        strokeLinecap="round"
                    />
                    {/* Active Arc */}
                    <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={arcLength + " " + circumference}
                        strokeDashoffset={strokeDashoffset}
                        className={`${colorClass} transition-all duration-1000 ease-out`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-4">
                    <span className={`text-4xl font-bold font-mono tracking-tighter ${colorClass}`}>
                        {percentage}%
                    </span>
                    <span className="text-xs text-slate-500 uppercase mt-1">H(t)</span>
                </div>
            </div>

            {/* Sparkline (mocked for visual effect) */}
            <div className="w-full mt-4 h-12 flex items-end justify-between space-x-1 opacity-70" suppressHydrationWarning>
                {Array.from({ length: 20 }).map((_, i) => {
                    // simple pseudo-random wave
                    const height = 40 + Math.sin(i * 0.5) * 20 + Math.random() * 10;
                    return (
                        <div
                            key={i}
                            className={`w-full rounded-t-sm transition-all duration-700 ${i === 19 ? colorClass.replace('text', 'bg') : 'bg-slate-700'}`}
                            style={{ height: `${i === 19 ? score * 100 : height}%` }}
                            suppressHydrationWarning
                        />
                    );
                })}
            </div>
        </div>
    );
}
