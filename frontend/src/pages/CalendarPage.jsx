import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuClipboardList, LuChartBar, LuInfo } from "react-icons/lu";

// Simple monthly calendar with prev/next month and today highlight
export default function CalendarPage() {
  const today = new Date();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [flashToday, setFlashToday] = useState(false);

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
    const firstDayOfMonth = new Date(
      current.getFullYear(),
      current.getMonth(),
      1,
    );

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

  const toIsoDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{monthYear}</h1>
          <button
            onClick={() => {
              // If not viewing today's month, jump to it
              const isSameMonth =
                current.getFullYear() === today.getFullYear() &&
                current.getMonth() === today.getMonth();
              if (!isSameMonth) {
                setCurrent(new Date(today.getFullYear(), today.getMonth(), 1));
              }
              // Flash highlight on today's date
              setFlashToday(true);
              window.setTimeout(() => setFlashToday(false), 1200);
            }}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
            title="Jump to and highlight today"
            type="button"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent(addMonths(current, -1))}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            type="button"
          >
            Prev
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="bg-white p-2 text-center text-sm font-medium rounded-md">
                {d}
              </div>
            ))}
            {weeks.map((week, wi) => (
              <>
                {week.map((date, di) => {
                  const inMonth = isCurrentMonth(date);
                  const isToday = isSameDate(date, today);
                  return (
                    <div
                      key={`${wi}-${di}`}
                      className={`bg-white h-24 p-2 align-top rounded-md border border-gray-200 ${inMonth ? "" : "text-gray-400 bg-gray-50"} ${isToday ? `ring-2 ring-blue-500 ${flashToday ? 'bg-blue-100' : ''}` : ""} hover:bg-blue-50 cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        // Navigate to Work Orders and open creation form with WO Date preset
                        navigate("/workorders", {
                          state: { openCreate: true, woDate: toIsoDate(date) },
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate("/workorders", {
                            state: { openCreate: true, woDate: toIsoDate(date) },
                          });
                        }
                      }}
                    >
                      <div className="text-xs">{date.getDate()}</div>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Sidebar cards */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Select a Workorder */}
          <div className="rounded-xl border border-gray-200 bg-white shadow p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 w-16 h-16">
                <LuClipboardList className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Select a Workorder</h3>
                <p className="text-sm text-gray-600">
                  Click on any workorder in the calendar to view its details
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Stats (dummy) */}
          <div className="rounded-xl border border-gray-200 bg-white shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <LuChartBar className="text-gray-700 w-5 h-5" />
              <h3 className="font-semibold">Quick Stats</h3>
            </div>
            <div className="text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600">Total Workorders</span>
                <span className="font-medium">128</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium">34</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600">In Progress</span>
                <span className="font-medium">57</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium">37</span>
              </div>
            </div>
          </div>

          {/* Card 3: How to Use */}
          <div className="rounded-xl border border-gray-200 bg-white shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <LuInfo className="text-gray-700 w-5 h-5" />
              <h3 className="font-semibold">How to Use</h3>
            </div>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>Drag & Drop: Move workorders to resechedule</li>
              <li>Click Workorder: Select workorder to view details</li>
              <li>Click Date: Create a new workorder for this date</li>
              <li>Navigate: Use arrows to change months</li>
              <li>Today: Click to jump to current date</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
