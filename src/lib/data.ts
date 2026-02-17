import { readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import { EpochData } from "./types";

const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), "public", "epochs.json");

// ── In-memory cache with mtime invalidation ────────────────
let cachedEpochs: EpochData[] = [];
let cachedMtimeMs = 0;
let epochMap = new Map<number, EpochData>();

async function ensureCache(): Promise<void> {
    try {
        const s = await stat(DATA_FILE);
        const mtimeMs = s.mtimeMs;

        if (mtimeMs !== cachedMtimeMs) {
            const content = await readFile(DATA_FILE, "utf-8");
            const data = JSON.parse(content) as EpochData[];
            cachedEpochs = data.sort((a, b) => b.epoch - a.epoch);
            cachedMtimeMs = mtimeMs;

            // Rebuild lookup map
            epochMap = new Map();
            for (const e of cachedEpochs) {
                epochMap.set(e.epoch, e);
            }
        }
    } catch {
        cachedEpochs = [];
        epochMap = new Map();
        cachedMtimeMs = 0;
    }
}

export async function getHistoricalEpochs(): Promise<EpochData[]> {
    await ensureCache();
    return cachedEpochs;
}

export async function getEpochById(id: number): Promise<EpochData | undefined> {
    await ensureCache();
    return epochMap.get(id);
}

export async function getEpochByDate(dateStr: string): Promise<EpochData[]> {
    await ensureCache();
    const target = new Date(dateStr).toDateString();

    return cachedEpochs.filter(e => {
        if (!e.start_time_unix) return false;
        const eDate = new Date(e.start_time_unix * 1000).toDateString();
        return eDate === target;
    });
}

/**
 * Save a newly-fetched epoch into epochs.json and update the in-memory cache.
 * Used by the API route when it fetches an epoch on-demand from RPC.
 */
export async function saveEpoch(epoch: EpochData): Promise<void> {
    await ensureCache();

    // Don't duplicate
    if (epochMap.has(epoch.epoch)) return;

    // Add to in-memory cache
    epochMap.set(epoch.epoch, epoch);

    // Rebuild sorted array
    const all = Array.from(epochMap.values()).sort((a, b) => a.epoch - b.epoch);

    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(all, null, 2));

    // Update mtime so next ensureCache picks it up
    const s = await stat(DATA_FILE);
    cachedMtimeMs = s.mtimeMs;
    cachedEpochs = all.sort((a, b) => b.epoch - a.epoch);
}
