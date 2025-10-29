//src/components/AccountsTable
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import util from "../helper/utils.js";

export default function AccountsTable({ accounts, onView, onEdit }) {
  const baseBadge = "inline-flex items-center px-2.5 py-0.5 text-xs";

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
        <thead className="border-gray-200 border-b hover:bg-gray-100 transition-all duration-200">
          <tr>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">
              Ref #
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">
              Date
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm ">
              Account
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[10%]">
              Industry
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">
              Requestor
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">
              Status
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">
              Due Date
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">
              Done Date
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
          {accounts.map((account) => (
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
                {account.delayStatus}
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
                    className="cursor-pointer rounded px-2 py-1 text-black  border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
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
