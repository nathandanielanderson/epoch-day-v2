"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DateNavigator({ currentDate }: { currentDate: string }) {
    const date = new Date(currentDate);
    const prev = new Date(date);
    prev.setDate(date.getDate() - 1);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);

    const prevStr = prev.toISOString().split("T")[0];
    const nextStr = next.toISOString().split("T")[0];

    return (
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-full border border-border">
            <Link href={`/date/${prevStr}`} className="p-2 hover:bg-muted rounded-full transition-colors" title="Previous Day">
                <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="font-mono font-medium text-lg min-w-[120px] text-center">
                {date.toLocaleDateString(undefined, { dateStyle: "medium" })}
            </span>
            <Link href={`/date/${nextStr}`} className="p-2 hover:bg-muted rounded-full transition-colors" title="Next Day">
                <ChevronRight className="w-5 h-5" />
            </Link>
        </div>
    );
}
