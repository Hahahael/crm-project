//src/components/AccountsTable
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import util from "../helper/utils.js";

export default function AccountsTable({ accounts, onView, onEdit }) {
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
                  {account.source === 'mssql' && (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors bg-green-100 text-green-800 border-green-200">
                      Approved
                    </span>
                  )}
                  {account.source === 'postgresql' && (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors bg-blue-100 text-blue-800 border-blue-200">
                      Draft
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {account.industry?.Code || account.industry_code || account.industryCode}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {account.requested_by || account.requestedBy || account.prepared_by_username || account.preparedByUsername}
              </td>
              <td className="px-4 py-2 text-black text-sm">{account.stage_status}</td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(account.due_date, "MM/DD/YYYY")}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                {util.formatDate(account.done_date, "MM/DD/YYYY")}
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
