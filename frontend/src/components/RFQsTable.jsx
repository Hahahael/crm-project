//src/components/RFQsTable
import {
  LuEllipsis,
  LuEye,
  LuPencil,
  LuTrash,
  LuCheck,
  LuClock,
  LuCircleAlert,
  LuArrowUp,
  LuArrowDown,
  LuArrowUpDown,
} from "react-icons/lu";
import { useState } from "react";
import util, { formatMoney } from "../helper/utils.js";
import config from "../config.js";
import { useUser } from "../contexts/UserContext.jsx";

export default function RFQsTable({ rfqs, onView, onEdit }) {
  const { currentUser } = useUser();
  const baseBadge = "inline-flex items-center px-2.5 py-0.5 text-xs";

  // Sorting state
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

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

  // Sort the RFQs
  const sortedRFQs = [...rfqs].sort((a, b) => {
    if (!sortField) return 0;

    let aVal, bVal;

    switch (sortField) {
      case 'rfqNumber':
        aVal = a.rfqNumber || '';
        bVal = b.rfqNumber || '';
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt || 0);
        bVal = new Date(b.createdAt || 0);
        break;
      case 'account':
        aVal = (a.account?.kristem?.Name || '').toLowerCase();
        bVal = (b.account?.kristem?.Name || '').toLowerCase();
        break;
      case 'selectedVendor':
        aVal = (a.vendor?.Name || a.vendor?.name || a.vendor?.VendorName || '').toLowerCase();
        bVal = (b.vendor?.Name || b.vendor?.name || b.vendor?.VendorName || '').toLowerCase();
        break;
      case 'contactPerson':
        aVal = (a.contactPerson || '').toLowerCase();
        bVal = (b.contactPerson || '').toLowerCase();
        break;
      case 'slNumber':
        aVal = a.slNumber || '';
        bVal = b.slNumber || '';
        break;
      case 'stageStatus':
        aVal = (a.stageStatus || '').toLowerCase();
        bVal = (b.stageStatus || '').toLowerCase();
        break;
      case 'grandTotal':
        aVal = Number(a.grandTotal || 0);
        bVal = Number(b.grandTotal || 0);
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

  console.log("RFQsTable - rfqs:", rfqs);
  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b">
          <tr>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('rfqNumber')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                RFQ#
                {renderSortIcon('rfqNumber')}
              </button>
            </th>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('createdAt')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Date
                {renderSortIcon('createdAt')}
              </button>
            </th>
            <th className="px-4 py-2">
              <button 
                onClick={() => handleSort('account')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Account
                {renderSortIcon('account')}
              </button>
            </th>
            <th className="px-4 py-2 w-[10%]">
              <button 
                onClick={() => handleSort('selectedVendor')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Selected Vendor
                {renderSortIcon('selectedVendor')}
              </button>
            </th>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('contactPerson')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Contact Person
                {renderSortIcon('contactPerson')}
              </button>
            </th>
            <th className="px-4 py-2">
              <button 
                onClick={() => handleSort('slNumber')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Sales Lead Ref
                {renderSortIcon('slNumber')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('stageStatus')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Status
                {renderSortIcon('stageStatus')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('grandTotal')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Amount
                {renderSortIcon('grandTotal')}
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
              Delay Status
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm text-right w-[5%]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedRFQs.map((rfq) => (
            <tr
              key={rfq.id}
              className="hover:bg-gray-50 transition-all duration-200"
            >
              <td className="px-4 py-2 text-black text-sm">{rfq.rfqNumber}</td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(rfq.createdAt, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">{rfq.account.kristem.Name}</td>
              <td className="px-4 py-2 text-black text-sm">
                {rfq.selectedVendorId || rfq.selected_vendor_id ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 font-medium">
                        {rfq.vendor?.Name || rfq.vendor?.name || rfq.vendor?.VendorName || "Selected"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-gray-500">Pending</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {rfq.contactPerson || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {rfq.slNumber || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {renderStatusBadge(rfq.stageStatus)}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {rfq.grandTotal ? formatMoney(rfq.grandTotal) : "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(rfq.dueDate, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(rfq.doneDate, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(rfq.updatedAt, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {(() => {
                  const { status, daysLate } = util.calculateTimeliness(
                    rfq.dueDate,
                    rfq.doneDate,
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
                    onClick={() => {
                      onView(rfq);
                    }}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
                  </button>
                  <button
                    onClick={() => onEdit(rfq)}
                    className={`cursor-pointer rounded px-2 py-1 text-black  border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200 ${rfq.stageStatus === "Approved" || rfq.assignee !== currentUser.id ? "opacity-50 cursor-not-allowed hover:bg-white pointer-events-none" : ""}`}
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
