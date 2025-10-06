//src/components/QuotationsTable
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import util from "../helper/utils.js"
import config from "../config.js";

export default function QuotationsTable({ quotations, onView, onEdit }) {
  console.log("QuotationsTable - quotations:", quotations);
  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b hover:bg-gray-100 transition-all duration-200">
          <tr>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Quotation #</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Type</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm ">Title</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[10%]">Customer</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Amount</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Submitted Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Due Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Done Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Task Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Assigned To</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm text-right w-[5%]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {quotations.map((quotation) => (
            <tr key={quotation.id} className="hover:bg-gray-50 transition-all duration-200">
              <td className="px-4 py-2 text-black text-sm">{quotation.refNumber}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(quotation.accountName, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{quotation.title}</td>
              <td className="px-4 py-2 text-black text-sm">{quotation.status || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{quotation.priority || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{quotation.createdAt || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{quotation.updatedAt || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{quotation.dueDate}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(quotation.doneDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{quotation.taskStatus || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => {onView(quotation)}}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
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
