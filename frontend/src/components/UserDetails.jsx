import React from "react";

const roleColors = {
  Admin: "bg-purple-100 text-purple-700",
  Manager: "bg-blue-100 text-blue-700",
  "Sales Agent": "bg-green-100 text-green-700",
  "Technical Engineer": "bg-yellow-100 text-yellow-700",
  "Field Service": "bg-pink-100 text-pink-700",
};

const statusColors = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-red-100 text-red-700",
};

const UserDetails = ({ user, onBack }) => {
  return (
    <div className="h-full w-full p-6 overflow-y-auto">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 rounded bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-6 mb-8">
        <img
          src={user.avatar_url}
          alt={user.username}
          className="h-24 w-24 rounded-full object-cover border"
        />
        <div>
          <h2 className="text-xl font-semibold">
            {user.first_name} {user.last_name}
          </h2>
          <p className="text-gray-500">@{user.username}</p>
          <p className="text-gray-500">{user.email}</p>
          <p className="text-gray-500">{user.phone_number}</p>
        </div>
      </div>

      {/* User Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">Role</h3>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
              roleColors[user.role] || "bg-gray-100 text-gray-700"
            }`}
          >
            {user.role}
          </span>
        </div>

        {/* Department */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">Department</h3>
          <p className="text-gray-800">{user.department}</p>
        </div>

        {/* Status */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">Status</h3>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
              statusColors[user.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {user.status}
          </span>
        </div>

        {/* Last Login */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">
            Last Login
          </h3>
          <p className="text-gray-800">{user.last_login || "—"}</p>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
