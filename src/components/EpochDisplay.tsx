'use client';

import { useEffect, useMemo, useState } from 'react';
import EpochHeader from './epoch/EpochHeader';
import { ProgressBar } from './epoch/ProgressBar';
import { TimeCards } from './epoch/TimeCards';
import type { EpochPayload } from '../types/ui';
import { dayBoundaryTicksOffset } from '../lib/epoch-ticks';
import { formatWithOffset, formatDayAndTimeWithOffset } from '../lib/offset-tz';

function formatRemaining(ms: number | null): string {
    if (!ms || ms <= 0) return '—';
    const totalSec = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const STAKEWIZ_URL =
    'https://app.jpool.one/direct-staking?vote=nateBZg7oHVPLB2samBLkKvfzedU3ALZBexMFPMKjn1';

function formatOffset(minutes: number) {
    const sign = minutes >= 0 ? '+' : '−';
    const hh = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0');
    const mm = String(Math.abs(minutes) % 60).padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
}

export default function EpochDisplay() {
    const [data, setData] = useState<EpochPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [remainingMs, setRemainingMs] = useState<number | null>(null);

    const [liveMode, setLiveMode] = useState<boolean>(true);
    const [offsetMinutes, setOffsetMinutes] = useState<number>(0);

    const [epochInput, setEpochInput] = useState<string>('');
    const [targetEpoch, setTargetEpoch] = useState<number | null>(null);

    async function load(target?: number | null) {
        try {
            const qs = new URLSearchParams();
            qs.set('tz', 'UTC'); // API stays UTC; client applies offset
            if (target != null && Number.isFinite(target))
                qs.set('epoch', String(target));

            const url = `/api/epoch?${qs.toString()}`;
            console.log('[EpochDisplay] fetching:', url);

            const res = await fetch(url, {
                cache: 'no-store',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const raw = await res.json();
            console.log('[EpochDisplay] /api/epoch raw:', raw);

            // Normalize backend → EpochPayload (supports stored + forecast shapes)
            const startMs =
                raw.epochStartMs ??
                raw.startMs ??
                (typeof raw.start_time_unix === 'number'
                    ? raw.start_time_unix * 1000
                    : undefined) ??
                (typeof raw.start_time_iso === 'string'
                    ? Date.parse(raw.start_time_iso)
                    : undefined) ??
                null;

            const endMs =
                raw.endTimeMs ??
                raw.endMs ??
                (typeof raw.end_time_unix === 'number'
                    ? raw.end_time_unix * 1000
                    : undefined) ??
                (typeof raw.end_time_iso === 'string'
                    ? Date.parse(raw.end_time_iso)
                    : undefined) ??
                null;

            const avgSlotMs =
                raw.avgSlotMs ??
                (typeof raw.ms_per_slot === 'number'
                    ? Math.round(raw.ms_per_slot)
                    : undefined) ??
                null;

            const slotsInEpoch =
                raw.slotsInEpoch ??
                (typeof raw.slots_per_epoch === 'number'
                    ? raw.slots_per_epoch
                    : undefined) ??
                null;

            const projected = Boolean(raw.isProjection || raw.source === 'predicted');

            // Infer sources if server didn't provide them
            const inferredSources =
                raw.sources ??
                (projected
                    ? // If we have live progress (<100), we assume hybrid (observed start, projected end)
                    typeof raw.progressPercent === 'number' && raw.progressPercent < 100
                        ? { start: 'local-json', end: 'predicted' }
                        : { start: 'predicted', end: 'predicted' }
                    : { start: 'local-json', end: 'local-json' });

            const progressPercent =
                typeof raw.progressPercent === 'number'
                    ? raw.progressPercent
                    : typeof raw.progress_percent === 'number'
                        ? raw.progress_percent
                        : null;

            const json: EpochPayload = {
                host: raw.host ?? 'local',
                tz: raw.tz ?? 'UTC',
                epoch: typeof raw.epoch === 'number' ? raw.epoch : null,
                slotsInEpoch,
                slotIndex: raw.slotIndex ?? null,
                absoluteSlot: raw.absoluteSlot ?? null,
                progressPercent,
                epochStartMs: startMs,
                endTimeMs: endMs,
                remainingMs: raw.remainingMs ?? null,
                avgSlotMs,
                isProjection: projected,
                sources: inferredSources,
                updatedAt:
                    typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
            };

            console.log('[EpochDisplay] normalized payload:', json);

            setData(json);
            setRemainingMs(json.remainingMs ?? null);
            setError(null);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load';
            console.error('[EpochDisplay] load error:', msg, e);
            setError(msg);
        }
    }

    // initial + poll every 15s (useful if you keep "Now" selected)
    useEffect(() => {
        load(targetEpoch);
        const id = setInterval(() => {
            if (liveMode) load(targetEpoch);
        }, 15000);
        return () => clearInterval(id);
    }, [liveMode, targetEpoch]);

    // live countdown tick
    useEffect(() => {
        if (!data?.remainingMs) return;
        const id = setInterval(() => {
            setRemainingMs((ms) => (ms != null && ms > 1000 ? ms - 1000 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [data?.remainingMs]);

    useEffect(() => {
        if (liveMode && data?.epoch != null) {
            setEpochInput(String(data.epoch));
        }
    }, [data?.epoch, liveMode]);

    const pct = data?.progressPercent ?? null;
    const avgSlotMs = data?.avgSlotMs ?? null;

    // Rive expects 0–100; allow backend to send either 0–1 or 0–100
    const riveProgress =
        pct == null ? null : pct <= 1 && pct >= 0 ? pct * 100 : pct;

    useEffect(() => {
        console.log('[EpochDisplay] pct from payload:', pct);
        console.log('[EpochDisplay] riveProgress (0–100):', riveProgress);
    }, [pct, riveProgress]);

    // Hide the badge when it's the *current* epoch (has progress > 0)
    const showProjectionBadge =
        !!data?.isProjection &&
        !(
            data?.progressPercent != null &&
            data.progressPercent > 0 &&
            data.progressPercent < 100
        );

    const dayTicks = useMemo(() => {
        if (!data?.epochStartMs || !data?.endTimeMs) return [];
        return dayBoundaryTicksOffset(
            data.epochStartMs,
            data.endTimeMs,
            offsetMinutes,
        );
    }, [data?.epochStartMs, data?.endTimeMs, offsetMinutes]);

    const updatedAtText = useMemo(() => {
        if (!data?.updatedAt) return null;
        return formatWithOffset(data.updatedAt, offsetMinutes, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [data?.updatedAt, offsetMinutes]);

    // Footer source label
    const sourceLabel = useMemo(() => {
        const s = data?.sources;
        if (!s) return '—';
        if (s.start === 'predicted' && s.end === 'predicted') return 'predicted';
        if (s.start !== 'predicted' && s.end === 'predicted')
            return 'hybrid-predicted-end';
        if (s.start === 'predicted' && s.end !== 'predicted')
            return 'hybrid-predicted-start';
        return 'local-json';
    }, [data?.sources]);

    // Handlers
    const handleSubmit = (n: number) => {
        setLiveMode(false);
        setTargetEpoch(n);
        setRemainingMs(null);
        load(n);
    };

    const handlePrev = () => {
        const base = targetEpoch ?? data?.epoch;
        if (base != null && base > 0) {
            const n = base - 1;
            setLiveMode(false);
            setEpochInput(String(n));
            setTargetEpoch(n);
            setRemainingMs(null);
            load(n);
        }
    };

    const handleNext = () => {
        const base = targetEpoch ?? data?.epoch;
        if (base != null) {
            const n = base + 1;
            setLiveMode(false);
            setEpochInput(String(n));
            setTargetEpoch(n);
            setRemainingMs(null);
            load(n);
        }
    };

    const handleNow = () => {
        setLiveMode(true);
        setTargetEpoch(null);
        setEpochInput('');
        setRemainingMs(null);
        load(null);
    };

    return (
        <div className="relative mx-auto max-w-md p-6 text-center space-y-5">
            {/* Full-screen Rive background */}
            {/* <RiveEpochSun progress={riveProgress} /> */}
            {/* Global CTA */}
            <a
                href={STAKEWIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block fixed right-5 top-5 z-[100] rounded-md bg-zinc-900/80 px-4 py-2 text-sm font-semibold text-zinc-100 shadow-sm ring-1 ring-white/10 backdrop-blur hover:bg-zinc-900 hover:ring-white/20 transition"
            >
                Stake With Us
            </a>
            {/* Mobile-only CTA */}
            <a
                href={STAKEWIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 sm:hidden inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 px-6 py-3 text-sm font-semibold text-zinc-100 backdrop-blur hover:bg-white/20 transition"
            >
                Stake With Us
            </a>
            <EpochHeader
                epoch={data?.epoch}
                liveMode={liveMode}
                epochInput={epochInput}
                setEpochInput={setEpochInput}
                onPrev={handlePrev}
                onNext={handleNext}
                onSubmit={handleSubmit}
                onNow={handleNow}
                isProjection={showProjectionBadge}
                offsetMinutes={offsetMinutes}
                onChangeOffset={setOffsetMinutes}
            />

            <ProgressBar
                pct={pct}
                avgSlotMs={avgSlotMs}
                dayTicks={dayTicks}
                epochStartMs={data?.epochStartMs}
                epochEndMs={data?.endTimeMs}
                offsetMinutes={offsetMinutes}
            />

            {/* Live countdown / projected end */}
            <div className="text-xs text-zinc-500">
                {remainingMs != null && remainingMs > 0
                    ? `Time Remaining: ${formatRemaining(remainingMs)}`
                    : data?.endTimeMs
                        ? `Ends: ${formatDayAndTimeWithOffset(data.endTimeMs, offsetMinutes)}`
                        : '—'}
            </div>

            <TimeCards
                startMs={data?.epochStartMs ?? null}
                endMs={data?.endTimeMs ?? null}
                offsetMinutes={offsetMinutes}
            />

            {/* Meta */}
            <div className="text-xs text-zinc-500">
                {error
                    ? `Error: ${error}`
                    : updatedAtText
                        ? `Updated ${updatedAtText}`
                        : 'Loading…'}
            </div>

            {/* Optional source display */}
            {/* <div className="text-[10px] text-zinc-600">
        offset: {offsetMinutes >= 0 ? '+' : '−'}
        {String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0')}:
        {String(Math.abs(offsetMinutes) % 60).padStart(2, '0')}
        {' · '}source: {sourceLabel}
      </div> */}

            {/* Validator Identity / Branding */}
            <div className="mt-10 flex flex-col items-center gap-2">
                <div className="text-[14px] tracking-wide text-zinc-500">
                    Powered By
                </div>

                <a
                    href={STAKEWIZ_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-zinc-200 hover:text-white transition"
                >
                    Epoch.Day
                </a>

                <a
                    href={STAKEWIZ_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-85 hover:opacity-100 transition"
                    aria-label="Stake with Anderson & Anderson Validator (StakeWiz)"
                >
                    <img
                        src="/logo.png"
                        alt="Anderson & Anderson Validator"
                        className="h-26"
                    />
                </a>

                <a
                    href={STAKEWIZ_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-md font-semibold text-zinc-200 hover:text-white transition"
                >
                    Solana Validator
                </a>
            </div>
        </div>
    );
}
