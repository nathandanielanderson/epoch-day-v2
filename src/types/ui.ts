// src/types/ui.ts

export type DayTick = {
    /** Either 0–100 (%) or 0–1 (fraction). Support both to avoid churn. */
    xPct?: number;        // preferred
    position?: number;    // legacy

    /** Label to render under the tick, e.g. "Oct 25" */
    label: string;

    /** Epoch milliseconds at the tick boundary */
    atMs: number;
};

export type SourceMeta = {
    start?: string;
    end?: string;
    remaining?: string;
};

export type EpochPayload = {
    host?: string;
    tz: string;

    epoch: number | null;

    // slot window info (nulls are fine for “cached only” paths)
    slotsInEpoch: number | null;
    slotIndex: number | null;
    absoluteSlot: number | null;

    // timing
    progressPercent: number | null;
    epochStartMs: number | null;
    endTimeMs: number | null;
    remainingMs: number | null;
    avgSlotMs: number | null;

    // flags/meta
    isProjection: boolean;
    sources?: SourceMeta;
    updatedAt: number | null;
};
