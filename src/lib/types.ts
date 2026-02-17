export interface EpochData {
    epoch: number;
    start_slot: number;
    end_slot: number;
    start_time_unix: number | null;
    end_time_unix: number | null;
    duration_seconds: number | null;
    slots_per_epoch: number;
}
