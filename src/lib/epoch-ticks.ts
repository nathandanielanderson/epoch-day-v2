// src/lib/epoch-ticks.ts
import type { DayTick } from '../types/ui';

/**
 * Generate tick marks at each day boundary between [startMs, endMs),
 * shifted by a fixed offset (minutes). Offsets let the UI show “midnight”
 * in the user’s chosen timezone without changing server time math.
 *
 * - startMs / endMs: epoch milliseconds
 * - offsetMinutes: minutes added for labeling/segmenting days
 *
 * Returns DayTick[] with:
 *  - atMs: actual UTC ms of the boundary (no offset applied)
 *  - xPct: position along the bar in [0..100]
 *  - label: short "Mon D" label using the offset clock
 */
export function dayBoundaryTicksOffset(
    startMs: number,
    endMs: number,
    offsetMinutes: number
): DayTick[] {
    if (!(Number.isFinite(startMs) && Number.isFinite(endMs)) || endMs <= startMs) {
        return [];
    }

    const offsetMs = offsetMinutes * 60_000;
    const span = endMs - startMs;
    const DAY = 86_400_000;

    // Work in an "offset clock" where local midnight aligns to whole-day multiples
    const startAdj = startMs + offsetMs;
    const endAdj = endMs + offsetMs;

    // First boundary strictly after start (so we don’t draw at 0%)
    const firstAdjBoundary = Math.floor(startAdj / DAY) * DAY + DAY;

    const ticks: DayTick[] = [];
    for (let tAdj = firstAdjBoundary; tAdj < endAdj; tAdj += DAY) {
        const atMs = tAdj - offsetMs; // convert back to real UTC wall clock
        const xPct = ((atMs - startMs) / span) * 100;

        ticks.push({
            atMs,
            xPct: clamp01to100(xPct),
            label: formatDayLabel(atMs + offsetMs),
        });
    }

    return ticks;
}

function clamp01to100(x: number): number {
    if (!Number.isFinite(x)) return 0;
    if (x < 0) return 0;
    if (x > 100) return 100;
    return x;
}

function formatDayLabel(msInOffsetClock: number): string {
    // shift forward one full local day (in ms)
    const d = new Date(msInOffsetClock + 86_400_000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
