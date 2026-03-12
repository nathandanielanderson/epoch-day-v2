import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { CalendarEvent, EpochData } from "@/lib/types";
import { getHistoricalEpochs } from "@/lib/data";
import { getLiveEpochInfo } from "@/lib/solana";

const EVENTS_FILE = process.env.EVENTS_FILE || path.join(process.cwd(), "public", "events.json");

/**
 * Resolve an epoch number to its start_time_unix.
 * Checks historical data first, then projects from the live epoch for future epochs.
 */
async function resolveEpochStartTime(
    targetEpoch: number,
    epochsMap: Record<number, EpochData>
): Promise<number | null> {
    // 1. Check historical data
    if (epochsMap[targetEpoch]?.start_time_unix) {
        return epochsMap[targetEpoch].start_time_unix;
    }

    // 2. Project from live epoch
    try {
        const liveInfo = await getLiveEpochInfo();
        if (!liveInfo) return null;

        const avgSlotMs = 400;
        const durationMs = liveInfo.slotsInEpoch * avgSlotMs;

        // Calculate where the current live epoch started and ends
        const now = Date.now();
        const liveEpochStartMs = now - (liveInfo.slotIndex * avgSlotMs);
        const liveEpochEndMs = liveEpochStartMs + durationMs;

        if (targetEpoch === liveInfo.epoch) {
            return Math.floor(liveEpochStartMs / 1000);
        }

        // Project forward or backward from live epoch
        const epochDiff = targetEpoch - liveInfo.epoch;
        const projectedStartMs = liveEpochEndMs + ((epochDiff - 1) * durationMs);
        return Math.floor(projectedStartMs / 1000);
    } catch (e) {
        console.error("[resolveEpochStartTime] Error:", e);
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    if (!yearStr || !monthStr) {
        return NextResponse.json({ error: "Missing year or month" }, { status: 400 });
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month)) {
        return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    try {
        // Read events
        let eventsContent = "[]";
        try {
            eventsContent = await readFile(EVENTS_FILE, "utf-8");
        } catch (e: any) {
            if (e.code === 'ENOENT') return NextResponse.json([]);
            throw e;
        }

        const rawEvents = JSON.parse(eventsContent) as Partial<CalendarEvent>[];

        // Build epochs lookup from historical data
        let epochsMap: Record<number, EpochData> = {};
        try {
            const allEpochs = await getHistoricalEpochs();
            for (const val of allEpochs) {
                epochsMap[val.epoch] = val;
            }
        } catch { /* historical epochs unavailable */ }

        // Resolve events into fully-populated CalendarEvent objects
        const resolvedEvents: CalendarEvent[] = [];
        for (const e of rawEvents) {
            const resolved = { ...e } as CalendarEvent;

            if (e.epoch && !e.start_time_unix) {
                // Epoch-based event: resolve to epoch START DAY only (1hr window)
                const startUnix = await resolveEpochStartTime(e.epoch, epochsMap);
                if (startUnix) {
                    resolved.start_time_unix = startUnix;
                    resolved.end_time_unix = startUnix + 3600; // 1hr window — lands on one day
                } else {
                    continue; // Skip unresolvable events
                }
            } else if (e.date && !e.start_time_unix) {
                // Date-based event: place at noon UTC so it lands on the correct single day
                const d = new Date(e.date + 'T12:00:00Z');
                resolved.start_time_unix = Math.floor(d.getTime() / 1000);
                resolved.end_time_unix = resolved.start_time_unix + 3600;
            }

            if (resolved.start_time_unix && resolved.end_time_unix) {
                resolvedEvents.push(resolved);
            }
        }

        // Compute timeframe boundaries
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

        // Pad boundaries to overlap grid
        const startWindowMs = firstDayOfMonth.getTime() - (14 * 24 * 60 * 60 * 1000);
        const endWindowMs = lastDayOfMonth.getTime() + (14 * 24 * 60 * 60 * 1000);

        const overlappingEvents = resolvedEvents.filter(e => {
            const eStartMs = e.start_time_unix * 1000;
            const eEndMs = e.end_time_unix * 1000;
            return (eStartMs <= endWindowMs) && (eEndMs >= startWindowMs);
        });

        return NextResponse.json(overlappingEvents, {
            headers: {
                'Cache-Control': 'public, max-age=60',
            }
        });

    } catch (e) {
        console.error("[api/events-month] Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

