import { LuArrowLeft, LuFileCheck, LuPencil, LuPrinter } from "react-icons/lu";
import { useEffect } from "react";
import { apiBackendFetch } from "../services/api.js";
import utils from "../helper/utils";

const TechnicalDetails = ({ technicalReco, currentUser, onBack, onEdit, onSave, onPrint, onSubmit }) => {
    const isAssignedToMe = currentUser && technicalReco.assignee === currentUser.id;
    const isCreator = currentUser && technicalReco.createdBy === currentUser.id;

    console.log("Technical Recommendation Details:", technicalReco);
    function Detail({ label, value }) {
        return (
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="whitespace-pre-wrap">{value || "-"}</p>
            </div>
        );
    }

    useEffect(() => {
        if (isAssignedToMe && !technicalReco.actualDate && !technicalReco.actualFromTime) {
            const now = new Date();
            const actualDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
            const actualFromTime = now.toTimeString().slice(0, 8); // HH:MM:SS

            apiBackendFetch(`/api/technicals/${technicalReco.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    ...technicalReco,
                    actualDate,
                    actualFromTime,
                }),
                headers: { "Content-Type": "application/json" },
            })
                .then((res) => res.json())
                .then((updatedTechnicalReco) => {
                    if (onSave) onSave(updatedTechnicalReco);
                });
        }
        // eslint-disable-next-line
    }, [technicalReco?.id, isAssignedToMe]);

    return (
        <div className="container mx-auto p-6 overflow-auto">
            {/* Header */}
            <div className="py-4 flex items-center justify-between">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center mb-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                        <LuArrowLeft className="h-4 w-4 mr-1" />
                        Back to Technical Recommendations
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">{technicalReco.trNumber}</h1>
                        <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                            {technicalReco.status}
                        </div>
                        <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800">
                            {technicalReco.priority}
                        </div>
                    </div>
                    <p className="text-gray-500">{technicalReco.title}</p>
                </div>
                <div className="flex gap-2">
                    {/* <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white"
                        // onClick={} // Add handler for move to RFQ
                    >
                        Move to RFQ
                    </button>
                    <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                        // onClick={} // Add handler for move to Quotation
                    >
                        Move to Quotation
                    </button> */}
                    <button
                        onClick={onPrint}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white">
                        <LuPrinter className="h-4 w-4 mr-2" />
                        Print
                    </button>
                    <button
                        onClick={() => onEdit(technicalReco)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white">
                        <LuPencil className="h-4 w-4 mr-2" />
                        Edit
                    </button>
                    <button
                        onClick={() => onSubmit(technicalReco)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-green-500 hover:bg-green-600 text-white">
                        <LuFileCheck className="h-4 w-4 mr-2" />
                        Submit for Approval
                    </button>
                </div>
            </div>

            <div className="space-y-6 pb-6">
                {/* Basic Info */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Technical Recommendation</h3>
                        <p className="text-sm text-gray-500">{technicalReco.title}</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Detail
                                label="TR Number"
                                value={technicalReco.trNumber}
                            />
                            <Detail
                                label="Sales Lead Reference"
                                value={technicalReco.slNumber}
                            />
                            <Detail
                                label="Created Date"
                                value={utils.formatDate(technicalReco.createdAt, "DD/MM/YYYY")}
                            />
                        </div>
                    </div>
                </div>

                {/* Customer Information */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Customer Information</h3>
                        <p className="text-sm text-gray-500">Customer details for this recommendation</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Detail
                                label="Customer Name"
                                value={technicalReco.accountId}
                            />
                            <Detail
                                label="Contact Person"
                                value={technicalReco.contactPerson}
                            />
                            <Detail
                                label="Contact Email"
                                value={technicalReco.contactEmail}
                            />
                            <Detail
                                label="Contact Phone"
                                value={technicalReco.contactNumber}
                            />
                        </div>
                    </div>
                </div>

                {/* Technical Details */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Technical Details</h3>
                        <p className="text-sm text-gray-500">System and solution details</p>
                    </div>
                    <div className="p-6 pt-0 space-y-6">
                        <Detail
                            label="Current System"
                            value={technicalReco.currentSystem}
                        />
                        <Detail
                            label="Current System Issues"
                            value={technicalReco.currentSystemIssues}
                        />
                        <Detail
                            label="Proposed Solution"
                            value={technicalReco.proposedSolution}
                        />
                        <Detail
                            label="Technical Justification"
                            value={technicalReco.technicalJustification}
                        />
                    </div>
                </div>

                {/* Product Recommendations */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Product Recommendations</h3>
                        <p className="text-sm text-gray-500">Recommended products and pricing</p>
                    </div>
                    <div className="p-6 pt-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="text-left font-medium text-gray-500">Product Name</th>
                                    <th className="text-left font-medium text-gray-500">Model</th>
                                    <th className="text-left font-medium text-gray-500">Description</th>
                                    <th className="text-right font-medium text-gray-500">Quantity</th>
                                    <th className="text-right font-medium text-gray-500">Unit Price</th>
                                    <th className="text-right font-medium text-gray-500">Total Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {technicalReco.items.map((prod, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2">{prod.name}</td>
                                        <td className="p-2">{prod.model}</td>
                                        <td className="p-2">{prod.description}</td>
                                        <td className="p-2 text-right">{prod.quantity}</td>
                                        <td className="p-2 text-right">Php {prod.price}</td>
                                        <td className="p-2 text-right">Php {prod.quantity * prod.price}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-2 text-right font-bold">
                                        Total
                                    </td>
                                    <td className="p-2 text-right font-bold">Php {(technicalReco.items || []).reduce((sum, i) => sum + (i.quantity * i.price), 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Additional Requirements */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Additional Requirements</h3>
                        <p className="text-sm text-gray-500">Installation, training, and maintenance</p>
                    </div>
                    <div className="p-6 pt-0 space-y-6">
                        <Detail
                            label="Installation Requirements"
                            value={technicalReco.installationRequirements}
                        />
                        <Detail
                            label="Training Requirements"
                            value={technicalReco.trainingRequirements}
                        />
                        <Detail
                            label="Maintenance Requirements"
                            value={technicalReco.maintenanceRequirements}
                        />
                    </div>
                </div>

                {/* Attachments */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Attachments</h3>
                        <p className="text-sm text-gray-500">Related files and documents</p>
                    </div>
                    <div className="p-6 pt-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="text-left font-medium text-gray-500">File Name</th>
                                    <th className="text-left font-medium text-gray-500">Type</th>
                                    <th className="text-left font-medium text-gray-500">Size</th>
                                    <th className="text-left font-medium text-gray-500">Uploaded By</th>
                                    <th className="text-left font-medium text-gray-500">Upload Date</th>
                                    <th className="text-right font-medium text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {utils.toArray(technicalReco.attachments).map((file, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2">{file.name}</td>
                                        <td className="p-2">{file.type}</td>
                                        <td className="p-2">{file.size}</td>
                                        <td className="p-2">{file.uploadedBy}</td>
                                        <td className="p-2">{file.uploadDate}</td>
                                        <td className="p-2 text-right">
                                            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 w-9">
                                                {/* Download icon here */}
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Notes */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Notes</h3>
                    </div>
                    <div className="p-6 pt-0">
                        <Detail
                            label="Notes"
                            value={technicalReco.notes}
                        />
                    </div>
                </div>

                {/* Approval Information */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Approval Information</h3>
                    </div>
                    <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Detail
                            label="Approved By"
                            value={technicalReco.approvedBy}
                        />
                        <Detail
                            label="Approved Date"
                            value={technicalReco.approvedDate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechnicalDetails;
