// src/components/Layout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL;

fetch(`${apiUrl}/healthcheck`)
  .then((res) => res.json())
  .then((data) => console.log(data));

export default function Layout() {
  const location = useLocation();

  // Define routes where sidebar should not appear
  const hideSidebar = location.pathname === "/login";

  return (
    <div className="flex h-screen w-full">
      {!hideSidebar && (
        <aside className="w-[223px] bg-gray-800 text-white flex flex-col">
          <div className="p-4 text-xl font-bold border-b border-gray-700">
            WorkOrder System
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link
              to="/dashboard"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Dashboard
            </Link>
            <Link
              to="/workorders"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Workorders
            </Link>
            <Link
              to="/salesleads"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Sales Leads
            </Link>
            <Link
              to="/technicals"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Technical Reco
            </Link>
            <Link
              to="/rfqs"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              RFQs
            </Link>
            <Link
              to="/accounts"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              NAEF
            </Link>
            <Link
              to="/quotations"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Quotations
            </Link>
            <Link
              to="/users"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Users
            </Link>
            <Link
              to="/calendar"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Calendar
            </Link>
            <Link
              to="/approvals"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Approvals
            </Link>
          </nav>
          <div className="p-4 space-y-2 border-t border-gray-700">
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
              className="w-full px-3 py-2 bg-amber-600 rounded-md hover:bg-amber-500 text-white text-sm"
              title="Delete CRM accounts with id >= provided value"
            >
              Purge CRM Accounts
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
              className="w-full px-3 py-2 bg-red-700 rounded-md hover:bg-red-600 text-white text-sm"
              title="Wipe database tables except roles, departments, statuses, users"
            >
              Wipe Database (Keep Core Tables)
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
            className="mt-4 px-3 py-2 bg-red-600 rounded-md hover:bg-red-500"
          >
            Logout
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
