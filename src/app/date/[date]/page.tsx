import { getEpochByDate } from "@/lib/data";
import { EpochCard } from "@/components/EpochCard";
import { DateNavigator } from "@/components/DateNavigator"; // Assuming this exists or creates it (I'll create it) - Ah, wait, I already created it in previous step! Wait, did I? Yes in step 149.
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function DatePage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;

    // date param might be %20 encoded? standard is usually decoded by next.js params?
    // Let's assume standard YYYY-MM-DD format.
    const epochs = await getEpochByDate(date);

    return (
        <main className="min-h-screen bg-background p-6 md:p-12 max-w-5xl mx-auto space-y-8">
            <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-8">
                <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </Link>

            <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Epochs on {date}</h1>
                    <p className="text-muted-foreground mt-1">
                        Found {epochs.length} epochs.
                    </p>
                </div>
                <div className="bg-card rounded-full"> {/* Wrapped to ensure it works */}
                    <DateNavigator currentDate={date} />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {epochs.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                        <p className="text-muted-foreground">No epoch starts recorded for this date.</p>
                    </div>
                ) : (
                    epochs.map(epoch => (
                        <EpochCard key={epoch.epoch} epoch={epoch} />
                    ))
                )}
            </div>
        </main>
    );
}
