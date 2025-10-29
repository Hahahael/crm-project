import { useEffect, useMemo, useState } from "react";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils";
import { useNavigate } from "react-router-dom";
import { LuClipboardList, LuChartBar, LuInfo } from "react-icons/lu";

// Simple monthly calendar with prev/next month and today highlight
export default function CalendarPage() {
  const today = new Date();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [workOrders, setWorkOrders] = useState([]);
  const [flashToday, setFlashToday] = useState(false);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '', visible: false });

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

  const toIsoDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const updateWorkOrderDueDate = async (woId, newDueDate, woNumber) => {
    setUpdating(true);
    try {
      console.log(`Updating work order ${woNumber} (ID: ${woId}) due date to ${newDueDate}`);
      
      const response = await apiBackendFetch(`/api/workorders/calendar/${woId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dueDate: newDueDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update work order: ${response.status}`);
      }

      const updatedWorkOrder = await response.json();
      console.log('Work order updated successfully:', updatedWorkOrder);

      // Update the local state to reflect the change immediately
      setWorkOrders(prevWorkOrders => 
        prevWorkOrders.map(wo => {
          const currentId = wo.id ?? wo.woId ?? wo.wo_id;
          if (String(currentId) === String(woId)) {
            return {
              ...wo,
              dueDate: newDueDate,
              due_date: newDueDate,
              due: newDueDate
            };
          }
          return wo;
        })
      );

      // Show success feedback
      console.log(`✅ Successfully moved ${woNumber} to ${newDueDate}`);
      showNotification(`Successfully moved ${woNumber} to ${newDueDate}`, 'success');
      
    } catch (error) {
      console.error('Failed to update work order due date:', error);
      showNotification(`Failed to move ${woNumber}: ${error.message}`, 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6 relative">
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
                  const dayKey = toIsoDate(date);
                  const events = byDate[dayKey] || [];
                  return (
                    <div
                      key={`${wi}-${di}`}
                      className={`bg-white h-42 p-2 align-top rounded-md border border-gray-200 ${inMonth ? "" : "text-gray-400 bg-gray-50"} ${isToday ? `ring-2 ring-blue-500 ${flashToday ? 'bg-blue-100' : ''}` : ""} ${dragOverDate === dayKey ? 'ring-2 ring-green-400 bg-green-50 border-green-300' : 'hover:bg-blue-50'} cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400`}
                      role="button"
                      tabIndex={0}
                      title="Click on empty space to create new work order"
                      onDragOver={(e) => {
                        e.preventDefault(); // Allow drop
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverDate(dayKey);
                      }}
                      onDragLeave={(e) => {
                        // Only clear if leaving the cell completely, not moving to a child
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setDragOverDate(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverDate(null);
                        
                        try {
                          const woData = JSON.parse(e.dataTransfer.getData('application/json'));
                          console.log('Dropped work order:', woData);
                          console.log('Target date:', dayKey);
                          
                          // Check if dropping on the same date
                          if (woData.currentDate === dayKey) {
                            console.log('Dropped on same date, no action needed');
                            return;
                          }
                          
                          // Update work order due date
                          updateWorkOrderDueDate(woData.id, dayKey, woData.woNumber);
                          
                        } catch (error) {
                          console.error('Error parsing dropped data:', error);
                        }
                      }}
                      onClick={() => {
                        // Navigate to Work Orders and open creation form with WO Date preset
                        navigate("/workorders", {
                          state: { openCreate: true, woDate: dayKey },
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate("/workorders", {
                            state: { openCreate: true, woDate: dayKey },
                          });
                        }
                      }}
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
                                className={`truncate text-[11px] leading-4 rounded px-1.5 py-0.5 border transition-colors duration-150 select-none ${
                                  updating 
                                    ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-100 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-move'
                                }`}
                                title={`${wo.woNumber ?? wo.wo_number ?? "WO"} — ${wo.accountName ?? ""}\nClick to view details • Drag to reschedule`}
                                role="button"
                                tabIndex={0}
                                draggable={!updating}
                                onDragStart={(e) => {
                                  setIsDragging(true);
                                  const woId = wo.id ?? wo.woId ?? wo.wo_id;
                                  const woData = {
                                    id: woId,
                                    woNumber: wo.woNumber ?? wo.wo_number ?? "WO",
                                    accountName: wo.accountName ?? "",
                                    currentDate: dayKey
                                  };
                                  e.dataTransfer.setData('application/json', JSON.stringify(woData));
                                  e.dataTransfer.effectAllowed = 'move';
                                  
                                  // Visual feedback during drag
                                  e.target.style.opacity = '0.6';
                                  e.target.style.transform = 'scale(1.05)';
                                  e.target.style.zIndex = '1000';
                                  console.log('Dragging work order:', woData);
                                }}
                                onDragEnd={(e) => {
                                  // Reset visual feedback
                                  e.target.style.opacity = '1';
                                  e.target.style.transform = 'scale(1)';
                                  e.target.style.zIndex = 'auto';
                                  
                                  // Reset drag state after a short delay to prevent click
                                  setTimeout(() => setIsDragging(false), 100);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering parent's create handler
                                  
                                  // Don't navigate if we just finished dragging
                                  if (isDragging) {
                                    return;
                                  }
                                  
                                  // Navigate to work order details with query parameter
                                  const woId = wo.id ?? wo.woId ?? wo.wo_id;
                                  if (woId) {
                                    navigate(`/workorders?select=${woId}`);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const woId = wo.id ?? wo.woId ?? wo.wo_id;
                                    if (woId) {
                                      navigate(`/workorders?select=${woId}`);
                                    }
                                  }
                                }}
                              >
                                {(wo.woNumber ?? wo.wo_number ?? "WO").toString()}
                              </div>
                            ))}
                            {events.length > 3 && (
                              <div 
                                className="text-[10px] text-gray-500 cursor-pointer hover:text-blue-600 transition-colors duration-150"
                                title="Click to view all work orders for this day"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to work orders with date filter
                                  navigate(`/workorders?date=${dayKey}`);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    navigate(`/workorders?date=${dayKey}`);
                                  }
                                }}
                              >
                                +{events.length - 3} more…
                              </div>
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
              <li>
                <span className="font-medium text-green-700">Drag & Drop:</span> Move workorders to reschedule
              </li>
              <li>Click Workorder: Select workorder to view details</li>
              <li>Click Date: Create a new workorder for this date</li>
              <li>Navigate: Use arrows to change months</li>
              <li>Today: Click to jump to current date</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {updating && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Updating work order...</span>
          </div>
        </div>
      )}

      {/* Notification toast */}
      {notification.visible && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : notification.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(prev => ({ ...prev, visible: false }))}
              className="text-white hover:text-gray-200 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
