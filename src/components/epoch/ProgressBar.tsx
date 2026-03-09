// src/components/epoch/ProgressBar.tsx
'use client';

import React from 'react';
import type { DayTick } from '../../types/ui';
import { formatDayAndTimeWithOffset } from '../../lib/offset-tz';

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
    epochStartMs,
    epochEndMs,
    offsetMinutes = 0,
}: {
    pct: number | null;
    avgSlotMs: number | null;
    dayTicks: DayTick[];
    epochStartMs?: number | null;
    epochEndMs?: number | null;
    offsetMinutes?: number;
}) {
    const [hoverTime, setHoverTime] = React.useState<number | null>(null);
    const [hoverPos, setHoverPos] = React.useState<number | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const pctClamped =
        pct == null
            ? null
            : Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || !epochStartMs || !epochEndMs) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, x / width));

        const duration = epochEndMs - epochStartMs;
        const timestamp = epochStartMs + duration * percentage;

        setHoverPos(percentage * 100);
        setHoverTime(timestamp);
    };

    const handleMouseLeave = () => {
        setHoverTime(null);
        setHoverPos(null);
    };

    const formatHoverTime = (ts: number) => {
        return formatDayAndTimeWithOffset(ts, offsetMinutes);
    };

    return (
        <div className="w-full">
            <div className="mb-2 text-xs text-zinc-500">
                Avg slot: {formatMs(avgSlotMs)}
            </div>

            <div
                className="relative h-4 w-full rounded bg-zinc-800 overflow-visible group cursor-crosshair"
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* filled portion */}
                <div
                    className="absolute left-0 top-0 h-full bg-zinc-200 transition-[width] duration-500 rounded-l"
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
                            className="absolute top-0 h-full pointer-events-none"
                            style={{ left: `${posPct}%`, transform: 'translateX(-50%)' }}
                            aria-hidden="true"
                        >
                            <div className={`w-px h-full ${colorClass}`} />
                        </div>
                    );
                })}

                {/* Hover Tooltip */}
                {hoverTime && hoverPos !== null && (
                    <div
                        className="absolute bottom-full mb-2 -translate-x-1/2 z-10 pointer-events-none"
                        style={{ left: `${hoverPos}%` }}
                    >
                        <div className="bg-zinc-900 text-white text-xs px-2 py-1 rounded border border-zinc-700 whitespace-nowrap shadow-xl font-mono">
                            {formatHoverTime(hoverTime)}
                        </div>
                        {/* Little triangle arrow */}
                        <div className="w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 transform rotate-45 absolute left-1/2 -bottom-1 -translate-x-1/2"></div>
                    </div>
                )}
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
                            className="absolute -translate-x-1/2 text-[16px] text-zinc-400 pointer-events-none"
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
