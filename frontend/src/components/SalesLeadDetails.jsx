import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { useEffect, useRef } from "react";
import { apiBackendFetch } from "../services/api";
import config from "../config.js";
import { formatDate } from "../helper/utils.js";

const SalesLeadDetails = ({ salesLead, currentUser, onBack, onEdit, onSalesLeadUpdated, onSubmit }) => {
    console.log("Rendering SalesLeadDetails for salesLead:", salesLead);
    const isAssignedToMe = currentUser && salesLead.assignee === currentUser.id;
    const isCreator = currentUser && salesLead.createdBy === currentUser.id;

    function Detail({ label, value }) {
        return (
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="whitespace-pre-wrap">{value || "-"}</p>
            </div>
        );
    }

    // Guard to ensure we only auto-mark a given sales lead once per id.
    const autoMarkedRef = useRef(null);

    useEffect(() => {
        if (!salesLead) return;
        const id = salesLead.id;
        if (isAssignedToMe && !salesLead.actualDate && !salesLead.actualFromTime && autoMarkedRef.current !== id) {
            autoMarkedRef.current = id; // mark this id as processed
            const now = new Date();
            const actualDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
            const actualFromTime = now.toTimeString().slice(0, 8); // HH:MM:SS

            apiBackendFetch(`/api/salesleads/${id}`, {
                method: "PUT",
                body: JSON.stringify({
                    ...salesLead,
                    actualDate,
                    actualFromTime,
                }),
                headers: { "Content-Type": "application/json" },
            })
                .then(async (res) => {
                    if (!res.ok) {
                        console.error("Failed to auto-update sales lead actuals", res.status);
                        return null;
                    }
                    return res.json();
                })
                .catch((err) => console.error("Error auto-updating sales lead actuals", err));
        }
        // eslint-disable-next-line
    }, [salesLead?.id, isAssignedToMe]);

    return (
        <div className="container mx-auto p-6 overflow-auto">
            {/* Header */}
            <div className="py-4 flex items-center justify-between">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center text-muted-foreground mb-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                        <LuArrowLeft className="h-4 w-4 mr-1" />
                        Back to Sales Leads
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{salesLead.slNumber}</h1>
                        <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                            {salesLead.stageStatus}
                        </div>
                        <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                            {salesLead.urgency}
                        </div>
                    </div>
                    <p className="text-gray-500">{salesLead.account}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-green-500 hover:bg-green-600 text-white ${salesLead.stageStatus === "Approved" ? "hidden pointer-events-none" : "inline-flex"}`}
                        onClick={() => onSubmit(salesLead)}>
                        Submit for Approval
                    </button>
                    {/* <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white"
                        onClick={() => onSubmit(salesLead, "technicals")}> 
                        Move to Technical
                    </button>
                    <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => onSubmit(salesLead, "rfqs")}> 
                        Move to RFQ
                    </button> */}
                    <button
                        onClick={() => onEdit(salesLead)}
                        className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white ${salesLead.stageStatus === "Approved" ? "hidden pointer-events-none" : "inline-flex"}`}>
                        <LuPencil className="h-4 w-4 mr-2" />
                        Edit Sales Lead
                    </button>
                </div>
            </div>

            <div className="space-y-6 pb-6">
                {/* Basic Information */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Basic Information</h3>
                        <p className="text-sm text-gray-500">Basic details about this sales lead</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Detail
                                label="SL Number"
                                value={salesLead.slNumber}
                            />
                            <Detail
                                label="Sales Stage"
                                value={salesLead.salesStage}
                            />
                            <Detail
                                label="End User"
                                value={salesLead.accountName}
                            />
                            <Detail
                                label="Designation"
                                value={salesLead.designation}
                            />
                            <Detail
                                label="Department"
                                value={salesLead.accountDepartmentName}
                            />
                            <Detail
                                label="Immediate Support"
                                value={salesLead.immediateSupport}
                            />
                            <Detail
                                label="Contact Number"
                                value={salesLead.contactNumber}
                            />
                            <Detail
                                label="Email Address"
                                value={salesLead.emailAddress}
                            />
                        </div>
                    </div>
                </div>

                {/* Application Details */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Application Details</h3>
                        <p className="text-sm text-gray-500">Information about the application and requirements</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Detail
                                label="Category"
                                value={salesLead.category}
                            />
                            <Detail
                                label="Application"
                                value={salesLead.application}
                            />
                            <Detail
                                label="Machine"
                                value={salesLead.machine}
                            />
                            <Detail
                                label="Machine Process"
                                value={salesLead.machineProcess}
                            />
                            <Detail
                                label="Needed Product"
                                value={salesLead.neededProduct}
                            />
                            <Detail
                                label="Existing Specifications"
                                value={salesLead.existingSpecifications}
                            />
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Detail
                                label="Issues with Existing"
                                value={salesLead.issuesWithExisting}
                            />
                            <Detail
                                label="Consideration"
                                value={salesLead.consideration}
                            />
                        </div>
                    </div>
                </div>

                {/* Support and Quotation */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Support and Quotation</h3>
                        <p className="text-sm text-gray-500">Details about support needs and quotation information</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Detail
                                label="Support Needed"
                                value={salesLead.supportNeeded}
                            />
                            <Detail
                                label="Urgency"
                                value={salesLead.urgency}
                            />
                            <Detail
                                label="Model to Quote"
                                value={salesLead.modelToQuote}
                            />
                            <Detail
                                label="Quantity"
                                value={salesLead.quantity}
                            />
                            <Detail
                                label="Quantity Attention"
                                value={salesLead.quantityAttention}
                            />
                            <Detail
                                label="QR CC"
                                value={salesLead.qrCc}
                            />
                            <Detail
                                label="QR Email To"
                                value={salesLead.qrEmailTo}
                            />
                            <Detail
                                label="Next Follow-up Date"
                                value={formatDate(salesLead.nextFollowupDate, "DD/MM/YYYY")}
                            />
                        </div>
                    </div>
                </div>

                {/* Customer Details */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Customer Details</h3>
                        <p className="text-sm text-gray-500">Information about customer requirements</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Detail
                                label="Account"
                                value={salesLead.accountName}
                            />
                            {/* <Detail
                                label="Sales Engineer"
                                value={salesLead.seUsername || salesLead.seId}
                            /> */}
                            <Detail
                                label="Date"
                                value={formatDate(salesLead.fslDate, "DD/MM/YYYY")}
                            />
                            <Detail
                                label="Time"
                                value={salesLead.fslTime}
                            />
                            <Detail
                                label="Location"
                                value={salesLead.fslLocation}
                            />
                            {/* <Detail
                                label="PO Ref"
                                value={salesLead.slNumber}
                            /> */}
                            <Detail
                                label="Concept"
                                value={salesLead.requirement}
                            />
                            <Detail
                                label="Objective"
                                value={salesLead.requirementCategory}
                            />
                            <Detail
                                label="Deadline"
                                value={formatDate(salesLead.deadline, "DD/MM/YYYY")}
                            />
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Detail
                                label="Existing Setup and Items"
                                value={salesLead.existingSetupItems}
                            />
                            <Detail
                                label="Recommended Model/Composition"
                                value={salesLead.customerSuggestedSetup}
                            />
                        </div>
                        <div className="mt-4">
                            <Detail
                                label="Remarks/Additional Information"
                                value={salesLead.remarks}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for label/value pairs
function Detail({ label, value }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="whitespace-pre-wrap">{value || "-"}</p>
        </div>
    );
}

export default SalesLeadDetails;
