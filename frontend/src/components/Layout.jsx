// src/components/Layout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  LuLayoutDashboard, 
  LuClipboardList, 
  LuTrendingUp, 
  LuWrench, 
  LuFileText, 
  LuBuilding2, 
  LuDollarSign, 
  LuUsers, 
  LuCalendar, 
  LuSquareCheckBig,
  LuLogOut,
  LuTrash2,
  LuTriangleAlert,
  LuPanelLeftClose,
  LuPanelRightClose
} from "react-icons/lu";

const apiUrl = import.meta.env.VITE_API_URL;

fetch(`${apiUrl}/healthcheck`)
  .then((res) => res.json())
  .then((data) => console.log(data));

export default function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define routes where sidebar should not appear
  const hideSidebar = location.pathname === "/login";

  return (
    <div className="flex h-screen w-full">
      {!hideSidebar && (
        <aside 
          className={`${
            isCollapsed ? 'w-14' : 'w-[250px]'
          } bg-gray-200 text-black flex flex-col transition-all duration-200 ease-in-out relative`}
        >
          <div className="p-4 text-xl font-bold border-b border-gray-700 flex items-center justify-between transition-all duration-300">
            <span className={`${
              isCollapsed ? 'opacity-0' : 'opacity-100'
            } transition-opacity duration-300 whitespace-nowrap overflow-hidden`}>
              WorkOrder System
            </span>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-gray-600 hover:text-white flex-shrink-0"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <LuPanelRightClose size={18} /> : <LuPanelLeftClose size={18} />}
            </button>
          </div>
          <nav className={`flex-1 p-2 space-y-2 transition-all duration-300`}>
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Dashboard" : ""}
            >
              <LuLayoutDashboard size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              to="/workorders"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Workorders" : ""}
            >
              <LuClipboardList size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Workorders</span>}
            </Link>
            <Link
              to="/salesleads"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Sales Leads" : ""}
            >
              <LuTrendingUp size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Sales Leads</span>}
            </Link>
            <Link
              to="/technicals"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Technical Reco" : ""}
            >
              <LuWrench size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Technical Reco</span>}
            </Link>
            <Link
              to="/rfqs"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "RFQs" : ""}
            >
              <LuFileText size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>RFQs</span>}
            </Link>
            <Link
              to="/accounts"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "NAEF" : ""}
            >
              <LuBuilding2 size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>NAEF</span>}
            </Link>
            <Link
              to="/quotations"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Quotations" : ""}
            >
              <LuDollarSign size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Quotations</span>}
            </Link>
            <Link
              to="/users"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Users" : ""}
            >
              <LuUsers size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Users</span>}
            </Link>
            <Link
              to="/calendar"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Calendar" : ""}
            >
              <LuCalendar size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Calendar</span>}
            </Link>
            <Link
              to="/approvals"
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300 h-10"
              title={isCollapsed ? "Approvals" : ""}
            >
              <LuSquareCheckBig size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Approvals</span>}
            </Link>
          </nav>
          {/* Admin buttons - only show when expanded */}
          {!isCollapsed && (
            <div className="p-4 space-y-2 border-t border-gray-700">

              <button
                onClick={async () => {
                  try {
                    const first = window.confirm(
                      "DANGER: This will wipe MOST data (all public tables) except roles, departments, statuses, and users. Continue?",
                    );
                    if (!first) return;
                    const confirmText = window.prompt(
                      "Type WIPE to confirm database wipe (irreversible)",
                    );
                    if (confirmText !== "WIPE") return;

                    const res = await fetch(`${apiUrl}/api/admin/wipe`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ confirm: "WIPE" }),
                    });
                    if (!res.ok) {
                      const e = await res.json().catch(() => ({}));
                      throw new Error(e?.error || `Wipe failed (${res.status})`);
                    }
                    const data = await res.json();
                    const count = data?.truncated ?? 0;
                    const tables = Array.isArray(data?.tables) ? data.tables.join(", ") : "";
                    alert(`Wipe completed. Truncated ${count} table(s).\n${tables}`);
                    // Refresh the app state after destructive wipe
                    window.location.reload();
                  } catch (err) {
                    console.error("Wipe error:", err);
                    alert(`Wipe failed: ${err?.message || err}`);
                  }
                }}
                className="flex items-center gap-2 w-full px-3 py-2 bg-red-700 rounded-md hover:bg-red-600 text-white text-sm transition-all duration-300"
                title="Wipe database tables except roles, departments, statuses, users"
              >
                <LuTriangleAlert size={16} className="flex-shrink-0" />
                <span>Wipe Database (Keep Core Tables)</span>
              </button>
            </div>
          )}

          {/* Logout button - always visible */}
          <div className={`${isCollapsed ? "m-2 my-4" : "m-4"}`}>
            <button
              onClick={async () => {
                await fetch(`${apiUrl}/auth/logout`, {
                  method: "POST",
                  credentials: "include", // send cookie
                });
                window.location.href = "/login"; // redirect to login
              }}
              className="h-10 w-full flex items-center gap-2 px-3 py-2 bg-red-700 rounded-md hover:bg-red-600 text-white transition-all duration-300"
              title={isCollapsed ? "Logout" : ""}
            >
              <LuLogOut size={16} className="flex-shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
