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
  LuChevronLeft,
  LuChevronRight,
  LuPanelLeftClose
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
            isCollapsed ? 'w-16' : 'w-[250px]'
          } bg-gray-200 text-black flex flex-col transition-all duration-300 ease-in-out group relative z-10`}
        >
          {/* Overlay expansion when collapsed and hovered */}
          {isCollapsed && (
            <div className="absolute left-0 top-0 w-[250px] h-full bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto z-20 flex flex-col">
              <div className="p-4 text-xl font-bold border-b border-gray-700 flex items-center justify-between">
                <span className="whitespace-nowrap overflow-hidden">
                  WorkOrder System
                </span>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-1 rounded hover:bg-gray-600 hover:text-white flex-shrink-0"
                  title="Collapse sidebar"
                >
                  <LuPanelLeftClose size={18} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                <Link to="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Dashboard">
                  <LuLayoutDashboard size={18} className="flex-shrink-0" />
                  <span>Dashboard</span>
                </Link>
                <Link to="/workorders" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Workorders">
                  <LuClipboardList size={18} className="flex-shrink-0" />
                  <span>Workorders</span>
                </Link>
                <Link to="/salesleads" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Sales Leads">
                  <LuTrendingUp size={18} className="flex-shrink-0" />
                  <span>Sales Leads</span>
                </Link>
                <Link to="/technicals" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Technical Reco">
                  <LuWrench size={18} className="flex-shrink-0" />
                  <span>Technical Reco</span>
                </Link>
                <Link to="/rfqs" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="RFQs">
                  <LuFileText size={18} className="flex-shrink-0" />
                  <span>RFQs</span>
                </Link>
                <Link to="/accounts" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="NAEF">
                  <LuBuilding2 size={18} className="flex-shrink-0" />
                  <span>NAEF</span>
                </Link>
                <Link to="/quotations" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Quotations">
                  <LuDollarSign size={18} className="flex-shrink-0" />
                  <span>Quotations</span>
                </Link>
                <Link to="/users" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Users">
                  <LuUsers size={18} className="flex-shrink-0" />
                  <span>Users</span>
                </Link>
                <Link to="/calendar" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Calendar">
                  <LuCalendar size={18} className="flex-shrink-0" />
                  <span>Calendar</span>
                </Link>
                <Link to="/approvals" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300" title="Approvals">
                  <LuSquareCheckBig size={18} className="flex-shrink-0" />
                  <span>Approvals</span>
                </Link>
              </nav>
              <div className="p-4 space-y-2 border-t border-gray-700">
                <button className="flex items-center gap-2 w-full px-3 py-2 bg-amber-600 rounded-md hover:bg-amber-500 text-white text-sm transition-all duration-300" title="Delete CRM accounts with id >= provided value">
                  <LuTrash2 size={16} className="flex-shrink-0" />
                  <span>Purge CRM Accounts</span>
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 bg-red-700 rounded-md hover:bg-red-600 text-white text-sm transition-all duration-300" title="Wipe database tables except roles, departments, statuses, users">
                  <LuTriangleAlert size={16} className="flex-shrink-0" />
                  <span>Wipe Database (Keep Core Tables)</span>
                </button>
              </div>
              <button className="flex items-center gap-2 mt-4 px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-600 transition-all duration-300" title="Logout">
                <LuLogOut size={16} className="flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          )}
        >
          <div className={`${
            isCollapsed ? 'p-2' : 'p-4'
          } text-xl font-bold border-b border-gray-700 flex items-center justify-between transition-all duration-300`}>
            <span className={`${
              isCollapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            } transition-opacity duration-300 whitespace-nowrap overflow-hidden`}>
              WorkOrder System
            </span>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-gray-600 hover:text-white flex-shrink-0"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <LuChevronRight size={18} /> : <LuChevronLeft size={18} />}
            </button>
          </div>
          <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'} space-y-2 transition-all duration-300`}>
            <Link
              to="/dashboard"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Dashboard" : ""}
            >
              <LuLayoutDashboard size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Dashboard
              </span>
            </Link>
            <Link
              to="/workorders"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Workorders" : ""}
            >
              <LuClipboardList size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Workorders
              </span>
            </Link>
            <Link
              to="/salesleads"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Sales Leads" : ""}
            >
              <LuTrendingUp size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Sales Leads
              </span>
            </Link>
            <Link
              to="/technicals"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Technical Reco" : ""}
            >
              <LuWrench size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Technical Reco
              </span>
            </Link>
            <Link
              to="/rfqs"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "RFQs" : ""}
            >
              <LuFileText size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                RFQs
              </span>
            </Link>
            <Link
              to="/accounts"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "NAEF" : ""}
            >
              <LuBuilding2 size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                NAEF
              </span>
            </Link>
            <Link
              to="/quotations"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Quotations" : ""}
            >
              <LuDollarSign size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Quotations
              </span>
            </Link>
            <Link
              to="/users"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Users" : ""}
            >
              <LuUsers size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Users
              </span>
            </Link>
            <Link
              to="/calendar"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Calendar" : ""}
            >
              <LuCalendar size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Calendar
              </span>
            </Link>
            <Link
              to="/approvals"
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-3' : 'gap-3'} rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white transition-all duration-300`}
              title={isCollapsed ? "Approvals" : ""}
            >
              <LuSquareCheckBig size={18} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Approvals
              </span>
            </Link>
          </nav>
          <div className={`${isCollapsed ? 'p-2' : 'p-4'} space-y-2 border-t border-gray-700 transition-all duration-300`}>
            <button
              onClick={async () => {
                try {
                  const minIdInput = window.prompt(
                    "Enter minimum CRM Account ID to purge (id >= minId):",
                    "661",
                  );
                  if (minIdInput === null) return; // cancelled
                  const minId = Number(minIdInput);
                  if (!Number.isFinite(minId)) {
                    alert("Invalid minId. Please enter a number.");
                    return;
                  }

                  // Dry run first
                  const dryRes = await fetch(
                    `${apiUrl}/api/accounts/purge?minId=${encodeURIComponent(
                      String(minId),
                    )}&dryRun=true`,
                    {
                      method: "DELETE",
                      credentials: "include",
                    },
                  );
                  if (!dryRes.ok) {
                    const e = await dryRes.json().catch(() => ({}));
                    throw new Error(e?.error || `Dry-run failed (${dryRes.status})`);
                  }
                  const dryData = await dryRes.json();
                  const toDelete = dryData?.toDelete ?? 0;

                  const confirmText = window.prompt(
                    `This will permanently delete ${toDelete} account(s) with id >= ${minId}.\nType DELETE to confirm.`,
                  );
                  if (confirmText !== "DELETE") return;

                  const res = await fetch(`${apiUrl}/api/accounts/purge`, {
                    method: "DELETE",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ minId, dryRun: false }),
                  });
                  if (!res.ok) {
                    const e = await res.json().catch(() => ({}));
                    throw new Error(e?.error || `Purge failed (${res.status})`);
                  }
                  const data = await res.json();
                  alert(`Deleted ${data?.deleted ?? 0} account(s) with id >= ${minId}.`);
                } catch (err) {
                  console.error("Purge error:", err);
                  alert(`Purge failed: ${err?.message || err}`);
                }
              }}
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-2' : 'gap-2'} w-full px-3 py-2 bg-amber-600 rounded-md hover:bg-amber-500 text-white text-sm transition-all duration-300`}
              title="Delete CRM accounts with id >= provided value"
            >
              <LuTrash2 size={16} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Purge CRM Accounts
              </span>
            </button>

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
              className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-2' : 'gap-2'} w-full px-3 py-2 bg-red-700 rounded-md hover:bg-red-600 text-white text-sm transition-all duration-300`}
              title="Wipe database tables except roles, departments, statuses, users"
            >
              <LuTriangleAlert size={16} className="flex-shrink-0" />
              <span className={`${
                isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
              } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                Wipe Database (Keep Core Tables)
              </span>
            </button>
          </div>
          <button
            onClick={async () => {
              await fetch(`${apiUrl}/auth/logout`, {
                method: "POST",
                credentials: "include", // send cookie
              });
              window.location.href = "/login"; // redirect to login
            }}
            className={`flex items-center ${isCollapsed ? 'justify-center group-hover:justify-start gap-0 group-hover:gap-2' : 'gap-2'} mt-4 px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-600 transition-all duration-300`}
            title={isCollapsed ? "Logout" : ""}
          >
            <LuLogOut size={16} className="flex-shrink-0" />
            <span className={`${
              isCollapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto' : 'opacity-100'
            } transition-all duration-300 whitespace-nowrap overflow-hidden`}>
              Logout
            </span>
          </button>
        </aside>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
