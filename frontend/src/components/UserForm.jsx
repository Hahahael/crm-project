//src/components/UserForm.jsx
import { useState, useEffect, useRef } from "react";
import { LuChevronsUpDown, LuArrowLeft } from "react-icons/lu";
import config from "../config";
import defaultAvatar from "../assets/default-avatar.png";

const UserForm = ({
  user,
  roles,
  departments,
  statuses,
  mode = "create",
  onBack,
  onSave,
  source,
}) => {
  const [openRole, setOpenRole] = useState(false);
  const [openDepartment, setOpenDepartment] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const roleRef = useRef(null);
  const departmentRef = useRef(null);
  const statusRef = useRef(null);

  const [formData, setFormData] = useState(
    user || {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phoneNumber: "",
      role: "",
      department: "",
      status: "Active",
      permissions: [],
      joinedDate: new Date().toISOString().split("T")[0],
    },
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) {
        setOpenRole(false);
      }
      if (departmentRef.current && !departmentRef.current.contains(e.target)) {
        setOpenDepartment(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setOpenStatus(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCheckboxChange = (permission, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        permissions: [...(formData.permissions || []), permission],
      });
    } else {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => p !== permission),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave(formData, mode);
  };

  return (
    <div className="h-full w-full p-6 overflow-y-auto">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 rounded px-4 py-2 font-medium hover:bg-gray-100 transition-all duration-150 flex align-middle"
        >
          <LuArrowLeft className="my-auto mr-2 text-lg" />{" "}
          <span className="text-xs my-auto">
            {source === "details" ? "Back to User Details" : "Back to Users"}
          </span>
        </button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Edit User</h1>
          <h2 className="text-md text-gray-700">
            Update user information and permissions
          </h2>
        </div>
      </div>

      {/* User Profile */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-y-6 max-w-4xl"
      >
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Basic Information
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="flex">
              <img
                src={formData.avatarUrl || defaultAvatar}
                alt={formData.avatarUrl || defaultAvatar}
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = defaultAvatar;
                }}
              />
              <div className="flex flex-col w-full mt-auto ml-4">
                <label className="text-sm" htmlFor="avatarUrl">
                  Avatar URL
                </label>
                <input
                  type="text"
                  name="avatarUrl"
                  value={formData.avatarUrl}
                  onChange={handleChange}
                  className="w-full border rounded-md pl-3 p-2 bg-yellow-50 border-gray-200 focus:border-black h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="text-sm">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full border rounded-md pl-3 p-2 bg-yellow-50 border-gray-200 focus:border-black h-9 text-sm"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="text-sm">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full border rounded-md pl-3 p-2 bg-yellow-50 border-gray-200 focus:border-black h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="text-sm">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full border rounded-md pl-3 p-2 bg-yellow-50 border-gray-200 focus:border-black h-9 text-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm">
                  E-mail *
                </label>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border rounded-md pl-3 p-2 bg-yellow-50 border-gray-200 focus:border-black h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="phoneNumber" className="text-sm">
                Phone Number *
              </label>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                placeholder="+1 (555) 123-4567"
                onChange={handleChange}
                className="w-full border rounded-md pl-3 p-2 bg-yellow-50 border-gray-200 focus:border-black h-9 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Role and Department
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-5">
              <div className="flex flex-col">
                <label
                  htmlFor="role"
                  className="text-sm font-medium text-gray-500"
                >
                  Role *
                </label>
                <div className="relative w-64" ref={roleRef}>
                  <button
                    type="button"
                    onClick={() => setOpenRole(!openRole)}
                    className="flex pl-3 cursor-pointer w-full rounded-md border border-gray-300 bg-yellow-50 p-2 text-sm text-left focus:border-black"
                  >
                    {roles.find((role) => role.id === formData.roleId)
                      ?.roleName || "Select a role"}{" "}
                    <LuChevronsUpDown className="my-auto ml-auto" />
                  </button>

                  <ul
                    className={`absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg transform transition-all duration-200 origin-top 
                      ${openRole ? "translate-y-[-100%] opacity-100" : "scale-y-0 opacity-0 pointer-events-none"}`}
                  >
                    {roles.map((role) => (
                      <li
                        key={role.id}
                        className="cursor-pointer px-3 py-2 hover:bg-yellow-100 text-sm"
                        onClick={() => {
                          setFormData({ ...formData, roleId: role.id });
                          setOpenRole(false);
                        }}
                      >
                        {role.roleName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="role"
                  className="text-sm font-medium text-gray-500"
                >
                  Department *
                </label>
                <div className="relative w-64" ref={departmentRef}>
                  <button
                    type="button"
                    onClick={() => setOpenDepartment(!openDepartment)}
                    className="pl-3 cursor-pointer w-full rounded-md border border-gray-300 bg-yellow-50 p-2 text-sm text-left focus:border-black flex"
                  >
                    {departments.find(
                      (department) => department.id === formData.department,
                    )?.departmentName || "Select a department"}{" "}
                    <LuChevronsUpDown className="my-auto ml-auto" />
                  </button>

                  <ul
                    className={`absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg transform transition-all duration-200 origin-top 
                    ${openDepartment ? "translate-y-[-100%] opacity-100" : "scale-y-0 opacity-0 pointer-events-none"}`}
                  >
                    {departments.map((department) => (
                      <li
                        key={department.id}
                        className="cursor-pointer px-3 py-2 hover:bg-yellow-100 text-sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            departmentId: department.id,
                          });
                          setOpenDepartment(false);
                        }}
                      >
                        {department.departmentName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Status
              </label>
              <div className="relative w-64" ref={statusRef}>
                <button
                  type="button"
                  onClick={() => setOpenStatus(!openStatus)}
                  className="pl-3 cursor-pointer w-full rounded-md border border-gray-300 bg-yellow-50 p-2 text-sm text-left focus:border-black flex"
                >
                  {statuses.find((status) => status.id === formData.statusId)
                    ?.statusName || "Select a status"}{" "}
                  <LuChevronsUpDown className="my-auto ml-auto" />
                </button>

                <ul
                  className={`absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg transform transition-all duration-200 origin-top 
                  ${openStatus ? "translate-y-[-100%] opacity-100" : "scale-y-0 opacity-0 pointer-events-none"}`}
                >
                  {statuses.map((status) => (
                    <li
                      key={status.id}
                      className="cursor-pointer px-3 py-2 hover:bg-yellow-100 text-sm"
                      onClick={() => {
                        setFormData({ ...formData, statusId: status.id });
                        setOpenStatus(false);
                      }}
                    >
                      {status.statusName}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Permissions
            </h3>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {Object.entries(config.permissions).map(([group, perms]) => (
                <div key={group}>
                  <div className="grid grid-cols-3">
                    {perms.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          value={permission}
                          checked={formData.permissions?.includes(permission)}
                          onChange={(e) =>
                            handleCheckboxChange(permission, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {permission}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          className={`rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm ${mode === "edit" ? "" : "flex-none"}`}
        >
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Account Settings
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div>
              <label
                htmlFor="joinedDate"
                className="text-sm font-medium text-gray-500"
              >
                Join Date
              </label>
              <input
                type="date"
                id="joinedDate"
                name="joinedDate"
                value={
                  formData.joinedDate
                    ? new Date(formData.joinedDate).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0] // ✅ default to today
                }
                onChange={(e) =>
                  setFormData({ ...formData, joinedDate: e.target.value })
                }
                className="mt-1 block rounded-md border border-gray-300 bg-yellow-50 p-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="ml-auto px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
        >
          {mode === "edit" ? "Update User" : "Create User"}
        </button>
      </form>
    </div>
  );
};

export default UserForm;
