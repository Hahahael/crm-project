import { useMemo, useState } from "react";

// Simple monthly calendar with prev/next month and today highlight
export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const monthYear = current.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function addMonths(base, n) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + n);
    return d;
  }

  const { weeks } = useMemo(() => {
    const firstDayOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);

    // Determine start date (Monday as first day of week)
    const start = new Date(firstDayOfMonth);
    const day = start.getDay(); // 0 Sun ... 6 Sat
    const diffToMonday = (day + 6) % 7; // convert to Monday=0
    start.setDate(start.getDate() - diffToMonday);

    // Determine end date to complete 6 weeks grid (42 cells typical)
    const end = new Date(start);
    end.setDate(start.getDate() + 41);

    const days = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return { weeks };
  }, [current]);

  const isSameDate = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isCurrentMonth = (date) => date.getMonth() === current.getMonth();

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(addMonths(current, -1))}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Prev
          </button>
          <div className="min-w-[180px] text-center font-medium">{monthYear}</div>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Next
          </button>
          <button
            onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[1px] bg-gray-300 rounded overflow-hidden">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
          <div key={d} className="bg-white p-2 text-center text-sm font-medium">{d}</div>
        ))}
        {weeks.map((week, wi) => (
          <>
            {week.map((date, di) => {
              const inMonth = isCurrentMonth(date);
              const isToday = isSameDate(date, today);
              return (
                <div
                  key={`${wi}-${di}`}
                  className={`bg-white h-24 p-2 align-top ${inMonth ? '' : 'text-gray-400 bg-gray-50'} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="text-xs">{date.getDate()}</div>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
