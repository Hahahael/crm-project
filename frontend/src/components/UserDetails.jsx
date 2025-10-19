//src/components/UserDetails
import React from "react";
import { LuPrinter, LuArrowLeft, LuPencil, LuTrash } from "react-icons/lu";
import config from "../config.js";
import util from "../helper/utils.js";

const UserDetails = ({ user, onBack, onEdit, onDelete }) => {
  return (
    <div className="h-full w-full p-6 overflow-y-auto">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 rounded px-4 py-2 font-medium hover:bg-gray-100 transition-all duration-150 flex align-middle"
        >
          <LuArrowLeft className="my-auto mr-2 text-lg" />{" "}
          <span className="text-xs my-auto">Back to Users</span>
        </button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">User Details</h1>
          <h2 className="text-md text-gray-700">
            View and manage user information
          </h2>
        </div>
        <div className="flex flex-col gap-x-2 gap-y-2 ml-auto lg:flex-row">
          <button className="flex border border-gray-200 hover:bg-gray-100 transition-all duration-150 cursor-pointer px-2 py-1 rounded-md align-middle justify-center items-center text-sm">
            <LuPrinter className="my-auto mr-2" /> Print
          </button>
          <button
            onClick={() => onEdit(user)}
            className="flex border border-gray-200 hover:bg-gray-100 transition-all duration-150 cursor-pointer px-2 py-1 rounded-md align-middle justify-center items-center text-sm"
          >
            <LuPencil className="my-auto mr-2 cursor-pointer" /> Edit User
          </button>
          <button
            onClick={() => onDelete(user)}
            className="text-white bg-red-500 flex border hover:bg-red-400 transition-all duration-150 cursor-pointer px-2 py-1 rounded-md align-middle justify-center items-center text-sm"
          >
            <LuTrash className="my-auto mr-2 cursor-pointer" /> Delete User
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-6 mb-7 border border-gray-200 rounded-xl shadow-sm p-5">
        <img
          src={user.avatarUrl}
          alt={user.username}
          className="h-24 w-24 rounded-full object-cover m-1"
        />
        <div className="flex flex-col gap-y-2">
          <div className="flex align-middle gap-4">
            <h2 className="text-3xl font-bold">
              {user.firstName} {user.lastName}
            </h2>
            <span
              className={`rounded-md my-auto px-2 py-1 text-xs font-semibold ${
                config.statusBadgeClasses[user.status] ||
                "bg-gray-100 text-gray-700"
              }`}
            >
              {user.status}
            </span>
          </div>
          <div className="flex align-middle gap-3">
            <span
              className={`rounded-md my-auto px-2 py-1 text-xs font-semibold ${
                config.roleBadgeClasses[user.role] ||
                "bg-gray-100 text-gray-700"
              }`}
            >
              {user.role}
            </span>
            <span className="rounded-md my-auto px-2 py-1 text-xs font-semibold border border-gray-200">
              {user.department}
            </span>
          </div>
          <p className="text-gray-500">
            @{user.username} • {user.email}
          </p>
        </div>
      </div>

      {/* User Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Basic Information
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  First Name
                </label>
                <p className="font-medium">{user.firstName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Last Name
                </label>
                <p className="font-medium">{user.lastName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Username
                </label>
                <p className="font-medium">{user.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Email
                </label>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Phone Number
              </label>
              <p className="font-medium">{user.phoneNumber}</p>
            </div>
          </div>
        </div>

        {/* Role and Department */}
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Role and Department
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <div className="mt-1">
                <div className="inline-flex items-center">
                  <span
                    className={`rounded-md my-auto px-2 py-1 text-xs font-semibold ${
                      config.roleBadgeClasses[user.roleName] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.roleName}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Department
              </label>
              <p className="font-medium">{user.departmentName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Status
              </label>
              <div className="mt-1">
                <div className="inline-flex items-center">
                  <span
                    className={`rounded-md my-auto px-2 py-1 text-xs font-semibold ${
                      config.statusBadgeClasses[user.statusName] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.statusName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Activity */}
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Account Activity
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Join Date
              </label>
              <p className="font-medium">
                {util.formatDate(user.joinedDate, "DD/MM/YYYY") || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Last Login
              </label>
              <p className="font-medium">
                {util.formatDate(user.lastLogin, "DD/MM/YYYY hh:mm A") || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Created By
              </label>
              <p className="font-medium">{user.createdBy || "system"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Last Modified
              </label>
              <p className="font-medium">
                {util.formatDate(user.updatedAt, "DD/MM/YYYY") || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight bg-blue-600 text-white p-3 -m-6 mb-4 rounded-t-lg">
              Permissions
            </h3>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {user.permissions?.map((permission, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground text-xs"
                  >
                    {permission}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
