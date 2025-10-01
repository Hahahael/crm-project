import React from "react";
import { LuCheck, LuEye, LuPencil, LuX } from "react-icons/lu";
import utils from "../helper/utils.js";

export default function ApprovalsTable({ approvals, onView, onEdit, onApprove, onReject }) {
    console.log("Rendering ApprovalsTable with approvals:", approvals);
    return (
        <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full border-collapse text-left text-sm min-w-4xl">
                <thead className="border-gray-200 border-b hover:bg-gray-100 transition-all duration-200">
                    <tr>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[12%]">Transaction #</th>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[12%]">Submitted Date</th>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[11%]">Type</th>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[15%]">Customer</th>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[11%]">Title</th>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[11%]">Priority</th>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[11%]">Amount</th>
                        <th className="px-4 py-2 font-normal text-gray-500 text-sm w-[11%]">Submitted By</th>
                        <th className="px-4 py-2 text-right text-gray-500 text-sm w-[6%]">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {approvals.map((row) => (
                        <tr
                            key={row.id}
                            className="hover:bg-gray-50 transition-all duration-200">
                            <td className="px-4 py-2 text-black text-sm">
                                {row.transactionNumber}
                                {row.isNew && (
                                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold ml-2 bg-red-100 text-red-800 text-xs">
                                        NEW
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-2 text-black text-sm">{utils.formatDate(row.submittedDate, "DD/MM/YYYY")}</td>
                            <td className="px-4 py-2 text-black text-sm">
                                <span
                                    className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow ${row.typeColor}`}>
                                    {row.stageName}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-black text-sm">{row.customer}</td>
                            <td className="p-2 align-middle max-w-[200px] truncate">{row.title}</td>
                            <td className="px-4 py-2 text-black text-sm">
                                <span
                                    className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow ${row.priorityColor}`}>
                                    {row.priority}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-black text-sm">{row.amount}</td>
                            <td className="px-4 py-2 text-black text-sm">{row.submittedBy}</td>
                            <td className="p-2 align-middle text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs hover:bg-gray-100"
                                        onClick={() => onView(row)}
                                        title="View">
                                            <LuEye className="h-4 w-4" />
                                    </button>
                                    <button
                                        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs hover:bg-gray-100"
                                        onClick={() => onEdit(row)}
                                        title="Edit">
                                            <LuPencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => onApprove(row)}
                                        title="Approve">
                                            <LuCheck className="h-4 w-4" />
                                    </button>
                                    <button
                                        className="inline-flex items-center justify-center h-8 rounded-md px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => onReject(row)}
                                        title="Reject">
                                            <LuX className="h-4 w-4" />
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
