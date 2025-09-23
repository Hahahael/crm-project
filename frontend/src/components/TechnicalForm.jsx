import React, { useState } from "react";

const TechnicalForm = ({ technicalReco, mode = "create", onSave, onBack }) => {
    const [formData, setFormData] = useState({
        trNumber: "",
        status: "Draft",
        priority: "Medium",
        title: "",
        salesLeadRef: "",
        customerName: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        currentSystem: "",
        currentSystemIssues: "",
        proposedSolution: "",
        technicalJustification: "",
        products: [],
        installationRequirements: "",
        trainingRequirements: "",
        maintenanceRequirements: "",
        attachments: [],
        notes: "",
        ...technicalReco,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave && onSave(formData);
    };

    return (
        <div className="container mx-auto p-6 overflow-auto">
            {/* Header */}
            <div className="py-4 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center text-muted-foreground mb-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                    {/* Add your back icon here */}
                    Back to Recommendation Details
                </button>
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                        onClick={onBack}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                        onClick={handleSubmit}>
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">Edit Technical Recommendation</h1>
                <p className="text-muted-foreground">Update the technical recommendation details below.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <h3 className="font-bold leading-none tracking-tight">Basic Information</h3>
                            <p className="text-sm text-gray-500">Enter the basic details for this technical recommendation</p>
                        </div>
                        <div className="p-6 pt-0 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* TR Number (readonly) */}
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="trNumber">
                                        TR#
                                    </label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm bg-yellow-50"
                                        id="trNumber"
                                        name="trNumber"
                                        value={formData.trNumber}
                                        readOnly
                                    />
                                </div>
                                {/* Status */}
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="status">
                                        Status
                                    </label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}>
                                        <option value="Draft">Draft</option>
                                        <option value="Submitted">Submitted</option>
                                        <option value="Approved">Approved</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                                {/* Priority */}
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="priority">
                                        Priority
                                    </label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                        id="priority"
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            {/* Title and Sales Lead Ref */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="title">
                                        Title
                                    </label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm bg-yellow-50"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Enter a descriptive title"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="salesLeadRef">
                                        Sales Lead Reference
                                    </label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm bg-yellow-50"
                                        id="salesLeadRef"
                                        name="salesLeadRef"
                                        value={formData.salesLeadRef}
                                        onChange={handleChange}
                                        placeholder="e.g., FSL-2023-1001"
                                    />
                                </div>
                            </div>
                            {/* Customer Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="customerName">
                                        Customer Name
                                    </label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm bg-yellow-50"
                                        id="customerName"
                                        name="customerName"
                                        value={formData.customerName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="contactPerson">
                                        Contact Person
                                    </label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm bg-yellow-50"
                                        id="contactPerson"
                                        name="contactPerson"
                                        value={formData.contactPerson}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="contactEmail">
                                        Contact Email
                                    </label>
                                    <input
                                        type="email"
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm bg-yellow-50"
                                        id="contactEmail"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="contactPhone">
                                        Contact Phone
                                    </label>
                                    <input
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm bg-yellow-50"
                                        id="contactPhone"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Details */}
                    <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <h3 className="font-bold leading-none tracking-tight">Technical Details</h3>
                            <p className="text-sm text-gray-500">Provide information about the current system and proposed solution</p>
                        </div>
                        <div className="p-6 pt-0 space-y-4">
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="currentSystem">
                                    Current System
                                </label>
                                <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                    id="currentSystem"
                                    name="currentSystem"
                                    rows={3}
                                    value={formData.currentSystem}
                                    onChange={handleChange}
                                    placeholder="Describe the current system in detail"
                                />
                            </div>
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="currentSystemIssues">
                                    Current System Issues
                                </label>
                                <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                    id="currentSystemIssues"
                                    name="currentSystemIssues"
                                    rows={3}
                                    value={formData.currentSystemIssues}
                                    onChange={handleChange}
                                    placeholder="Describe the issues with the current system"
                                />
                            </div>
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="proposedSolution">
                                    Proposed Solution
                                </label>
                                <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                    id="proposedSolution"
                                    name="proposedSolution"
                                    rows={3}
                                    value={formData.proposedSolution}
                                    onChange={handleChange}
                                    placeholder="Describe the proposed solution in detail"
                                />
                            </div>
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="technicalJustification">
                                    Technical Justification
                                </label>
                                <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                    id="technicalJustification"
                                    name="technicalJustification"
                                    rows={3}
                                    value={formData.technicalJustification}
                                    onChange={handleChange}
                                    placeholder="Provide technical justification for the proposed solution"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Recommendations, Additional Requirements, Attachments, Notes */}
                    {/* ...repeat the same card/section pattern for each group of fields... */}
                </div>
            </form>
        </div>
    );
};

export default TechnicalForm;
