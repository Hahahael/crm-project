//src/components/AccountsTable
import { LuEllipsis, LuEye, LuPencil, LuTrash, LuClock, LuCheck, LuCircleAlert, LuArrowUp, LuArrowDown, LuArrowUpDown } from "react-icons/lu";
import { useState } from "react";
import util from "../helper/utils.js";

export default function AccountsTable({ accounts, onView, onEdit }) {
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

  // Sort the accounts
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (!sortField) return 0;

    let aVal, bVal;

    switch (sortField) {
      case 'refNumber':
        aVal = a.kristem?.Code || a.naef_number || a.naefNumber || a.id || '';
        bVal = b.kristem?.Code || b.naef_number || b.naefNumber || b.id || '';
        break;
      case 'createdAt':
        aVal = new Date(a.created_at || a.date_created || a.dateCreated || 0);
        bVal = new Date(b.created_at || b.date_created || b.dateCreated || 0);
        break;
      case 'account':
        aVal = (a.kristem?.Name || a.account_name || a.accountName || '').toLowerCase();
        bVal = (b.kristem?.Name || b.account_name || b.accountName || '').toLowerCase();
        break;
      case 'industry':
        aVal = (a.industry?.Code || a.industry_code || a.industryCode || '').toLowerCase();
        bVal = (b.industry?.Code || b.industry_code || b.industryCode || '').toLowerCase();
        break;
      case 'requestor':
        aVal = (a.requested_by || a.requestedBy || a.prepared_by_username || a.preparedByUsername || '').toLowerCase();
        bVal = (b.requested_by || b.requestedBy || b.prepared_by_username || b.preparedByUsername || '').toLowerCase();
        break;
      case 'stageStatus':
        aVal = (a.stageStatus || '').toLowerCase();
        bVal = (b.stageStatus || '').toLowerCase();
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
        aVal = new Date(a.updatedAt || a.updated_at || 0);
        bVal = new Date(b.updatedAt || b.updated_at || 0);
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

  console.log("Accounts in Table:", accounts);
  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b">
          <tr>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('refNumber')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Ref #
                {renderSortIcon('refNumber')}
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
                onClick={() => handleSort('industry')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Industry
                {renderSortIcon('industry')}
              </button>
            </th>
            <th className="px-4 py-2 w-[8%]">
              <button 
                onClick={() => handleSort('requestor')}
                className="flex items-center gap-1 font-normal text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Requestor
                {renderSortIcon('requestor')}
              </button>
            </th>
            <th className="px-4 py-2">
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
          {sortedAccounts.map((account) => (
            <tr
              key={account.id}
              className="hover:bg-gray-50 transition-all duration-200"
            >
              <td className="px-4 py-2 text-black text-sm">
                {account.kristem?.Code || account.naef_number || account.naefNumber || account.id}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(account.created_at || account.date_created || account.dateCreated, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                <div className="flex items-center gap-2">
                  <span>{account.kristem?.Name || account.account_name || account.accountName}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {account.industry?.Code || account.industry_code || account.industryCode}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {account.requested_by || account.requestedBy || account.prepared_by_username || account.preparedByUsername}
              </td>
              <td className="px-4 py-2 text-black text-sm">{renderStatusBadge(account.stageStatus)}</td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(account.dueDate, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(account.doneDate, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(account.updatedAt || account.updated_at, "MM/DD/YYYY") || "-"}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {(() => {
                  const { status, daysLate } = util.calculateTimeliness(
                    account.dueDate,
                    account.doneDate,
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
                    onClick={() => onView(account)}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
                  </button>
                  <button
                    onClick={() => onEdit(account)}
                    className={`cursor-pointer rounded px-2 py-1 text-black  border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200 ${account.stageStatus === 'Submitted' || account.stageStatus === 'Approved' ? "opacity-50 cursor-not-allowed hover:bg-white pointer-events-none" : "cursor-pointer hover:bg-gray-100"}`}
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
