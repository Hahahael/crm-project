//src/pages/UsersPages
import { useState, useEffect } from "react";
import { LuSearch, LuPlus } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import UsersTable from "../components/UsersTable";
import UserForm from "../components/UserForm";
import UserDetailsWrapper from "../components/UserDetailsWrapper";
import ConfirmModal from "../components/ConfirmModal";
import LoadingModal from "../components/LoadingModal";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch users + hierarchy data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [usersRes, rolesRes, deptsRes, statusesRes] = await Promise.all([
          apiBackendFetch("/api/users"),
          apiBackendFetch("/api/hierarchy/roles"),
          apiBackendFetch("/api/hierarchy/departments"),
          apiBackendFetch("/api/hierarchy/statuses"),
        ]);

        if (!usersRes.ok || !rolesRes.ok || !deptsRes.ok || !statusesRes.ok)
          throw new Error("Failed to fetch some data");

        const [usersData, rolesData, departmentsData, statusesData] =
          await Promise.all([
            usersRes.json(),
            rolesRes.json(),
            deptsRes.json(),
            statusesRes.json(),
          ]);

        setUsers(usersData);
        setRoles(rolesData);
        setDepartments(departmentsData);
        setStatuses(statusesData);
        setTimeout(() => setLoading(false), 500);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to fetch data.");
        setTimeout(() => setLoading(false), 500);
      }
    };

    fetchAllData();
  }, []);

  if (loading)
    return (
      <LoadingModal
        message="Loading Users..."
        subtext="Please wait while we fetch your data."
      />
    );
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  // Save (create/edit) user
  const handleSaveUser = async (formData, mode) => {
    try {
      const response = await apiBackendFetch(
        mode === "edit" ? `/api/users/${formData.id}` : "/api/users",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) throw new Error("Failed to save user");

      const savedUser = await response.json();
      console.log("✅ Saved:", savedUser);

      if (mode === "edit") {
        setUsers((prev) =>
          prev.map((u) => (u.id === savedUser.id ? savedUser : u)),
        );
        setSelectedUserId(savedUser.id);
      } else {
        setUsers((prev) => [...prev, savedUser]);
      }

      setEditingUser(null);
    } catch (err) {
      console.error("❌ Error saving user:", err);
      setError("Failed to save user.");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await apiBackendFetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete user");

      // Remove from local state
      setUsers((prev) => prev.filter((u) => u.id !== userId));

      // Close drawers if deleting from details view
      if (selectedUserId === userId) setSelectedUserId(null);
      if (editingUser?.id === userId) setEditingUser(null);

      console.log(`✅ User ${userId} deleted`);
    } catch (err) {
      console.error("❌ Error deleting user:", err);
      setError("Failed to delete user.");
    } finally {
      setDeleteId(null); // close modal
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      {/* Users Table */}
      {!selectedUserId && !editingUser && (
        <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">User Setup</h1>
              <h2 className="text-md text-gray-700">
                Manage user accounts, roles, and permissions
              </h2>
            </div>
          </div>

          {/* Search + Create */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors pl-10"
                  placeholder="Search users..."
                />
              </div>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setEditingUser({})}
                className="ml-auto px-4 py-2 rounded-md bg-gray-950 text-white hover:bg-gray-700 font-medium transition-all duration-150 cursor-pointer text-sm flex"
              >
                <LuPlus className="my-auto mr-2" /> Create User
              </button>
            </div>
          </div>

          <UsersTable
            users={users}
            onView={(user) => setSelectedUserId(user.id)}
            onEdit={(user) => setEditingUser(user)}
            onDelete={(userId) => setDeleteId(userId)}
          />
        </div>
      )}

      {/* User Details Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          selectedUserId && !editingUser
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {selectedUserId && !editingUser && (
          <UserDetailsWrapper
            userId={selectedUserId}
            onBack={() => setSelectedUserId(null)}
            onEdit={(user) => setEditingUser(user)}
            onDelete={(user) => setDeleteId(user.id)}
          />
        )}
      </div>

      {/* User Form Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          editingUser
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {editingUser && (
          <UserForm
            user={editingUser}
            roles={roles}
            departments={departments}
            statuses={statuses}
            mode={editingUser?.id ? "edit" : "create"}
            onBack={() => setEditingUser(null)}
            onSave={handleSaveUser}
            source={selectedUserId ? "details" : "table"}
          />
        )}
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteId) handleDeleteUser(deleteId); // ✅ only delete after confirm
          setDeleteId(null); // ✅ close modal
        }}
        onCancel={() => setDeleteId(null)} // ✅ close modal if canceled
        isDanger={true}
      />
    </div>
  );
};

export default UsersPage;
