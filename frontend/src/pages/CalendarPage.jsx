import { useEffect, useMemo, useState } from "react";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils";

// Simple monthly calendar with prev/next month and today highlight
export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [workOrders, setWorkOrders] = useState([]);

  const monthYear = current.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const workOrdersRes = await apiBackendFetch("/api/workorders");
        if (!workOrdersRes.ok) return;
        const workOrdersData = await workOrdersRes.json();
        if (mounted) setWorkOrders(Array.isArray(workOrdersData) ? workOrdersData : []);
      } catch (err) {
        console.error("Error retrieving workorders:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  // Normalize date string YYYY-MM-DD from a work order's due date
  const woDueKey = (wo) => {
    const raw = wo?.dueDate ?? wo?.due_date ?? wo?.due ?? null;
    if (!raw) return null;
    return utils?.formatDate ? utils.formatDate(raw, "YYYY-MM-DD") : String(raw).slice(0, 10);
  };

  // Index work orders by due_date for quick lookup
  const byDate = useMemo(() => {
    const map = {};
    (workOrders || []).forEach((wo) => {
      const key = woDueKey(wo);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(wo);
    });
    return map;
  }, [workOrders]);

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
          <div className="min-w-[180px] text-center font-medium">
            {monthYear}
          </div>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Next
          </button>
          <button
            onClick={() =>
              setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))
            }
            className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[1px] bg-gray-300 rounded overflow-hidden">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-white p-2 text-center text-sm font-medium">
            {d}
          </div>
        ))}
        {weeks.map((week, wi) => (
          <>
            {week.map((date, di) => {
              const inMonth = isCurrentMonth(date);
              const isToday = isSameDate(date, today);
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const events = byDate[key] || [];
              return (
                <div
                  key={`${wi}-${di}`}
                  className={`bg-white h-24 p-2 align-top ${inMonth ? "" : "text-gray-400 bg-gray-50"} ${isToday ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="text-xs font-medium">{date.getDate()}</div>
                  {events.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <div className="inline-flex items-center rounded-md bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5">
                        {events.length} workorder{events.length > 1 ? "s" : ""}
                      </div>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {events.slice(0, 3).map((wo, idx) => (
                          <div
                            key={(wo.id ?? wo.woId ?? wo.wo_id ?? idx) + "-pill"}
                            className="truncate text-[11px] leading-4 rounded bg-gray-100 px-1.5 py-0.5 border border-gray-200"
                            title={`${wo.woNumber ?? wo.wo_number ?? "WO"} — ${wo.accountName ?? ""}`}
                          >
                            {(wo.woNumber ?? wo.wo_number ?? "WO").toString()}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-[10px] text-gray-500">+{events.length - 3} more…</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
