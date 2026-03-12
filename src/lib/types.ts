export interface EpochData {
    epoch: number;
    start_slot: number;
    end_slot: number;
    start_time_unix: number | null;
    end_time_unix: number | null;
    duration_seconds: number | null;
    slots_per_epoch: number;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start_time_unix: number;
    end_time_unix: number;
    type: 'upgrade' | 'call' | 'event' | 'other';
    color?: string;
    /** Optional: pin event to an epoch boundary (resolved to timestamp by API) */
    epoch?: number;
    /** Optional: pin event to a single date, e.g. "2026-03-16" (resolved to timestamp by API) */
    date?: string;
}
