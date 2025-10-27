//src/components/UsersTable
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import config from "../config.js";
import util from "../helper/utils.js";

const TRANSITION_MS = 150;

export default function UsersTable({ users, onView, onEdit, onDelete }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const buttonRefs = useRef({});
  const menuRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Compute menu position
  const computePosition = (btn) => {
    const rect = btn.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 2,
      left: rect.right + window.scrollX,
    };
  };

  const openFor = (userId) => {
    const btn = buttonRefs.current[userId];
    if (!btn) return;
    setMenuPosition(computePosition(btn));
    setOpenMenuId(userId);
    setIsMounted(true);
    requestAnimationFrame(() => setIsVisible(true));
  };

  const startClose = () => {
    setIsVisible(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
      setOpenMenuId(null);
    }, TRANSITION_MS + 40);
  };

  const toggleMenu = (userId) => {
    if (openMenuId === userId) {
      startClose();
    } else if (isMounted) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setMenuPosition(computePosition(buttonRefs.current[userId]));
      setOpenMenuId(userId);
      setIsVisible(true);
    } else {
      openFor(userId);
    }
  };

  // Handle view action
  const handleView = (userId) => {
    const user = users.find((u) => u.id === userId);
    onView(user); // send to parent
    startClose();
  };

  const handleEdit = (userId) => {
    const user = users.find((u) => u.id === userId);
    onEdit(user); // send to parent
    startClose();
  };

  const handleDelete = (userId) => {
    onDelete(userId);
    startClose();
  };

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!openMenuId) return;
      const btn = buttonRefs.current[openMenuId];
      if (btn?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      startClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white min-w-4xl">
      {/* Table */}
      <table className="min-w-4xl border-collapse text-left text-sm">
        <thead className="hover:bg-gray-100 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 min-w-xs">
              User
            </th>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 w-[15%]">
              Username
            </th>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 w-[15%]">
              Email
            </th>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 w-[15%]">
              Role
            </th>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 w-[15%]">
              Department
            </th>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 w-[15%]">
              Status
            </th>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 w-[15%]">
              Last Login
            </th>
            <th className="px-4 py-2 font-normal text-sm text-gray-500 text-right">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr
              key={user.id}
              className="hover:bg-gray-100 transition-all duration-200"
            >
              <td className="px-4 py-2 text-black flex text-sm">
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="h-10 w-10 rounded-full object-cover mr-3"
                />
                <span className="my-auto">
                  {`${user.firstName} ${user.lastName}`}
                  <br />
                  <span className="text-gray-400">{user.phoneNumber}</span>
                </span>
              </td>
              <td className="px-4 py-2 text-black text-sm">{user.username}</td>
              <td className="px-4 py-2 text-black text-sm">{user.email}</td>
              <td className="px-4 py-2 text-black text-sm">
                <span
                  className={`rounded-md px-3 py-1 text-xs font-semibold text-center block ${
                    config.roleBadgeClasses[user.roleName] ||
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.roleName}
                </span>
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {user.departmentName}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold text-center block ${
                    config.statusBadgeClasses[user.statusName] ||
                    "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {user.statusName}
                </span>
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(user.lastLogin, "MM/DD/YYYY hh:mm A")}
              </td>
              <td className="px-4 py-2 text-black text-sm text-right">
                <button
                  ref={(el) => (buttonRefs.current[user.id] = el)}
                  onClick={() => toggleMenu(user.id)}
                  className="rounded p-2 hover:bg-gray-200"
                >
                  <LuEllipsis />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Context menu */}
      {isMounted &&
        createPortal(
          <div
            ref={menuRef}
            className="absolute z-50 w-36 rounded-md border border-gray-200 bg-white shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              transform: isVisible
                ? "translateX(-100%) translateY(0)"
                : "translateX(-100%) translateY(-6px)",
              opacity: isVisible ? 1 : 0,
              transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
            }}
          >
            <ul className="flex flex-col text-sm text-gray-700">
              <li
                className="cursor-pointer px-4 py-2 hover:bg-gray-100 flex"
                onClick={() => handleView(openMenuId)}
              >
                <LuEye className="my-auto mr-2" /> View Details
              </li>
              <li
                className="cursor-pointer px-4 py-2 hover:bg-gray-100 flex"
                onClick={() => handleEdit(openMenuId)}
              >
                <LuPencil className="my-auto mr-2" /> Edit User
              </li>
              <li
                className="cursor-pointer px-4 py-2 text-red-600 hover:bg-gray-100 flex"
                onClick={() => handleDelete(openMenuId)}
              >
                <LuTrash className="my-auto mr-2" /> Delete User
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
