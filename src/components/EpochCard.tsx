import { EpochData } from "@/lib/types";
import { Calendar, Clock, Layers } from "lucide-react";
import Link from "next/link";

export function EpochCard({ epoch }: { epoch: EpochData }) {
    const startDate = epoch.start_time_unix ? new Date(epoch.start_time_unix * 1000).toLocaleString() : "Unknown";
    const duration = epoch.duration_seconds ? (epoch.duration_seconds / 3600).toFixed(2) + "h" : "Unknown";

    return (
        <Link href={`/epoch/${epoch.epoch}`} className="block group">
            <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Epoch {epoch.epoch}</h3>
                    </div>
                    <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-secondary-foreground">
                        {duration}
                    </span>
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {startDate}
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {epoch.slots_per_epoch.toLocaleString()} slots
                    </div>
                </div>
            </div>
        </Link>
    );
}
