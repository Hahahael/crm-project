//src/components/WorkOrdersTable
import {
  LuEllipsis,
  LuEye,
  LuPencil,
  LuTrash,
  LuClock,
  LuCircleAlert,
  LuCheck,
  LuArrowUp,
  LuArrowDown,
  LuArrowUpDown,
} from "react-icons/lu";
import { useState } from "react";
import util from "../helper/utils.js";
import { useUser } from "../contexts/UserContext.jsx";
import config from "../config.js";

export default function SalesLeadsTable({ salesLeads, onView, onEdit }) {
  const { currentUser } = useUser();
  console.log("Current User in SalesLeadsTable:", currentUser);
  const baseBadge = "inline-flex items-center px-2.5 py-0.5 text-xs";

  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Handle column sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort the sales leads
  const sortedSalesLeads = [...salesLeads].sort((a, b) => {
    if (!sortField) return 0;

    let aVal, bVal;

    switch (sortField) {
      case 'slNumber':
        aVal = a.slNumber || '';
        bVal = b.slNumber || '';
        break;
      case 'account':
        aVal = (a.account?.kristem?.Name || '').toLowerCase();
        bVal = (b.account?.kristem?.Name || '').toLowerCase();
        break;
      case 'application':
        aVal = (a.application || '').toLowerCase();
        bVal = (b.application || '').toLowerCase();
        break;
      case 'machine':
        aVal = (a.machine || '').toLowerCase();
        bVal = (b.machine || '').toLowerCase();
        break;
      case 'contactNumber':
        aVal = (a.contactNumber || '').toLowerCase();
        bVal = (b.contactNumber || '').toLowerCase();
        break;
      case 'stageStatus':
        aVal = (a.stageStatus || '').toLowerCase();
        bVal = (b.stageStatus || '').toLowerCase();
        break;
      case 'salesStage':
        aVal = (a.salesStage || '').toLowerCase();
        bVal = (b.salesStage || '').toLowerCase();
        break;
      case 'priority':
        aVal = (a.priority || a.urgency || '').toLowerCase();
        bVal = (b.priority || b.urgency || '').toLowerCase();
        break;
      case 'fslDate':
        aVal = new Date(a.fslDate || 0);
        bVal = new Date(b.fslDate || 0);
        break;
      case 'dueDate':
        aVal = new Date(a.dueDate || 0);
        bVal = new Date(b.dueDate || 0);
        break;
      case 'doneDate':
        aVal = new Date(a.doneDate || 0);
        bVal = new Date(b.doneDate || 0);
        break;
      case 'updatedAt':
        aVal = new Date(a.updatedAt || 0);
        bVal = new Date(b.updatedAt || 0);
        break;
      default:
        return 0;
    }

    // Handle comparison
    let comparison = 0;
    if (aVal > bVal) {
      comparison = 1;
    } else if (aVal < bVal) {
      comparison = -1;
    }

    return sortDirection === 'desc' ? comparison * -1 : comparison;
  });

  // Render sort icon for header
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <LuArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <LuArrowUp className="w-4 h-4 text-blue-600" />
      : <LuArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const renderStatusBadge = (status) => {
    if (!status)
      return (
        <span className={`${baseBadge} rounded-full bg-gray-50 text-gray-600`}>
          -
        </span>
      );
    const s = String(status).toLowerCase();
    switch (s) {
      case "pending":
      case "draft":
        return (
          <span
            className={`${baseBadge} rounded-full bg-yellow-100 text-yellow-800`}
          >
            {status}
          </span>
        );
      case "open":
      case "in progress":
      case "in-progress":
      case "active":
      case "started":
        return (
          <span
            className={`${baseBadge} rounded-full bg-blue-50 text-blue-700`}
          >
            {status}
          </span>
        );
      case "completed":
      case "done":
      case "submitted":
      case "approved":
        return (
          <span
            className={`${baseBadge} rounded-full bg-green-50 text-green-700`}
          >
            {status}
          </span>
        );
      case "cancelled":
      case "canceled":
      case "rejected":
        return (
          <span className={`${baseBadge} rounded-full bg-red-50 text-red-700`}>
            {status}
          </span>
        );
      default:
        return (
          <span
            className={`${baseBadge} rounded-full bg-gray-50 text-gray-600`}
          >
            {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority) => {
    console.log(
      "Rendering priority badge for priority:",
      String(priority).toLowerCase(),
    );
    if (!priority)
      return (
        <span className={`${baseBadge} rounded-full bg-gray-50 text-gray-600`}>
          -
        </span>
      );
    const s = String(priority).toLowerCase();
    switch (s) {
      case "low":
        return (
          <span
            className={`${baseBadge} rounded-full bg-green-100 text-green-800`}
          >
            {priority}
          </span>
        );
      case "medium":
        return (
          <span
            className={`${baseBadge} rounded-full bg-amber-50 text-amber-700`}
          >
            {priority}
          </span>
        );
      case "high":
      case "high - production affected":
        return (
          <span className={`${baseBadge} rounded bg-red-50 text-red-700`}>
            {priority}
          </span>
        );
      default:
        return (
          <span
            className={`${baseBadge} rounded-full bg-gray-50 text-gray-600`}
          >
            {priority}
          </span>
        );
    }
  };

  const renderSubstatusBadge = (name) => {
    if (!name)
      return <span className={`${baseBadge} bg-gray-50 text-gray-600`}>-</span>;
    const n = String(name).toLowerCase();
    if (n.includes("sales"))
      return (
        <span className={`${baseBadge} rounded-sm bg-blue-50 text-blue-700`}>
          {name}
        </span>
      );
    if (n.includes("technical"))
      return (
        <span
          className={`${baseBadge} rounded-sm bg-purple-50 text-purple-800`}
        >
          {name}
        </span>
      );
    if (n.includes("rfq"))
      return (
        <span className={`${baseBadge} rounded-sm bg-amber-50 text-amber-800`}>
          {name}
        </span>
      );
    if (n.includes("naef"))
      return (
        <span className={`${baseBadge} rounded-sm bg-teal-50 text-teal-800`}>
          {name}
        </span>
      );
    if (n.includes("quotation"))
      return (
        <span className={`${baseBadge} rounded-sm bg-green-50 text-green-700`}>
          {name}
        </span>
      );
    return (
      <span className={`${baseBadge} rounded-sm bg-gray-50 text-gray-600`}>
        {name}
      </span>
    );
  };

  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b">
          <tr>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('slNumber')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                SL#
                {renderSortIcon('slNumber')}
              </button>
            </th>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('account')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Account
                {renderSortIcon('account')}
              </button>
            </th>
            <th className="px-4 py-2">
              End User
            </th>
            <th className="px-4 py-2 w-[10%]">
              <button 
                onClick={() => handleSort('application')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Application
                {renderSortIcon('application')}
              </button>
            </th>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('machine')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Machine
                {renderSortIcon('machine')}
              </button>
            </th>
            <th className="px-4 py-2">
              <button 
                onClick={() => handleSort('contactNumber')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Contact
                {renderSortIcon('contactNumber')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('salesStage')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Sales Stage
                {renderSortIcon('salesStage')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('priority')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Urgency
                {renderSortIcon('priority')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('fslDate')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Follow-up Date
                {renderSortIcon('fslDate')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('dueDate')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Due Date
                {renderSortIcon('dueDate')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('doneDate')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Done Date
                {renderSortIcon('doneDate')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('updatedAt')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Last Updated
                {renderSortIcon('updatedAt')}
              </button>
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">
              Task Status
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm text-right w-[5%]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedSalesLeads.map((sl) => (
            <tr
              key={sl.id}
              className="hover:bg-gray-50 transition-all duration-200"
            >
              <td className="px-4 py-2 text-black text-sm">{sl.slNumber}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.account?.kristem?.Name}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.account?.kristem?.Name}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.application}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.machine}</td>
              <td className="px-4 py-2 text-black text-sm">
                {sl.contactNumber}
                <br />
                <span className="text-gray-500 text-xs">{sl.emailAddress}</span>
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {renderSubstatusBadge(sl.stageName)}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {(() => {
                  const prio = sl.priority || sl.urgency || "-";
                  return renderPriorityBadge(prio);
                })()}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(sl.fslDate, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(sl.dueDate, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(sl.doneDate, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(sl.updatedAt, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {(() => {
                  const { status, daysLate } = util.calculateTimeliness(
                    sl.dueDate,
                    sl.doneDate,
                  );
                  const base =
                    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
                  switch (status) {
                    case "overdue":
                      return (
                        <div
                          className={`${base} bg-red-50 text-red-700 border-red-200`}
                        >
                          <LuClock className="mr-2 h-4 w-4 text-red-700" />
                          <span>
                            Overdue
                            {typeof daysLate === "number"
                              ? ` · ${daysLate}d`
                              : ""}
                          </span>
                        </div>
                      );
                    case "late":
                      return (
                        <div
                          className={`${base} bg-yellow-50 text-yellow-800 border-yellow-200`}
                        >
                          <LuCircleAlert className="mr-2 h-4 w-4 text-yellow-800" />
                          <span>
                            Late
                            {typeof daysLate === "number"
                              ? ` · ${daysLate}d`
                              : ""}
                          </span>
                        </div>
                      );
                    case "on_time":
                      return (
                        <div
                          className={`${base} bg-green-50 text-green-700 border-green-200`}
                        >
                          <LuCheck className="mr-2 h-4 w-4 text-green-700" />
                          <span>On time</span>
                        </div>
                      );
                    default:
                      return (
                        <div
                          className={`${base} bg-gray-50 text-gray-600 border-gray-200`}
                        >
                          <span>-</span>
                        </div>
                      );
                  }
                })()}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => onView(sl)}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
                  </button>
                  <button
                    onClick={() => onEdit(sl)}
                    className={`rounded px-2 py-1 text-black border border-gray-200 bg-white transition-all duration-200 ${sl.stageStatus === "Approved" || sl.assignee !== currentUser?.id ? "opacity-50 cursor-not-allowed hover:bg-white pointer-events-none" : "cursor-pointer hover:bg-gray-100"}`}
                  >
                    <LuPencil className="my-auto" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
