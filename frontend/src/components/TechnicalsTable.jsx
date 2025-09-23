//src/components/TechnicalsTable
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import util from "../helper/utils.js"
import config from "../config.js";

export default function TechnicalsTable({ technicals, onView, onEdit }) {
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
              <td className="px-4 py-2 text-black text-sm">{tr.accountId}</td>
              <td className="px-4 py-2 text-black text-sm">{tr.title}</td>
              <td className="px-4 py-2 text-black text-sm">{tr.status}</td>
              <td className="px-4 py-2 text-black text-sm">{tr.priority}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.createdAt, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.updatedAt, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.dueDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(tr.doneDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{tr.taskStatus}</td>
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
