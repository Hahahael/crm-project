//src/components/WorkOrderDetails
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LuPrinter, LuArrowLeft, LuPencil, LuTrash } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import config from "../config.js";
import utils from "../helper/utils.js";

const WorkOrderDetails = ({ workOrder, currentUser, onBack, onEdit, onWorkOrderUpdated, toSalesLead }) => {
    console.log("WorkOrderDetails - workOrder:", workOrder, "currentUser:", currentUser);
    const isAssignedToMe = currentUser && workOrder.assignee === currentUser.id;
    const isCreator = currentUser && workOrder.createdBy === currentUser.id;
    const [hasSalesLead, setHasSalesLead] = useState(false);

    useEffect(() => {
        if (workOrder?.id) {
            apiBackendFetch(`/api/salesleads/exists/workorder/${workOrder.id}`)
                .then(res => res.json())
                .then(data => setHasSalesLead(data.exists))
                .catch(() => setHasSalesLead(false));
        }
    }, [workOrder?.id]);

    useEffect(() => {
        if (isAssignedToMe && !workOrder.actualDate && !workOrder.actualFromTime) {
            const now = new Date();
            const actualDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
            const actualFromTime = now.toTimeString().slice(0, 8); // HH:MM:SS

            apiBackendFetch(`/api/workorders/${workOrder.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    ...workOrder,
                    actualDate,
                    actualFromTime,
                }),
                headers: { "Content-Type": "application/json" },
            })
                .then((res) => res.json())
                .then((updatedWO) => {
                    if (onWorkOrderUpdated) onWorkOrderUpdated(updatedWO);
                });
        }
        // eslint-disable-next-line
    }, [workOrder?.id, isAssignedToMe]);

    return (
        <div className="h-full w-full p-6 overflow-y-auto">
            {/* Header with back button */}
            <div className="flex items-center mb-6">
                <button
                    onClick={onBack}
                    className="mr-4 rounded px-2 py-2 font-medium hover:bg-gray-100 transition-all duration-150 flex align-middle border border-gray-200">
                    <LuArrowLeft className="my-auto text-lg" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold">{workOrder.woNumber || ""} - Field Service Lead</h1>
                    <h2 className="text-md text-gray-500">
                        <span
                            className={`rounded-full px-2 py-1 text-xs mr-2 ${
                                config.statusBadgeClasses[workOrder.stageStatus] || "bg-yellow-100 text-yellow-700"
                            }`}>
                            {workOrder.stageStatus}
                        </span>
                        {workOrder.accountName}
                    </h2>
                </div>
                <div className={`flex flex-col gap-x-2 gap-y-2 ml-auto lg:flex-row `}>
                    {isCreator && !hasSalesLead && (
                        <button
                            onClick={() => onEdit(workOrder)}
                            className="flex border border-gray-200 bg-blue-500 hover:bg-blue-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md align-middle justify-center items-center text-sm text-white">
                            <LuPencil className="my-auto mr-2 cursor-pointer" /> Edit Workorder
                        </button>
                    )}
                    {isAssignedToMe && !hasSalesLead && (
                        <button
                            onClick={() => toSalesLead(workOrder)}
                            className="flex border border-gray-200 bg-green-500 hover:bg-green-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md align-middle justify-center items-center text-sm text-white">
                            <LuPencil className="my-auto mr-2 cursor-pointer" /> Create Sales Lead
                        </button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <div className="flex flex-col gap-y-5">
                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                WO#
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.woNumber || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Work Desc
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.workDescription || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Assignee
                            </label>
                            <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.assigneeUsername || ""}
                            </div>
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Department
                            </label>
                            <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.department || workOrder.accountDepartment || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Account
                            </label>
                            <div className="col-span-5 flex gap-6">
                                <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                    {workOrder.accountName || ""}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="newAcct"
                                        checked={workOrder.isNewAccount}
                                        disabled
                                        className="h-4 w-4 rounded border-gray-400"
                                    />
                                    <label
                                        htmlFor="newAcct"
                                        className="text-sm text-gray-600">
                                        New
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Industry
                            </label>
                            <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.industry || workOrder.accountIndustry || ""}
                            </div>
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Mode
                            </label>
                            <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.mode || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Product/Brand
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.productBrand || workOrder.accountProductBrand || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Contact Person
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.contactPerson || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Contact Number
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {workOrder.contactNumber || ""}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-y-5">
                        <div className="flex items-center justify-end gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="fsl"
                                    checked={workOrder.isFsl}
                                    disabled
                                    className="h-4 w-4 rounded border-gray-400"
                                />
                                <label
                                    htmlFor="fsl"
                                    className="text-sm text-gray-600">
                                    FSL
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="esl"
                                    checked={workOrder.isEsl}
                                    disabled
                                    className="h-4 w-4 rounded border-gray-400"
                                />
                                <label
                                    htmlFor="esl"
                                    className="text-sm text-gray-600">
                                    ESL
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                WO Date
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {utils.formatDate(workOrder.woDate, "DD/MM/YYYY") || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Due Date
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {utils.formatDate(workOrder.dueDate, "DD/MM/YYYY") || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                From Time
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {utils.formatTimeOnly(workOrder.fromTime) || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                To Time
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {utils.formatTimeOnly(workOrder.toTime) || ""}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Actual Date
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {utils.formatDate(workOrder.actualDate, "DD/MM/YYYY") || "-"}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Actual From Time
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {`${utils.formatTimeOnly(workOrder.actualFromTime)}` || "-"}
                            </div>
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label
                                htmlFor="woNumberInput"
                                className="text-sm text-right my-auto break-words hyphens-auto">
                                Actual To Time
                            </label>
                            <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                                {utils.formatTimeOnly(workOrder.actualToTime) || "-"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-6 gap-4">
                        <label
                            className="text-sm text-right my-auto break-words hyphens-auto"
                            htmlFor="objective">
                            Objective
                        </label>
                        <div
                            className="col-span-5 min-h-[100px] rounded-md border border-gray-200 bg-yellow-50 px-3 py-3 cursor-default"
                            readOnly="">
                            {workOrder.objective || "No objectives provided"}
                        </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                        <label
                            className="text-sm text-right my-auto break-words hyphens-auto"
                            htmlFor="instruction">
                            Instruction
                        </label>
                        <div
                            className="col-span-5 min-h-[100px] rounded-md border border-gray-200 bg-yellow-50 px-3 py-3 cursor-default"
                            readOnly="">
                            {workOrder.instruction || "No Instructions provided"}
                        </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                        <label
                            className="text-sm text-right my-auto break-words hyphens-auto"
                            htmlFor="targetOut">
                            Target Output
                        </label>
                        <div
                            className="col-span-5 min-h-[100px] rounded-md border border-gray-200 bg-yellow-50 px-3 py-3 cursor-default"
                            readOnly="">
                            {workOrder.targetOutput || "No Target Output provided"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkOrderDetails;
