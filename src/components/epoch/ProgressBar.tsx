// src/components/epoch/ProgressBar.tsx
'use client';

import React from 'react';
import type { DayTick } from '../../types/ui';

function formatMs(ms?: number | null) {
    if (ms == null) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

export function ProgressBar({
    pct,
    avgSlotMs,
    dayTicks,
}: {
    pct: number | null;
    avgSlotMs: number | null;
    dayTicks: DayTick[];
}) {
    const pctClamped =
        pct == null
            ? null
            : Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

    return (
        <div className="w-full">
            <div className="mb-2 text-xs text-zinc-500">
                Avg slot: {formatMs(avgSlotMs)}
            </div>

            <div className="relative h-4 w-full rounded bg-zinc-800 overflow-hidden">
                {/* filled portion */}
                <div
                    className="absolute left-0 top-0 h-full bg-zinc-200 transition-[width] duration-500"
                    style={{ width: `${pctClamped ?? 0}%` }}
                />

                {/* day ticks */}
                {dayTicks.map((t, i) => {
                    // accept either 0–100 (xPct) or 0–1 (position)
                    const posPct =
                        t.xPct != null
                            ? Math.max(0, Math.min(100, t.xPct))
                            : t.position != null
                                ? Math.max(0, Math.min(100, t.position * 100))
                                : 0;

                    const isPast = pctClamped != null && posPct <= pctClamped;
                    const colorClass = isPast ? 'bg-zinc-700/70' : 'bg-white/50';

                    return (
                        <div
                            key={`${t.atMs}-${i}`}
                            className="absolute top-0 h-full"
                            style={{ left: `${posPct}%`, transform: 'translateX(-50%)' }}
                            aria-hidden="true"
                        >
                            <div className={`w-px h-full ${colorClass}`} />
                        </div>
                    );
                })}
            </div>

            {/* tick labels */}
            <div className="relative mt-2 h-4">
                {dayTicks.map((t, i) => {
                    const posPct =
                        t.xPct != null
                            ? Math.max(0, Math.min(100, t.xPct))
                            : t.position != null
                                ? Math.max(0, Math.min(100, t.position * 100))
                                : 0;

                    return (
                        <div
                            key={`label-${t.atMs}-${i}`}
                            className="absolute -translate-x-1/2 text-[16px] text-zinc-400"
                            style={{ left: `${posPct}%` }}
                        >
                            {t.label}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
