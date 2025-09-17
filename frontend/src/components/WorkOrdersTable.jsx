//src/components/WorkOrdersTable
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import util from "../helper/utils.js"
import config from "../config.js";

export default function WorkOrdersTable({ workOrders, onView, onEdit }) {
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
              <td className="px-4 py-2 text-black text-sm">{wo.status}</td>
              <td className="px-4 py-2 text-black text-sm">{wo.status}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(wo.dueDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(wo.doneDate, "DD/MM/YYYY") || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">-</td>
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
