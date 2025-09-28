// src/components/Layout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL;

fetch(`${apiUrl}/healthcheck`)
  .then(res => res.json())
  .then(data => console.log(data));


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
              to="/users"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Users
            </Link>
          </nav>
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
