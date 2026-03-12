import { fetchEpochBoundary } from "../src/lib/solana";
import { saveEpoch } from "../src/lib/data";

async function backfill() {
    const missingEpochs = [911, 912, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 938];
    for (const epoch of missingEpochs) {
        console.log(`Fetching epoch ${epoch}...`);
        const boundary = await fetchEpochBoundary(epoch);
        if (boundary) {
            await saveEpoch(boundary);
            console.log(`Saved epoch ${epoch}`);
        } else {
            console.error(`Failed to fetch epoch ${epoch}`);
        }
        // Wait briefly to avoid API limits
        await new Promise(r => setTimeout(r, 500));
    }
    console.log("Backfill complete.");
}

backfill().catch(console.error);
