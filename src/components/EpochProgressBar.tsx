"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveEpochInfo {
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    progress: number;
}

export function EpochProgressBar() {
    const [info, setInfo] = useState<LiveEpochInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchInfo = async () => {
        try {
            const res = await fetch("/api/live-epoch");
            if (res.ok) {
                const data = await res.json();
                setInfo(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInfo();
        const interval = setInterval(fetchInfo, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading && !info) return <div className="h-24 animate-pulse bg-muted rounded-xl" />;

    if (!info) return <div className="text-red-500">Failed to load live epoch data</div>;

    const percentage = (info.progress * 100).toFixed(2);

    return (
        <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Epoch {info.epoch}</h2>
                    <p className="text-muted-foreground text-sm font-mono">
                        Slot {info.slotIndex.toLocaleString()} / {info.slotsInEpoch.toLocaleString()}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-4xl font-black text-primary">{percentage}%</span>
                </div>
            </div>

            <div className="relative h-4 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-in-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Live
                </div>
            </div>
        </div>
    );
}
