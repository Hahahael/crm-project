//src/components/QuotationsTable
import {
  LuEllipsis,
  LuEye,
  LuPencil,
  LuTrash,
  LuSend,
  LuCheck,
  LuClock,
  LuCircleAlert,
  LuArrowUp,
  LuArrowDown,
  LuArrowUpDown,
} from "react-icons/lu";
import { useState } from "react";
import util from "../helper/utils.js";
import { useUser } from "../contexts/UserContext.jsx";

export default function QuotationsTable({ quotations, onView, onSend }) {
  const { currentUser } = useUser();
  
  // Sorting state
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  const getQuotationType = (quotation) => {
    if (quotation.rfq) return "RFQ";
    if (quotation.tr) return "Technical Recommendation";
    return "-";
  };

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

  // Sort the quotations
  const sortedQuotations = [...quotations].sort((a, b) => {
    if (!sortField) return 0;

    let aVal, bVal;

    switch (sortField) {
      case 'quotationNumber':
        aVal = a.quotationNumber || '';
        bVal = b.quotationNumber || '';
        break;
      case 'type':
        aVal = getQuotationType(a).toLowerCase();
        bVal = getQuotationType(b).toLowerCase();
        break;
      case 'title':
        aVal = (a.tr?.title || a.rfq?.description || '').toLowerCase();
        bVal = (b.tr?.title || b.rfq?.description || '').toLowerCase();
        break;
      case 'customer':
        aVal = (a.account?.kristem?.Name || '').toLowerCase();
        bVal = (b.account?.kristem?.Name || '').toLowerCase();
        break;
      case 'stageStatus':
        aVal = (a.stageStatus || '').toLowerCase();
        bVal = (b.stageStatus || '').toLowerCase();
        break;
      case 'amount':
        aVal = Number(a.rfq?.grandTotal || 0);
        bVal = Number(b.rfq?.grandTotal || 0);
        break;
      case 'submittedDate':
        aVal = new Date(a.submittedDate || 0);
        bVal = new Date(b.submittedDate || 0);
        break;
      case 'dueDate':
        aVal = new Date(a.dueDate || 0);
        bVal = new Date(b.dueDate || 0);
        break;
      case 'doneDate':
        aVal = new Date(a.doneDate || 0);
        bVal = new Date(b.doneDate || 0);
        break;
      case 'assignee':
        aVal = (a.assigneeUsername || '').toLowerCase();
        bVal = (b.assigneeUsername || '').toLowerCase();
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt || 0);
        bVal = new Date(b.createdAt || 0);
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

  const baseBadge = "inline-flex items-center px-2.5 py-0.5 text-xs font-bold";

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
        <span
          className={`${baseBadge} rounded-sm bg-orange-100 text-orange-800`}
        >
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
      case "ongoing":
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
  
  // console.log("QuotationsTable - quotations:", quotations);
  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b">
          <tr>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('quotationNumber')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Quotation #
                {renderSortIcon('quotationNumber')}
              </button>
            </th>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('type')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Type
                {renderSortIcon('type')}
              </button>
            </th>
            <th className="px-4 py-2">
              <button 
                onClick={() => handleSort('title')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Title
                {renderSortIcon('title')}
              </button>
            </th>
            <th className="px-4 py-2 w-[10%]">
              <button 
                onClick={() => handleSort('customer')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Customer
                {renderSortIcon('customer')}
              </button>
            </th>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('stageStatus')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Status
                {renderSortIcon('stageStatus')}
              </button>
            </th>
            <th className="px-4 py-2">
              <button 
                onClick={() => handleSort('amount')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Amount
                {renderSortIcon('amount')}
              </button>
            </th>
            <th className="px-4 py-2 w-[7%]">
              <button 
                onClick={() => handleSort('submittedDate')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Submitted Date
                {renderSortIcon('submittedDate')}
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
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">
              Task Status
            </th>
            <th className="px-4 py-2">
              <button 
                onClick={() => handleSort('assignee')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Assigned To
                {renderSortIcon('assignee')}
              </button>
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm text-right w-[5%]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedQuotations.map((quotation) => (
            <tr
              key={quotation.id}
              className="hover:bg-gray-50 transition-all duration-200"
            >
              <td className="px-4 py-2 text-black text-sm">
                {quotation.quotationNumber}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {renderSubstatusBadge(getQuotationType(quotation))}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {quotation.tr?.title || quotation.rfq?.description || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {quotation.account?.kristem?.Name || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {renderStatusBadge(quotation.stageStatus) || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatCurrency(quotation.rfq?.grandTotal) || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(quotation.submittedDate, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(quotation.dueDate, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(quotation.doneDate, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {(() => {
                  const { status, daysLate } = util.calculateTimeliness(
                    quotation.dueDate,
                    quotation.doneDate,
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
                {quotation.assigneeUsername || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onView(quotation);
                    }}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
                  </button>
                  <button
                    onClick={() => onSend && onSend(quotation)}
                    className={`cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200 ${quotation.stageStatus === "Submitted" || quotation.assignee !== currentUser.id ? "opacity-50 cursor-not-allowed hover:bg-white pointer-events-none" : ""}`}
                    title="Send to MSSQL"
                  >
                    <LuSend className="my-auto" />
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
