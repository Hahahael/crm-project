// src/components/Layout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  // Define routes where sidebar should not appear
  const hideSidebar = location.pathname === "/login";

  return (
    <div className="flex h-screen w-full">
      {!hideSidebar && (
        <aside className="w-64 bg-gray-800 text-white flex flex-col">
          <div className="p-4 text-xl font-bold border-b border-gray-700">
            My App
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link
              to="/dashboard"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Dashboard
            </Link>
            <Link
              to="/users"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Users
            </Link>
            <Link
              to="/settings"
              className="block rounded-md px-3 py-2 hover:bg-gray-700"
            >
              Settings
            </Link>
          </nav>
        </aside>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
