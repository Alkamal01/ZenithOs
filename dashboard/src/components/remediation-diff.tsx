"use client";

import { RemediationDiffData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactDiffViewer from "react-diff-viewer-continued";
import { Play, X } from "lucide-react";

interface RemediationDiffProps {
    diffData: RemediationDiffData | null;
    onApprove: () => void;
    onReject: () => void;
}

export function RemediationDiff({ diffData, onApprove, onReject }: RemediationDiffProps) {
    if (!diffData) {
        return (
            <Card className="h-full border-slate-800 bg-[#0c0c0e] shadow-2xl flex items-center justify-center flex-col text-slate-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="font-medium">No Active Misconfigurations</p>
                <p className="text-sm">Infrastructure is perfectly aligned with CIS Benchmarks.</p>
            </Card>
        );
    }

    return (
        <Card className="h-full border-red-900/50 bg-[#0c0c0e] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="bg-red-950/20 border-b border-red-900/30 py-3 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-red-400 flex items-center text-sm font-semibold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
                        REMEDIATION PROPOSAL
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                        <span>Target: {diffData.resourceId}</span>
                        <span>|</span>
                        <span>Rule: {diffData.ruleId}</span>
                    </div>
                </div>
                <Badge variant="destructive" className="bg-red-900/80 hover:bg-red-900/80">
                    {diffData.severity} RISK
                </Badge>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-auto bg-[#1e1e1e] min-h-0">
                <div className="text-xs p-4">
                    <ReactDiffViewer
                        oldValue={diffData.diff.split('+++')[0] + '+++ b/' + diffData.resourceId + '.tf'}
                        newValue={diffData.diff}
                        splitView={false}
                        useDarkTheme={true}
                        hideLineNumbers={false}
                        showDiffOnly={false}
                        styles={{
                            variables: {
                                dark: {
                                    diffViewerBackground: '#1e1e1e',
                                    diffViewerColor: '#d4d4d4',
                                    addedBackground: '#233f24',
                                    addedColor: '#4ec9b0',
                                    removedBackground: '#4a2323',
                                    removedColor: '#f14c4c',
                                    wordAddedBackground: '#2f5b32',
                                    wordRemovedBackground: '#6c2929',
                                    addedGutterBackground: '#233f24',
                                    removedGutterBackground: '#4a2323',
                                    gutterBackground: '#1e1e1e',
                                    gutterBackgroundDark: '#1e1e1e',
                                    highlightBackground: '#2a2d2e',
                                    highlightGutterBackground: '#2a2d2e',
                                }
                            },
                            line: {
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                fontSize: '12px',
                            }
                        }}
                    />
                </div>
            </CardContent>

            <CardFooter className="bg-slate-900/50 border-t border-slate-800 p-3 flex justify-end space-x-2">
                <Button variant="outline" onClick={onReject} className="border-slate-700 hover:bg-slate-800 text-slate-300">
                    <X className="w-4 h-4 mr-2" />
                    Reject
                </Button>
                <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                    <Play className="w-4 h-4 mr-2" />
                    Approve & Apply
                </Button>
            </CardFooter>
        </Card>
    );
}
