// src/components/epoch/EpochHeader.tsx
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
    epoch: number | null | undefined;
    liveMode: boolean;

    epochInput: string;
    setEpochInput: (v: string) => void;
    onPrev: () => void;
    onNext: () => void;
    onSubmit: (n: number) => void;
    onNow: () => void;

    isProjection?: boolean;

    offsetMinutes: number;
    onChangeOffset: (m: number) => void;
};

function EpochHeaderImpl({
    epoch,
    liveMode,
    epochInput,
    setEpochInput,
    onPrev,
    onNext,
    onSubmit,
    onNow,
    isProjection,
    offsetMinutes,
    onChangeOffset,
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

    return (
        <div className="flex flex-col items-center justify-center gap-2">
            {/* Header row */}
            <div className="flex items-center justify-center gap-3">
                <div className="text-xl font-medium text-zinc-300 tracking-tight">
                    Solana Epoch
                </div>

                <label className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <span>Timezone</span>
                    <select
                        className="bg-zinc-900/50 text-zinc-200 rounded-md px-2 py-1 text-[10px] outline-none ring-1 ring-zinc-800 hover:ring-zinc-700"
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

            {/* Main row: arrows + large editable input + Now */}
            <div className="flex items-center justify-center gap-2 relative">
                <button
                    className="rounded-lg bg-zinc-900/50 p-2 hover:bg-zinc-800 text-zinc-300"
                    onClick={onPrev}
                    title="Previous epoch"
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="relative">
                    {/* String input, mobile-friendly, Enter works */}
                    <input
                        type="text"
                        inputMode="text"
                        enterKeyHint="go"
                        value={epochInput}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^\d]/g, '');
                            setEpochInput(val);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const n = parseInt(epochInput, 10);
                                if (!Number.isNaN(n) && n >= 0) {
                                    onSubmit(n);
                                    e.currentTarget.blur(); // 👈 hides keyboard
                                }
                            }
                        }}
                        placeholder={epoch != null ? String(epoch) : 'epoch…'}
                        className="w-44 text-center text-6xl font-semibold tracking-tight bg-transparent px-2 py-1 outline-none rounded-lg focus:ring-2 ring-zinc-700"
                        aria-label="Epoch number"
                    />

                    {isProjection && (
                        <div className="absolute -top-3 -right-6 rounded-full bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 border border-amber-500/30 font-medium tracking-wide">
                            Projection
                        </div>
                    )}
                </div>

                <button
                    className="rounded-lg bg-zinc-900/50 p-2 hover:bg-zinc-800 text-zinc-300"
                    onClick={onNext}
                    title="Next epoch"
                >
                    <ChevronRight size={18} />
                </button>

                <button
                    className="rounded-lg bg-zinc-900 px-3 py-2 hover:bg-zinc-800 ml-1"
                    onClick={onNow}
                >
                    Now
                </button>
            </div>
        </div>
    );
}

export const EpochHeader = EpochHeaderImpl;
export default EpochHeaderImpl;
