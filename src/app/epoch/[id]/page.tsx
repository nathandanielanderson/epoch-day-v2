import { getEpochById } from "@/lib/data";
import { ChevronLeft, ChevronRight, Clock, Box, Calendar } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: { id: string };
}
// Note: In Next.js 15, params is a Promise.
// But for now let's assume standard prop or await it if using latest canary.
// create-next-app installed "next": "16.1.6" (Wait, 16? Next.js 15 is current stable. 16 is likely a canary or I misread version or it's very new. 
// "next": "15.1.6" likely. The package.json view showed "16.1.6"? Let me recheck.
// Step 93 showed: "next": "16.1.6". Wait, Next.js 16 isn't out yet. 
// Ah, maybe it's 15.1.6 and I misread. Let's assume standard params await pattern for Next 15.

export default async function EpochPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const epochId = parseInt(id, 10);
    if (isNaN(epochId)) return notFound();

    const epoch = await getEpochById(epochId);

    if (!epoch) {
        return (
            <main className="min-h-screen grid place-items-center p-4">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Epoch {epochId} not found</h1>
                    <Link href="/" className="text-primary hover:underline">Return Home</Link>
                </div>
            </main>
        );
    }

    const startDate = epoch.start_time_unix ? new Date(epoch.start_time_unix * 1000).toLocaleString() : "Unknown";
    const endDate = epoch.end_time_unix ? new Date(epoch.end_time_unix * 1000).toLocaleString() : "On-going";
    const duration = epoch.duration_seconds
        ? `${(epoch.duration_seconds / 3600).toFixed(2)} hours`
        : "N/A";

    return (
        <main className="min-h-screen bg-background p-6 md:p-12 max-w-3xl mx-auto space-y-8">
            <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-8">
                <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>

            <header className="flex justify-between items-center pb-6 border-b border-border">
                <h1 className="text-4xl font-extrabold tracking-tight">Epoch {epoch.epoch}</h1>
                <div className="flex gap-2">
                    <Link href={`/epoch/${epochId - 1}`} className="p-2 bg-secondary rounded-full hover:bg-secondary/80">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <Link href={`/epoch/${epochId + 1}`} className="p-2 bg-secondary rounded-full hover:bg-secondary/80">
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-5 h-5" />
                        <span className="font-semibold">Time Range</span>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Start</p>
                        <p className="text-lg font-medium">{startDate}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">End</p>
                        <p className="text-lg font-medium">{endDate}</p>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-5 h-5" />
                        <span className="font-semibold">Duration</span>
                    </div>
                    <p className="text-3xl font-mono font-bold">{duration}</p>

                    <div className="pt-4 border-t border-border mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Box className="w-5 h-5" />
                            <span className="font-semibold">Slots</span>
                        </div>
                        <p className="text-lg">{epoch.slots_per_epoch.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                            {epoch.start_slot.toLocaleString()} - {epoch.end_slot.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
