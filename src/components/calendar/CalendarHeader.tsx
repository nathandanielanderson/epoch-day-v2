'use client';

import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function fmtOffsetLabel(mins: number) {
    const sign = mins >= 0 ? '+' : '−';
    const abs = Math.abs(mins);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
}

const OFFSET_OPTIONS: number[] = Array.from(
    { length: 27 },
    (_, i) => (i - 12) * 60
)
    .concat([-150, 330, 345, 390, 525, 570, 630])
    .sort((a, b) => a - b);

type Props = {
    currentDate: Date;
    onChangeDate: (d: Date) => void;
    offsetMinutes: number;
    onChangeOffset: (m: number) => void;
    currentEpoch?: number | null;
};

export default function CalendarHeader({
    currentDate,
    onChangeDate,
    offsetMinutes,
    onChangeOffset,
    currentEpoch,
}: Props) {
    // Load cached offset on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('epoch_offset_minutes');
            if (saved !== null) {
                const parsed = Number(saved);
                if (Number.isFinite(parsed) && parsed !== offsetMinutes) {
                    onChangeOffset(parsed);
                }
            }
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onChangeOffset]);

    // Persist offset on change
    useEffect(() => {
        try {
            localStorage.setItem('epoch_offset_minutes', String(offsetMinutes));
        } catch { }
    }, [offsetMinutes]);

    const handlePrev = () => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() - 1);
        onChangeDate(d);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() + 1);
        onChangeDate(d);
    };

    const handleNow = () => {
        onChangeDate(new Date());
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-4 w-full">
            {/* Top row: Title and Timezone */}
            <div className="flex items-center justify-center gap-3">
                <div className="text-xl font-medium text-zinc-300 tracking-tight">
                    Epoch Calendar
                </div>

                <label className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <span>Timezone</span>
                    <select
                        className="bg-zinc-900/50 text-zinc-200 rounded-md px-2 py-1 text-[10px] outline-none ring-1 ring-zinc-800 hover:ring-zinc-700 transition"
                        value={offsetMinutes}
                        onChange={(e) => onChangeOffset(Number(e.target.value))}
                    >
                        <option value={0}>{fmtOffsetLabel(0)} (Default)</option>
                        {OFFSET_OPTIONS.filter((m) => m !== 0).map((m) => (
                            <option key={m} value={m}>
                                {fmtOffsetLabel(m)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Main row: Current Epoch (Left) + Month Nav (Center) */}
            <div className="relative flex items-center justify-center mt-4 w-full h-16">

                {/* Inline Current Epoch - Left Aligned */}
                <div className="hidden sm:flex absolute left-4 bottom-[2px] flex-col items-start px-2">
                    <span className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mb-1.5 opacity-80">
                        Current Epoch
                    </span>
                    {currentEpoch ? (
                        <div className="text-3xl font-bold tracking-tight text-white leading-none">
                            Epoch {currentEpoch}
                        </div>
                    ) : (
                        <div className="h-[30px] w-[140px] animate-pulse bg-zinc-800/50 rounded leading-none" />
                    )}
                </div>

                {/* Month/Date Navigation - Centered */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[2px] flex items-center justify-center gap-2">
                    <button
                        className="rounded-lg bg-zinc-900/50 p-2 hover:bg-zinc-800 hover:text-white text-zinc-300 transition"
                        onClick={handlePrev}
                        title="Previous month"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="w-56 text-center text-3xl font-bold tracking-tight text-white leading-none">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>

                    <button
                        className="rounded-lg bg-zinc-900/50 p-2 hover:bg-zinc-800 hover:text-white text-zinc-300 transition"
                        onClick={handleNext}
                        title="Next month"
                    >
                        <ChevronRight size={20} />
                    </button>

                    {/* Today Button - Hugging right side */}
                    <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-[100%] ml-4">
                        <button
                            className="rounded-lg bg-zinc-900 px-4 py-[6px] hover:bg-zinc-800 hover:text-white text-zinc-300 text-sm font-medium transition whitespace-nowrap"
                            onClick={handleNow}
                        >
                            Today
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
