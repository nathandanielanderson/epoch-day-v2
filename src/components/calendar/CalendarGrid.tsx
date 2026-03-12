'use client';

import React, { useState, MouseEvent } from 'react';
import type { CalendarEpoch } from './CalendarDisplay';
import { CalendarEvent } from '@/lib/types';
import { formatDayAndTimeWithOffset } from '@/lib/offset-tz';

type Props = {
    currentDate: Date;
    offsetMinutes: number;
    epochs: CalendarEpoch[];
    events?: CalendarEvent[];
};

export default function CalendarGrid({ currentDate, offsetMinutes, epochs, events = [] }: Props) {
    const [hoverInfo, setHoverInfo] = useState<{
        epoch: number;
        dayIndex: number;
        hoverPos: number;
        hoverTime: number;
    } | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startPadding = firstDayOfMonth.getDay();
    const endPadding = 6 - lastDayOfMonth.getDay();

    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month - 1, prevMonthLastDay - i),
            isCurrentMonth: false,
        });
    }

    // Current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true,
        });
    }

    // Next month padding
    for (let i = 1; i <= endPadding; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false,
        });
    }

    const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const getEpochsForDay = (dayStart: Date) => {
        // Calculate the absolute UTC timestamp for 00:00:00 of this day in the selected timezone
        const startMsWindow = Date.UTC(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate()) - (offsetMinutes * 60000);
        const endMsWindow = startMsWindow + 86400000; // +1 day

        return epochs.filter(e => {
            const eStart = e.start_time_unix * 1000;
            const eEnd = e.end_time_unix * 1000;
            return (eStart < endMsWindow) && (eEnd > startMsWindow);
        }).map(e => {
            const eStart = e.start_time_unix * 1000;
            const eEnd = e.end_time_unix * 1000;
            const isStartDay = eStart >= startMsWindow && eStart < endMsWindow;
            const isEndDay = eEnd > startMsWindow && eEnd <= endMsWindow;
            return {
                ...e,
                isStartDay,
                isEndDay,
                startMsWindow,
                endMsWindow
            };
        });
    };

    const getEventsForDay = (dayStart: Date) => {
        const startMsWindow = Date.UTC(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate()) - (offsetMinutes * 60000);
        const endMsWindow = startMsWindow + 86400000;

        return events.filter(e => {
            const eStart = e.start_time_unix * 1000;
            const eEnd = e.end_time_unix * 1000;
            return (eStart < endMsWindow) && (eEnd > startMsWindow);
        });
    };

    // Google Calendar Link Generator
    const generateGCalLink = (ev: CalendarEvent) => {
        const formatGCalDate = (ms: number) => {
            const d = new Date(ms);
            return d.toISOString().replace(/-|:|\.\d\d\d/g, "");
        };

        const startStr = formatGCalDate(ev.start_time_unix * 1000);
        const endStr = formatGCalDate(ev.end_time_unix * 1000);

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: ev.title,
            details: ev.description || '',
            dates: `${startStr}/${endStr}`,
        });

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    };

    return (
        <div className="w-full mt-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-7 gap-px bg-zinc-700 mb-px rounded-t-lg overflow-hidden border border-zinc-700">
                {WEEKDAYS.map((day) => (
                    <div key={day} className="bg-black/80 py-2 text-center text-xs font-semibold text-zinc-500 tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-zinc-700 border-x border-b border-zinc-700 rounded-b-lg">
                {days.map((dayObj, i) => {
                    const today = new Date();
                    const isToday =
                        dayObj.date.getDate() === today.getDate() &&
                        dayObj.date.getMonth() === today.getMonth() &&
                        dayObj.date.getFullYear() === today.getFullYear();

                    const dayEpochs = getEpochsForDay(dayObj.date);
                    const dayEvents = getEventsForDay(dayObj.date);

                    return (
                        <div
                            key={i}
                            className={`min-h-[140px] p-2 relative flex flex-col transition-colors hover:bg-zinc-900/80 hover:z-50 ${dayObj.isCurrentMonth ? 'bg-[#0a0a0b]' : 'bg-black'
                                }`}
                        >
                            <div className={`flex justify-between items-start mb-2 ${!dayObj.isCurrentMonth ? 'opacity-40' : ''}`}>
                                <span className={`text-sm font-medium h-6 w-6 rounded-full flex items-center justify-center ${isToday ? 'bg-white text-black' : 'text-zinc-400'
                                    }`}>
                                    {dayObj.date.getDate()}
                                </span>
                            </div>

                            {/* Events Container (List Format) */}
                            <div className={`mt-1 flex flex-col gap-1 z-20 relative ${!dayObj.isCurrentMonth ? 'opacity-40' : ''}`}>
                                {dayEvents.map((evObj) => (
                                    <div key={evObj.id} className="relative group/event">
                                        <div className="flex items-center gap-1.5 px-0.5 py-0.5 rounded hover:bg-white/10 cursor-pointer transition-colors max-w-full overflow-hidden">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: evObj.color || '#3b82f6' }} />
                                            <span className="text-[10px] text-zinc-300 font-medium truncate leading-tight">
                                                {evObj.title}
                                            </span>
                                        </div>

                                        {/* Hover Tooltip / Details Card */}
                                        <div className="absolute left-1/2 top-full -translate-x-1/2 w-48 pt-2 z-[100] opacity-0 group-hover/event:opacity-100 pointer-events-none group-hover/event:pointer-events-auto transition-opacity duration-200">
                                            <div className="bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl">
                                                <div className="p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: evObj.color || '#3b82f6' }} />
                                                        <h4 className="text-zinc-100 font-semibold text-xs leading-snug">{evObj.title}</h4>
                                                    </div>
                                                    {evObj.description && (
                                                        <p className="text-zinc-400 text-[10px] mb-3 leading-relaxed">
                                                            {evObj.description}
                                                        </p>
                                                    )}
                                                    <div className="text-[10px] text-zinc-500 mb-3 font-mono bg-black/30 p-1.5 rounded">
                                                        {evObj.epoch ? (
                                                            <div>Epoch: {evObj.epoch}</div>
                                                        ) : evObj.date ? (
                                                            <div>Date: {evObj.date}</div>
                                                        ) : (
                                                            <>
                                                                <div>From: {formatDayAndTimeWithOffset(evObj.start_time_unix * 1000, offsetMinutes)}</div>
                                                                <div>To: {formatDayAndTimeWithOffset(evObj.end_time_unix * 1000, offsetMinutes)}</div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <a
                                                        href={generateGCalLink(evObj)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-full text-center bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] py-1.5 rounded transition-colors font-medium border border-zinc-600"
                                                    >
                                                        + Add to Google Calendar
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Epochs Container */}
                            < div className={`absolute bottom-2 left-0 right-0 h-5 z-10 ${!dayObj.isCurrentMonth ? 'opacity-40' : ''}`}>
                                {dayEpochs.map(ep => {
                                    const eStart = ep.start_time_unix * 1000;
                                    const eEnd = ep.end_time_unix * 1000;

                                    const startWithinDay = Math.max(ep.startMsWindow, eStart);
                                    const endWithinDay = Math.min(ep.endMsWindow, eEnd);

                                    const leftPercent = ((startWithinDay - ep.startMsWindow) / 86400000) * 100;
                                    const widthPercent = ((endWithinDay - startWithinDay) / 86400000) * 100;

                                    const fmtStart = formatDayAndTimeWithOffset(eStart, offsetMinutes);
                                    const fmtEnd = formatDayAndTimeWithOffset(eEnd, offsetMinutes);
                                    const titleStr = `Epoch ${ep.epoch}${ep.isProjection ? ' (Projected)' : ''}\nStart: ${fmtStart}\nEnd: ${fmtEnd}`;

                                    // Coloring logic
                                    let bgColor = ep.isCurrent
                                        ? "bg-white hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10" // Highlight current
                                        : ep.isProjection
                                            ? "bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-600 border-dashed" // Projected
                                            : "bg-zinc-700 hover:bg-zinc-600"; // Grey out past

                                    let borderRadii = "";
                                    if (ep.isStartDay && ep.isEndDay) borderRadii = "rounded-lg";
                                    else if (ep.isStartDay) borderRadii = "rounded-l-lg";
                                    else if (ep.isEndDay) borderRadii = "rounded-r-lg";

                                    const isHovered = hoverInfo?.epoch === ep.epoch && hoverInfo?.dayIndex === i;

                                    return (
                                        <div
                                            key={ep.epoch}
                                            className={`absolute top-0 bottom-0 ${bgColor} text-[10px] ${ep.isCurrent ? 'text-black font-bold' : 'text-zinc-200'} flex items-center justify-center cursor-crosshair transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${borderRadii} overflow-visible whitespace-nowrap`}
                                            style={{
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`,
                                                zIndex: isHovered ? 30 : (ep.isCurrent ? 20 : 10)
                                            }}
                                            onMouseMove={(e: MouseEvent<HTMLDivElement>) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const percentage = Math.max(0, Math.min(1, x / rect.width));
                                                const timestamp = startWithinDay + (endWithinDay - startWithinDay) * percentage;
                                                setHoverInfo({
                                                    epoch: ep.epoch,
                                                    dayIndex: i,
                                                    hoverPos: percentage * 100,
                                                    hoverTime: timestamp
                                                });
                                            }}
                                            onMouseLeave={() => setHoverInfo(null)}
                                        >
                                            {/* Tooltip */}
                                            {isHovered && hoverInfo && (
                                                <div
                                                    className="absolute bottom-full mb-2 -translate-x-1/2 pointer-events-none"
                                                    style={{ left: `${hoverInfo.hoverPos}%` }}
                                                >
                                                    <div className="bg-zinc-900 text-white text-xs px-2 py-1.5 rounded border border-zinc-700 shadow-xl font-mono flex flex-col items-center">
                                                        <span className="font-bold text-white mb-0.5">
                                                            Epoch {ep.epoch}{ep.isProjection ? ' (Projected)' : ''}
                                                        </span>
                                                        <span>{formatDayAndTimeWithOffset(hoverInfo.hoverTime, offsetMinutes)}</span>
                                                    </div>
                                                    <div className="w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 transform rotate-45 absolute left-1/2 -bottom-1 -translate-x-1/2"></div>
                                                </div>
                                            )}

                                            {widthPercent > 20 && (
                                                <span className="px-1 truncate font-medium drop-shadow-md pointer-events-none">
                                                    {widthPercent > 50 ? `Epoch ${ep.epoch}` : ep.epoch}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
