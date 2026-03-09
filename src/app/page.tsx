'use client';

import { useState } from 'react';
import EpochDisplay from "@/components/EpochDisplay";
import CalendarDisplay from "@/components/calendar/CalendarDisplay";
import { LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';

export default function Page() {
  const [view, setView] = useState<'epoch' | 'calendar'>('epoch');

  return (
    <main className="min-h-dvh flex flex-col items-center pt-8 pb-12">
      {/* View Toggle */}
      <div className="mb-8 p-1 bg-zinc-900/50 rounded-lg flex items-center gap-1 ring-1 ring-white/10 backdrop-blur">
        <button
          onClick={() => setView('epoch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${view === 'epoch'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
        >
          <LayoutGrid size={16} />
          Epoch View
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition text-sm font-medium ${view === 'calendar'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
        >
          <CalendarIcon size={16} />
          Calendar View
        </button>
      </div>

      <div className="w-full flex justify-center">
        {view === 'epoch' ? <EpochDisplay /> : <CalendarDisplay />}
      </div>
    </main>
  );
}
