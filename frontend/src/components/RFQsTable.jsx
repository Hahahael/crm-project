//src/components/RFQsTable
import { LuEllipsis, LuEye, LuPencil, LuTrash } from "react-icons/lu";
import util from "../helper/utils.js"
import config from "../config.js";

export default function RFQsTable({ rfqs, onView, onEdit }) {
  console.log("RFQsTable - rfqs:", rfqs);
  return (
    <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-left text-sm min-w-4xl">
        <thead className="border-gray-200 border-b hover:bg-gray-100 transition-all duration-200">
          <tr>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">RFQ#</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm ">Account</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[10%]">Vendor</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[8%]">Contact Person</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Sales Lead Ref</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Amount</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Due Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[7%]">Done Date</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm">Delay Status</th>
            <th className="px-4 py-2 font-normal text-gray-500 text-sm text-right w-[5%]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rfqs.map((rfq) => (
            <tr key={rfq.id} className="hover:bg-gray-50 transition-all duration-200">
              <td className="px-4 py-2 text-black text-sm">{rfq.rfqNumber}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(rfq.rfqDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{rfq.accountId}</td>
              <td className="px-4 py-2 text-black text-sm">{rfq.vendor || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{rfq.contactPerson || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{rfq.slNumber || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{rfq.status || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{rfq.grandTotal}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(rfq.dueDate, "DD/MM/YYYY")}</td>
              <td className="px-4 py-2 text-black text-sm">{util.formatDate(rfq.doneDate, "DD/MM/YYYY") || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">{rfq.taskStatus || "-"}</td>
              <td className="px-4 py-2 text-black text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => {onView(rfq)}}
                    className="cursor-pointer rounded px-2 py-2 text-black border border-gray-200 bg-white hover:bg-gray-100 transition-all duration-200"
                  >
                    <LuEye className="my-auto" />
                  </button>
                  <button
                    onClick={() => onEdit(rfq)}
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
