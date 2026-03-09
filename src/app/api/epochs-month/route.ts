import { NextResponse } from "next/server";
import { getHistoricalEpochs, getEpochById } from "@/lib/data";
import { getLiveEpochInfo } from "@/lib/solana";
import { EpochData } from "@/lib/types";

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
        // Compute timeframe boundaries
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

        // Pad boundaries to ensure we grab spanning epochs that start/end in adjacent months but overlap the grid
        const startWindowMs = firstDayOfMonth.getTime() - (14 * 24 * 60 * 60 * 1000); // 14 days padding backwards
        const endWindowMs = lastDayOfMonth.getTime() + (14 * 24 * 60 * 60 * 1000);   // 14 days padding forwards

        // 1. Fetch all cached historical epochs
        const allEpochs = await getHistoricalEpochs();

        // 2. Filter for epochs that intersect the padded month window
        let overlappingEpochs = allEpochs.filter(e => {
            if (!e.start_time_unix || !e.end_time_unix) return false;
            const eStartMs = e.start_time_unix * 1000;
            const eEndMs = e.end_time_unix * 1000;
            return (eStartMs <= endWindowMs) && (eEndMs >= startWindowMs);
        }).map(e => ({
            ...e,
            isCurrent: false,
            isProjection: false
        }));

        // 3. To be complete, we also need to include the live epoch if it overlaps
        let liveInfo: Awaited<ReturnType<typeof getLiveEpochInfo>> | undefined;
        try {
            liveInfo = await getLiveEpochInfo();
            // Try to resolve the live epoch details
            if (liveInfo) {
                const avgSlotMs = 400; // Estimated
                const liveEpochData = overlappingEpochs.find(e => e.epoch === liveInfo?.epoch);
                let currentEpochEndMs = 0;

                // If the live epoch isn't already in our historical json
                if (!liveEpochData) {
                    const remainingSlots = liveInfo.slotsInEpoch - liveInfo.slotIndex;
                    const remainingMs = remainingSlots * avgSlotMs;
                    const now = Date.now();
                    const eStartMs = now - (liveInfo.slotIndex * avgSlotMs);
                    const eEndMs = now + remainingMs;
                    currentEpochEndMs = eEndMs;

                    // Check intersection
                    if ((eStartMs <= endWindowMs) && (eEndMs >= startWindowMs)) {
                        overlappingEpochs.push({
                            epoch: liveInfo.epoch,
                            start_slot: liveInfo.absoluteSlot - liveInfo.slotIndex,
                            end_slot: liveInfo.absoluteSlot + remainingSlots,
                            start_time_unix: Math.floor(eStartMs / 1000),
                            end_time_unix: Math.floor(eEndMs / 1000),
                            slots_per_epoch: liveInfo.slotsInEpoch,
                            duration_seconds: Math.floor((eEndMs - eStartMs) / 1000),
                            isCurrent: true,
                            isProjection: false
                        } as unknown as typeof overlappingEpochs[0]);
                    }
                } else {
                    liveEpochData.isCurrent = true;
                    if (liveEpochData.end_time_unix) {
                        currentEpochEndMs = liveEpochData.end_time_unix * 1000;
                    }
                }

                // Project future epochs until we surpass month view window
                if (currentEpochEndMs > 0) {
                    let projEpoch = liveInfo.epoch + 1;
                    let projStartMs = currentEpochEndMs;
                    const durationMs = liveInfo.slotsInEpoch * avgSlotMs;

                    while (projStartMs <= endWindowMs) {
                        const projEndMs = projStartMs + durationMs;

                        if ((projStartMs <= endWindowMs) && (projEndMs >= startWindowMs)) {
                            overlappingEpochs.push({
                                epoch: projEpoch,
                                start_slot: liveInfo.absoluteSlot + ((projEpoch - liveInfo.epoch) * liveInfo.slotsInEpoch),
                                end_slot: liveInfo.absoluteSlot + ((projEpoch + 1 - liveInfo.epoch) * liveInfo.slotsInEpoch),
                                start_time_unix: Math.floor(projStartMs / 1000),
                                end_time_unix: Math.floor(projEndMs / 1000),
                                slots_per_epoch: liveInfo.slotsInEpoch,
                                duration_seconds: Math.floor(durationMs / 1000),
                                isCurrent: false,
                                isProjection: true
                            } as unknown as typeof overlappingEpochs[0]);
                        }

                        projEpoch++;
                        projStartMs = projEndMs;
                    }
                }
            }
        } catch (e) {
            console.error("[api/epochs-month] Error fetching live info:", e);
        }

        // Sort descending
        overlappingEpochs = overlappingEpochs.sort((a, b) => b.epoch - a.epoch);

        return NextResponse.json(overlappingEpochs, {
            headers: {
                'Cache-Control': 'public, max-age=60', // Short cache for live updates
            }
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
