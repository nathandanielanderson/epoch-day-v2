// src/lib/offset-tz.ts

/**
 * Convert a fixed offset in minutes to an IANA-like zone usable by Intl.
 * NOTE: Etc/GMT has inverted sign: Etc/GMT+5 == UTC-05:00
 */
export function offsetToIana(offsetMinutes: number): string {
    if (offsetMinutes === 0) return 'UTC';
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    // Etc/GMT only supports whole hours; if you use fractional offsets, we'll fall back
    const hasFraction = Math.abs(offsetMinutes) % 60 !== 0;

    if (!hasFraction) {
        const sign = offsetMinutes > 0 ? '-' : '+'; // inverted
        return `Etc/GMT${sign}${hours}`;
    }

    // Fallback for fractional offsets: shift the instant, then format in UTC.
    // Use this pseudo-zone label only for display purposes.
    return 'OFFSET_FRACTIONAL';
}

export function formatWithOffset(ms: number | null, offsetMinutes: number, opts?: Intl.DateTimeFormatOptions) {
    if (!ms && ms !== 0) return '—';
    const zone = offsetToIana(offsetMinutes);

    if (zone !== 'OFFSET_FRACTIONAL') {
        return new Intl.DateTimeFormat(undefined, { timeZone: zone, ...opts }).format(ms!);
    }

    // Fractional offset: shift instant, then format as UTC
    const shifted = ms! + offsetMinutes * 60_000;
    return new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', ...opts }).format(shifted);
}

export function formatDayAndTimeWithOffset(ms: number | null, offsetMinutes: number) {
    if (ms == null) return '—';
    const day = formatWithOffset(ms, offsetMinutes, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const time = formatWithOffset(ms, offsetMinutes, {
        hour: '2-digit',
        minute: '2-digit',
    });
    return `${day}, ${time}`;
}

export function formatShortDayLabel(ms: number, offsetMinutes: number) {
    return formatWithOffset(ms, offsetMinutes, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
