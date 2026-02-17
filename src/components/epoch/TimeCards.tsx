// src/components/epoch/TimeCards.tsx
'use client';
import React from 'react';
import { formatDayAndTimeWithOffset } from '../../lib/offset-tz';

export function TimeCards({
    startMs,
    endMs,
    offsetMinutes,
}: {
    startMs: number | null | undefined;
    endMs: number | null | undefined;
    offsetMinutes: number; // minutes relative to UTC
}) {
    return (
        <div className="grid grid-cols-2 gap-3 text-left text-sm">
            <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs uppercase text-zinc-500">Epoch Start</div>
                <div className="mt-1 font-medium">
                    {formatDayAndTimeWithOffset(startMs ?? null, offsetMinutes)}
                </div>
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-3">
                <div className="text-xs uppercase text-zinc-500">Epoch End</div>
                <div className="mt-1 font-medium">
                    {formatDayAndTimeWithOffset(endMs ?? null, offsetMinutes)}
                </div>
            </div>
        </div>
    );
}
