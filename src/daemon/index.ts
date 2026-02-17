import { Connection, EpochSchedule } from "@solana/web3.js";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import 'dotenv/config';

// ── Configuration ──────────────────────────────────────────────
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), "public", "epochs.json");
const POLLING_INTERVAL_MS = (process.env.CHECK_INTERVAL ? parseInt(process.env.CHECK_INTERVAL) : 60) * 1000;
const DELAY_BETWEEN_EPOCHS_MS = 500; // Pause between each epoch fetch to avoid rate limits
const DELAY_BETWEEN_RPC_MS = 200;    // Pause between individual RPC calls

interface EpochData {
    epoch: number;
    start_slot: number;
    end_slot: number;
    start_time_unix: number | null;
    end_time_unix: number | null;
    duration_seconds: number | null;
    slots_per_epoch: number;
}

const connection = new Connection(RPC_URL, "confirmed");

// ── Helpers ────────────────────────────────────────────────────

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Find the first available block time starting from a given slot.
 * Uses controlled delays between each probe to avoid rate limits.
 */
async function findFirstBlockTime(startSlot: number, maxProbe = 50): Promise<number | null> {
    for (let i = 0; i < maxProbe; i++) {
        const slot = startSlot + i;
        try {
            const time = await connection.getBlockTime(slot);
            if (time !== null) return time;
            // Slot exists but no block time, try next
            await sleep(DELAY_BETWEEN_RPC_MS);
        } catch (e: any) {
            const msg = String(e);
            if (msg.includes("429")) {
                // Rate limited — exponential backoff with jitter
                const backoff = Math.min(8000, 500 * Math.pow(2, Math.min(i, 4)));
                const jitter = Math.random() * 500;
                console.warn(`  Rate limited on slot ${slot}. Backing off ${Math.round(backoff + jitter)}ms...`);
                await sleep(backoff + jitter);
                i--; // retry same slot
            } else if (msg.includes("was skipped") || msg.includes("not available")) {
                // Slot was skipped, try next
                await sleep(DELAY_BETWEEN_RPC_MS);
            } else {
                // Unknown error, try next slot
                console.warn(`  Unexpected error on slot ${slot}: ${msg.slice(0, 80)}`);
                await sleep(DELAY_BETWEEN_RPC_MS);
            }
        }
    }
    return null;
}

/**
 * Fetch data for a single epoch. Returns null if it can't be resolved.
 */
async function getEpochData(epoch: number, schedule: EpochSchedule): Promise<EpochData | null> {
    const { firstNormalEpoch, firstNormalSlot, slotsPerEpoch } = schedule;

    if (epoch < firstNormalEpoch) {
        console.log(`  Skipping warmup epoch ${epoch}`);
        return null;
    }

    const start_slot = (epoch - firstNormalEpoch) * slotsPerEpoch + firstNormalSlot;
    const end_slot = start_slot + slotsPerEpoch - 1;
    const next_epoch_start_slot = end_slot + 1;

    console.log(`  Fetching block times for epoch ${epoch} (slots ${start_slot}–${end_slot})...`);

    // Sequential: fetch start time, then end time
    const startTime = await findFirstBlockTime(start_slot);
    await sleep(DELAY_BETWEEN_RPC_MS);
    const endTime = await findFirstBlockTime(next_epoch_start_slot);

    if (startTime === null || endTime === null) {
        console.warn(`  ⚠ Could not resolve times for epoch ${epoch} (start=${startTime}, end=${endTime})`);
        return null;
    }

    return {
        epoch,
        start_slot,
        end_slot,
        start_time_unix: startTime,
        end_time_unix: endTime,
        duration_seconds: endTime - startTime,
        slots_per_epoch: slotsPerEpoch
    };
}

// ── Data I/O ───────────────────────────────────────────────────

async function loadData(): Promise<EpochData[]> {
    try {
        const content = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(content);
    } catch {
        return [];
    }
}

async function saveData(data: EpochData[]) {
    const unique = new Map<number, EpochData>();
    for (const item of data) {
        unique.set(item.epoch, item);
    }
    const sorted = Array.from(unique.values()).sort((a, b) => a.epoch - b.epoch);

    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(sorted, null, 2));
}

// ── Main Loop ──────────────────────────────────────────────────

async function loop() {
    console.log(`Starting Epoch Daemon`);
    console.log(`  RPC: ${RPC_URL}`);
    console.log(`  Data: ${DATA_FILE}`);
    console.log(`  Poll interval: ${POLLING_INTERVAL_MS / 1000}s`);
    console.log(`  Delay between epochs: ${DELAY_BETWEEN_EPOCHS_MS}ms`);
    console.log();

    await mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Fetch schedule once — this never changes
    const schedule = await connection.getEpochSchedule();

    while (true) {
        try {
            const existing = await loadData();
            const existingEpochs = new Set(existing.map(e => e.epoch));

            // One single RPC call to get current epoch
            const { epoch: currentEpoch } = await connection.getEpochInfo();
            const lastStored = existing.length > 0
                ? Math.max(...existing.map(e => e.epoch))
                : schedule.firstNormalEpoch - 1;
            const startScan = lastStored + 1;

            if (startScan >= currentEpoch) {
                console.log(`✓ Up to date. Last stored: ${lastStored}, Current: ${currentEpoch}. Sleeping ${POLLING_INTERVAL_MS / 1000}s...`);
            } else {
                const total = currentEpoch - startScan;
                console.log(`Fetching ${total} epochs (${startScan}–${currentEpoch - 1})...`);

                // Process sequentially, one epoch at a time
                for (let e = startScan; e < currentEpoch; e++) {
                    if (existingEpochs.has(e)) {
                        continue; // Already have this one
                    }

                    const data = await getEpochData(e, schedule);
                    if (data) {
                        // Save immediately after each epoch
                        const current = await loadData();
                        await saveData([...current, data]);
                        console.log(`  ✓ Saved epoch ${e} (${e - startScan + 1}/${total})`);
                    }

                    // Throttle between epochs
                    await sleep(DELAY_BETWEEN_EPOCHS_MS);
                }

                console.log(`Done fetching.`);
            }
        } catch (e) {
            console.error("Error in daemon loop:", e);
        }

        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
    }
}

// Start
loop().catch(console.error);
