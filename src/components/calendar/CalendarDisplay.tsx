'use client';

import React, { useState, useEffect } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';

const STAKEWIZ_URL =
    'https://app.jpool.one/direct-staking?vote=nateBZg7oHVPLB2samBLkKvfzedU3ALZBexMFPMKjn1';

export interface CalendarEpoch {
    epoch: number;
    start_time_unix: number;
    end_time_unix: number;
    isCurrent?: boolean;
    isProjection?: boolean;
}

import { CalendarEvent } from '@/lib/types';

export default function CalendarDisplay() {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [offsetMinutes, setOffsetMinutes] = useState<number>(0);
    const [epochs, setEpochs] = useState<CalendarEpoch[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [globalCurrentEpoch, setGlobalCurrentEpoch] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch the global current epoch on mount
    useEffect(() => {
        let active = true;
        fetch('/api/epoch')
            .then(res => res.json())
            .then(data => {
                if (active && data && data.epoch) {
                    setGlobalCurrentEpoch(data.epoch);
                }
            })
            .catch(err => {
                console.error("Failed to fetch global current epoch", err);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        setLoading(true);

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        Promise.all([
            fetch(`/api/epochs-month?year=${year}&month=${month}`).then(res => res.json()),
            fetch(`/api/events-month?year=${year}&month=${month}`).then(res => res.json())
        ])
            .then(([epochsData, eventsData]) => {
                if (active) {
                    if (Array.isArray(epochsData)) setEpochs(epochsData);
                    if (Array.isArray(eventsData)) setEvents(eventsData);
                }
            })
            .catch(err => {
                console.error("Failed to fetch calendar data", err);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [currentDate]);

    return (
        <div className="relative mx-auto w-full max-w-6xl p-6 text-center space-y-5">
            {/* Global CTA */}
            <a
                href={STAKEWIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block fixed right-5 top-5 z-[100] rounded-md bg-zinc-900/80 px-4 py-2 text-sm font-semibold text-zinc-100 shadow-sm ring-1 ring-white/10 backdrop-blur hover:bg-zinc-900 hover:ring-white/20 transition"
            >
                Stake With Us
            </a>
            {/* Mobile-only CTA */}
            <a
                href={STAKEWIZ_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 sm:hidden inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 px-6 py-3 text-sm font-semibold text-zinc-100 backdrop-blur hover:bg-white/20 transition"
            >
                Stake With Us
            </a>


            <CalendarHeader
                currentDate={currentDate}
                onChangeDate={setCurrentDate}
                offsetMinutes={offsetMinutes}
                onChangeOffset={setOffsetMinutes}
                currentEpoch={globalCurrentEpoch}
            />

            {loading && epochs.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-zinc-500 animate-pulse">
                    Loading epochs...
                </div>
            ) : (
                <CalendarGrid
                    currentDate={currentDate}
                    offsetMinutes={offsetMinutes}
                    epochs={epochs}
                    events={events}
                />
            )}

            {/* Validator Identity / Branding */}
            <div className="mt-10 flex flex-col items-center gap-2">
                <div className="text-[14px] tracking-wide text-zinc-500">
                    Powered By
                </div>

                <a
                    href={STAKEWIZ_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-zinc-200 hover:text-white transition"
                >
                    Epoch.Day
                </a>

                <a
                    href={STAKEWIZ_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-85 hover:opacity-100 transition"
                    aria-label="Stake with Anderson & Anderson Validator (StakeWiz)"
                >
                    <img
                        src="/logo.png"
                        alt="Anderson & Anderson Validator"
                        className="h-26"
                    />
                </a>

                <a
                    href={STAKEWIZ_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-md font-semibold text-zinc-200 hover:text-white transition"
                >
                    Solana Validator
                </a>
            </div>
        </div>
    );
}
