//src/components/WorkOrdersTable
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import util from "../helper/utils.js"
import config from "../config.js";

export default function SalesLeadsTable({ salesLeads, onView, onEdit }) {
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
          {salesLeads.map((sl) => (
            <tr key={sl.id} className="hover:bg-gray-50 transition-all duration-200">
              <td className="px-4 py-2 text-black text-sm">{sl.slNumber}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.account}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.endUser}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.application}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.machine}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.contact}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.stage}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.urgency}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(sl.followUpDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(sl.dueDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(sl.doneDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{sl.taskStatus}</td>
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
