//src/components/WorkOrdersTable
import {
  LuEllipsis,
  LuEye,
  LuPencil,
  LuTrash,
  LuClock,
  LuCircleAlert,
  LuCheck,
} from "react-icons/lu";
import util from "../helper/utils.js";
import { useUser } from "../contexts/UserContext.jsx";
import config from "../config.js";

export default function SalesLeadsTable({ salesLeads, onView, onEdit }) {
  const { currentUser } = useUser();
  console.log("Current User in SalesLeadsTable:", currentUser);
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
        return (
          <span className={`${baseBadge} rounded-full bg-red-50 text-red-700`}>
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
        <thead className="border-gray-200 border-b hover:bg-gray-100 transition-all duration-200">
          <tr>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">
              SL#
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">
              Account
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm ">
              End User
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[10%]">
              Application
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">
              Machine
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">
              Contact
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">
              Stage
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">
              Urgency
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">
              Follow-up Date
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">
              Due Date
            </th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">
              Done Date
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
          {salesLeads.map((sl) => (
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
                {renderStatusBadge(sl.stageStatus)}
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
