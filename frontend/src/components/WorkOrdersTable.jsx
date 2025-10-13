//src/components/WorkOrdersTable
import { LuEllipsis, LuEye, LuPencil, LuTrash, LuCircleAlert, LuClock, LuCheck } from "react-icons/lu";
import util from "../helper/utils.js"
import config from "../config.js";

export default function WorkOrdersTable({ workOrders, onView, onEdit }) {
  const baseBadge = "inline-flex items-center px-2.5 py-0.5 text-xs";

  const renderStatusBadge = (status) => {
    console.log("Rendering status badge for status:", String(status).toLowerCase());
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

  const renderSubstatusBadge = (name) => {
    if (!name) return (
      <span className={`${baseBadge} bg-gray-50 text-gray-600`}>-</span>
    );
    const n = String(name).toLowerCase();
    if (n.includes("sales")) return <span className={`${baseBadge} rounded-sm bg-blue-50 text-blue-700`}>{name}</span>;
    if (n.includes("technical")) return <span className={`${baseBadge} rounded-sm bg-purple-50 text-purple-800`}>{name}</span>;
    if (n.includes("rfq")) return <span className={`${baseBadge} rounded-sm bg-amber-50 text-amber-800`}>{name}</span>;
    if (n.includes("naef")) return <span className={`${baseBadge} rounded-sm bg-teal-50 text-teal-800`}>{name}</span>;
    if (n.includes("quotation")) return <span className={`${baseBadge} rounded-sm bg-green-50 text-green-700`}>{name}</span>;
    return <span className={`${baseBadge} rounded-sm bg-gray-50 text-gray-600`}>{name}</span>;
  };

  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b hover:bg-gray-100 transition-all duration-200">
          <tr>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">WO#</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">WO Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm ">Work Description</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[10%]">Account</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Type</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Assignee</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Sub-status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Due Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Done Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Task Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm text-right w-[5%]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {workOrders.map((wo) => (
            <tr key={wo.id} className="hover:bg-gray-50 transition-all duration-200">
              <td className="px-4 py-2 text-black text-sm">{wo.woNumber}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(wo.woDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{wo.workDescription}</td>
              <td className="px-4 py-2 text-black text-sm">{wo.accountName}</td>
              <td className="px-4 py-2 text-black text-sm">
                <span
                  className={`rounded-full px-2 py-1 text-xs mr-2 ${
                    wo.isNewAccount ? "bg-green-100 text-green-900" : "hidden"
                  }`}
                >
                  New
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs mr-2 ${
                    wo.isFsl ? "bg-purple-100 text-purple-900" : "hidden"
                  }`}
                >
                  FSL
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs mr-2 ${
                    wo.isEsl ? "bg-indigo-100 text-indigo-900" : "hidden"
                  }`}
                >
                  ESL
                </span>
              </td>
              <td className="px-4 py-2 text-black text-sm">{wo.assigneeUsername}</td>
              <td className="px-4 py-2 text-black text-sm">{renderStatusBadge(wo.stageStatus)}</td>
              <td className="px-4 py-2 text-black text-sm">{renderSubstatusBadge(wo.stageName)}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(wo.dueDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(wo.doneDate, "DD/MM/YYYY") || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">
                {(() => {
                  const { status, daysLate } = util.calculateTimeliness(wo.dueDate, wo.doneDate);
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
                    onClick={() => onView(wo)}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
                  </button>
                  <button
                    onClick={() => onEdit(wo)}
                    className={`rounded px-2 py-1 text-black border border-gray-200 bg-white transition-all duration-200 ${wo.stageStatus === "Completed" ? "opacity-50 cursor-not-allowed hover:bg-white pointer-events-none" : "cursor-pointer hover:bg-gray-100"}`}
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
