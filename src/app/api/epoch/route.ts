import { NextResponse } from "next/server";
import { getLiveEpochInfo, fetchEpochBoundary } from "@/lib/solana";
import { getEpochById, saveEpoch } from "@/lib/data";
import { EpochPayload } from "@/types/ui";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const epochParam = searchParams.get('epoch');
    const targetEpoch = epochParam ? parseInt(epochParam, 10) : null;

    try {
        // ── Historical epoch request ───────────────────────────
        if (targetEpoch != null) {
            // 1. Try local cache first (fast, no RPC)
            const stored = await getEpochById(targetEpoch);

            if (stored) {
                const payload: EpochPayload = {
                    tz: 'UTC',
                    epoch: stored.epoch,
                    slotsInEpoch: stored.slots_per_epoch,
                    slotIndex: null,
                    absoluteSlot: null,
                    progressPercent: 100,
                    epochStartMs: stored.start_time_unix ? stored.start_time_unix * 1000 : null,
                    endTimeMs: stored.end_time_unix ? stored.end_time_unix * 1000 : null,
                    remainingMs: 0,
                    avgSlotMs: stored.duration_seconds
                        ? (stored.duration_seconds * 1000 / stored.slots_per_epoch)
                        : 400,
                    isProjection: false,
                    updatedAt: Date.now(),
                    sources: { start: 'local-json', end: 'local-json' }
                };

                return NextResponse.json(payload, {
                    headers: {
                        'Cache-Control': 'public, max-age=86400, immutable',
                    }
                });
            }

            // 2. Check if it's the current live epoch
            let liveInfo;
            try {
                liveInfo = await getLiveEpochInfo();
            } catch {
                // RPC down — can't resolve anything
            }

            if (liveInfo && targetEpoch === liveInfo.epoch) {
                // It's the current epoch — fall through to live logic below
            } else if (liveInfo && targetEpoch > liveInfo.epoch) {
                // Future epoch — project timing
                const avgSlotMs = 400;
                const msPerEpoch = liveInfo.slotsInEpoch * avgSlotMs;
                const now = Date.now();
                const currentStart = now - (liveInfo.slotIndex * avgSlotMs);
                const diff = targetEpoch - liveInfo.epoch;
                const projectedStart = currentStart + (diff * msPerEpoch);
                const projectedEnd = projectedStart + msPerEpoch;

                const payload: EpochPayload = {
                    tz: 'UTC',
                    epoch: targetEpoch,
                    slotsInEpoch: liveInfo.slotsInEpoch,
                    slotIndex: 0,
                    absoluteSlot: null,
                    progressPercent: 0,
                    epochStartMs: projectedStart,
                    endTimeMs: projectedEnd,
                    remainingMs: projectedStart - now,
                    avgSlotMs,
                    isProjection: true,
                    updatedAt: Date.now(),
                    sources: { start: 'predicted', end: 'predicted' }
                };

                return NextResponse.json(payload, {
                    headers: { 'Cache-Control': 'public, max-age=60' }
                });
            } else {
                // 3. Not in cache, not current, not future →
                //    This is a past epoch we haven't fetched yet.
                //    Resolve it from RPC on-demand.
                console.log(`[api/epoch] Epoch ${targetEpoch} not in cache. Fetching from RPC...`);

                const boundary = await fetchEpochBoundary(targetEpoch);

                if (boundary && boundary.start_time_unix && boundary.end_time_unix) {
                    // Save to epochs.json so we never need to fetch it again
                    await saveEpoch(boundary);

                    const payload: EpochPayload = {
                        tz: 'UTC',
                        epoch: boundary.epoch,
                        slotsInEpoch: boundary.slots_per_epoch,
                        slotIndex: null,
                        absoluteSlot: null,
                        progressPercent: 100,
                        epochStartMs: boundary.start_time_unix * 1000,
                        endTimeMs: boundary.end_time_unix * 1000,
                        remainingMs: 0,
                        avgSlotMs: boundary.duration_seconds
                            ? (boundary.duration_seconds * 1000 / boundary.slots_per_epoch)
                            : 400,
                        isProjection: false,
                        updatedAt: Date.now(),
                        sources: { start: 'rpc-live', end: 'rpc-live' }
                    };

                    return NextResponse.json(payload, {
                        headers: {
                            'Cache-Control': 'public, max-age=86400, immutable',
                        }
                    });
                }

                return NextResponse.json(
                    { error: `Epoch ${targetEpoch} not found` },
                    { status: 404 }
                );
            }
        }

        // ── Live / current epoch ───────────────────────────────
        const liveInfo = await getLiveEpochInfo();

        const avgSlotMs = 400;
        const remainingSlots = liveInfo.slotsInEpoch - liveInfo.slotIndex;
        const remainingMs = remainingSlots * avgSlotMs;
        const now = Date.now();
        const startMs = now - (liveInfo.slotIndex * avgSlotMs);
        const endMs = now + remainingMs;

        const payload: EpochPayload = {
            tz: 'UTC',
            epoch: liveInfo.epoch,
            slotsInEpoch: liveInfo.slotsInEpoch,
            slotIndex: liveInfo.slotIndex,
            absoluteSlot: liveInfo.absoluteSlot,
            progressPercent: liveInfo.progress,
            epochStartMs: startMs,
            endTimeMs: endMs,
            remainingMs,
            avgSlotMs,
            isProjection: true,
            updatedAt: Date.now(),
            sources: { start: 'estimated', end: 'predicted' }
        };

        return NextResponse.json(payload, {
            headers: { 'Cache-Control': 'public, max-age=5' }
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
