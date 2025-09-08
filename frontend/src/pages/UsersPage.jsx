// UsersPage.jsx
import { useState } from "react";
import UsersTable from "../components/UsersTable";
import UserDetails from "../components/UserDetails";
import { users } from "../data/users"

const UsersPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Users Table (background) */}
      <div
        className={`p-6 transition-all duration-300 ${
          selectedUser
            ? "translate-x-[10px] opacity-50 pointer-events-none"
            : "translate-x-0 opacity-100"
        }`}
      >
        <h1 className="mb-4 text-2xl font-bold">Users</h1>
        <UsersTable users={users} onView={setSelectedUser} />
      </div>

      {/* Slide-in User Details */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-transform duration-300 ${
          selectedUser ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedUser && (
          <UserDetails user={selectedUser} onBack={() => setSelectedUser(null)} />
        )}
      </div>
    </div>
  );
};

export default UsersPage;
