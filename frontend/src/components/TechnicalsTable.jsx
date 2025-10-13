//src/components/TechnicalsTable
import { LuEllipsis, LuEye, LuPencil, LuTrash, LuClock, LuCircleAlert, LuCheck } from "react-icons/lu";
import util from "../helper/utils.js"
import config from "../config.js";

export default function TechnicalsTable({ technicals, onView, onEdit }) {
  const baseBadge = "inline-flex items-center px-2.5 py-0.5 text-xs";

  const renderStatusBadge = (status) => {
    if (!status) return (
      <span className={`${baseBadge} rounded-full bg-gray-50 text-gray-600`}>-</span>
    );
    const s = String(status).toLowerCase();
    switch (s) {
      case "pending":
      case "draft":
        return <span className={`${baseBadge} rounded-full bg-yellow-100 text-yellow-800`}>{status}</span>;
      case "open":
      case "in progress":
      case "in-progress":
      case "active":
      case "started":
        return <span className={`${baseBadge} rounded-full bg-blue-50 text-blue-700`}>{status}</span>;
      case "completed":
      case "done":
      case "submitted":
        return <span className={`${baseBadge} rounded-full bg-green-50 text-green-700`}>{status}</span>;
      case "cancelled":
      case "canceled":
        return <span className={`${baseBadge} rounded-full bg-red-50 text-red-700`}>{status}</span>;
      default:
        return <span className={`${baseBadge} rounded-full bg-gray-50 text-gray-600`}>{status}</span>;
    }
  };

  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b hover:bg-gray-100 transition-all duration-200">
          <tr>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">TR#</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Account</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm ">Title</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[10%]">Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Priority</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Created Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Last Modified</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Due Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Done Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Task Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm text-right w-[5%]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {technicals.map((tr) => (
            <tr key={tr.id} className="hover:bg-gray-50 transition-all duration-200">
              <td className="px-4 py-2 text-black text-sm">{tr.trNumber}</td>
              <td className="px-4 py-2 text-black text-sm">{tr.accountName}</td>
              <td className="px-4 py-2 text-black text-sm">{tr.title}</td>
              <td className="px-4 py-2 text-black text-sm">{renderStatusBadge(tr.stageStatus)}</td>
              <td className="px-4 py-2 text-black text-sm">{tr.priority}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.createdAt, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.updatedAt, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.dueDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.doneDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">
                {(() => {
                  const { status, daysLate } = util.calculateTimeliness(tr.dueDate, tr.doneDate);
                  const base = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
                  switch (status) {
                    case "overdue":
                      return (
                        <div className={`${base} bg-red-50 text-red-700 border-red-200`}>
                          <LuClock className="mr-2 h-4 w-4 text-red-700" />
                          <span>Overdue{typeof daysLate === 'number' ? ` · ${daysLate}d` : ''}</span>
                        </div>
                      );
                    case "late":
                      return (
                        <div className={`${base} bg-yellow-50 text-yellow-800 border-yellow-200`}>
                          <LuCircleAlert className="mr-2 h-4 w-4 text-yellow-800" />
                          <span>Late{typeof daysLate === 'number' ? ` · ${daysLate}d` : ''}</span>
                        </div>
                      );
                    case "on_time":
                      return (
                        <div className={`${base} bg-green-50 text-green-700 border-green-200`}>
                          <LuCheck className="mr-2 h-4 w-4 text-green-700" />
                          <span>On time</span>
                        </div>
                      );
                    default:
                      return (
                        <div className={`${base} bg-gray-50 text-gray-600 border-gray-200`}>
                          <span>-</span>
                        </div>
                      );
                  }
                })()}
              </td>
              <td className="px-4 py-2 text-black text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => onView(tr)}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
                  </button>
                  <button
                    onClick={() => onEdit(tr)}
                    className={`rounded px-2 py-1 text-black border border-gray-200 bg-white transition-all duration-200 ${tr.stageStatus === "Approved" ? "opacity-50 cursor-not-allowed hover:bg-white pointer-events-none" : "cursor-pointer hover:bg-gray-100"}`}
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
