import { Connection } from "@solana/web3.js";

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

// Singleton connection
export const connection = new Connection(RPC_URL, "confirmed");

export interface LiveEpochInfo {
    epoch: number;
    slotIndex: number;
    slotsInEpoch: number;
    absoluteSlot: number;
    progress: number; // 0-1
}

// ── TTL cache for live epoch info ──────────────────────────
let liveCache: LiveEpochInfo | null = null;
let liveCacheExpiry = 0;
const LIVE_CACHE_TTL_MS = 10_000; // 10 seconds

export async function getLiveEpochInfo(): Promise<LiveEpochInfo> {
    const now = Date.now();

    if (liveCache && now < liveCacheExpiry) {
        return liveCache;
    }

    const info = await connection.getEpochInfo();

    liveCache = {
        epoch: info.epoch,
        slotIndex: info.slotIndex,
        slotsInEpoch: info.slotsInEpoch,
        absoluteSlot: info.absoluteSlot,
        progress: info.slotIndex / info.slotsInEpoch
    };
    liveCacheExpiry = now + LIVE_CACHE_TTL_MS;

    return liveCache;
}

// ── On-demand epoch boundary lookup ────────────────────────
// Used when a user requests an epoch that isn't in epochs.json yet.
// This resolves start/end block times from RPC and returns them.

interface EpochBoundary {
    epoch: number;
    start_slot: number;
    end_slot: number;
    start_time_unix: number | null;
    end_time_unix: number | null;
    duration_seconds: number | null;
    slots_per_epoch: number;
}

// Cache the epoch schedule (it never changes)
let cachedSchedule: { firstNormalEpoch: number; firstNormalSlot: number; slotsPerEpoch: number } | null = null;

async function getSchedule() {
    if (!cachedSchedule) {
        const schedule = await connection.getEpochSchedule();
        cachedSchedule = {
            firstNormalEpoch: schedule.firstNormalEpoch,
            firstNormalSlot: schedule.firstNormalSlot,
            slotsPerEpoch: schedule.slotsPerEpoch,
        };
    }
    return cachedSchedule;
}

/**
 * Probe forward from a slot to find the first available block time.
 * Some slots are skipped (no block produced), so we probe ahead.
 */
async function findBlockTime(startSlot: number, maxProbe = 50): Promise<number | null> {
    for (let i = 0; i < maxProbe; i++) {
        try {
            const time = await connection.getBlockTime(startSlot + i);
            if (time !== null) return time;
        } catch {
            // Slot skipped or unavailable, try next
        }
    }
    return null;
}

/**
 * Fetch epoch boundary times from RPC on demand.
 * Returns null if the epoch is invalid or times can't be resolved.
 */
export async function fetchEpochBoundary(epoch: number): Promise<EpochBoundary | null> {
    try {
        const schedule = await getSchedule();

        if (epoch < schedule.firstNormalEpoch) return null;

        const startSlot = (epoch - schedule.firstNormalEpoch) * schedule.slotsPerEpoch + schedule.firstNormalSlot;
        const endSlot = startSlot + schedule.slotsPerEpoch - 1;
        const nextEpochStartSlot = endSlot + 1;

        // Fetch start and end times sequentially to avoid rate limit issues
        const startTime = await findBlockTime(startSlot);
        const endTime = await findBlockTime(nextEpochStartSlot);

        if (startTime === null || endTime === null) return null;

        return {
            epoch,
            start_slot: startSlot,
            end_slot: endSlot,
            start_time_unix: startTime,
            end_time_unix: endTime,
            duration_seconds: endTime - startTime,
            slots_per_epoch: schedule.slotsPerEpoch,
        };
    } catch (e) {
        console.error(`[solana] Failed to fetch boundary for epoch ${epoch}:`, e);
        return null;
    }
}
