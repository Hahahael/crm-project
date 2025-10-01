import { useState, useEffect } from "react";
import { LuArrowLeft, LuChartBar, LuCheck, LuSave, LuX, LuFile, LuUsers } from "react-icons/lu";
import RFQDetailsForm from "./RFQDetailsForm.jsx";
import RFQVendorsForm from "./RFQVendorsForm.jsx";
import RFQCanvassSheet from "./RFQCanvassSheet.jsx";
import { apiBackendFetch } from "../services/api.js";

const TABS = [
    { key: "details", label: "RFQ Details", icon: <LuFile className="mr-2" /> },
    { key: "vendors", label: "Vendors", icon: <LuUsers className="mr-2" /> },
    { key: "canvass", label: "Canvass Sheet", icon: <LuChartBar className="mr-2" /> },
];

export default function RFQFormWrapper({ rfq, tab, mode = "create", onBack, onSave }) {
    console.log("RFQFormWrapper render", { rfq, tab, mode });
    const [activeTab, setActiveTab] = useState(tab);
    const [vendors, setVendors] = useState([]);
    const [errors, setErrors] = useState([]);
    const [rfqItems, setRfqItems] = useState([]);
    // LIFTED details form state
    const [formData, setFormData] = useState({
        rfqNumber: "",
        rfqDate: "",
        dueDate: "",
        description: "",
        salesLeadRef: "",
        accountName: "",
        terms: "",
        notes: "",
        subTotal: 0,
        vat: 0,
        grandTotal: 0,
        additionalNotes: ""
    });

    // Sync formData with rfq prop
    useEffect(() => {
        if (rfq && Object.keys(rfq).length > 0) {
            setFormData((prev) => ({ ...prev, ...rfq }));
        } else if (rfq && Object.keys(rfq).length === 0) {
            setFormData({
                rfqNumber: "",
                rfqDate: "",
                dueDate: "",
                description: "",
                salesLeadRef: "",
                accountName: "",
                terms: "",
                notes: "",
                subTotal: 0,
                vat: 0,
                grandTotal: 0,
                additionalNotes: ""
            });
        }
    }, [rfq]);

    // Always fetch vendors when rfq.id changes, and also when switching to vendors tab
    useEffect(() => {
        async function fetchVendors() {
            if (!rfq?.id) return;
            try {
                const rfqVendorsRes = await apiBackendFetch(`/api/rfqs/${rfq.id}/vendors`);
                if (!rfqVendorsRes.ok) throw new Error("Failed to fetch RFQ Vendors");
                const data = await rfqVendorsRes.json();
                setVendors(data);
            } catch (err) {
                console.error("Failed to fetch vendors", err);
            }
        }
        fetchVendors();
    }, [rfq?.id]);

    useEffect(() => {
        if (activeTab === 'vendors' && rfq?.id) {
            async function fetchVendors() {
                try {
                    const rfqVendorsRes = await apiBackendFetch(`/api/rfqs/${rfq.id}/vendors`);
                    if (!rfqVendorsRes.ok) throw new Error("Failed to fetch RFQ Vendors");
                    const data = await rfqVendorsRes.json();
                    setVendors(data);
                } catch (err) {
                    console.error("Failed to fetch vendors", err);
                }
            }
            fetchVendors();
        }
    }, [activeTab, rfq?.id]);

    useEffect(() => {
        async function fetchItems() {
            if (!rfq?.id) return;
            try {
                const rfqItemsRes = await apiBackendFetch(`/api/rfqs/${rfq.id}/items`);
                if (!rfqItemsRes.ok) throw new Error("Failed to fetch RFQ Items");
                const data = await rfqItemsRes.json();
                setRfqItems(data);
            } catch (err) {
                console.error("Failed to fetch items", err);
            }
        }
        fetchItems();
    }, [rfq?.id]);

    // Aggregated validation before save
    const validateAll = () => {
        const aggErrors = [];
        // Details validation
        if (!formData?.rfqDate) aggErrors.push("RFQ Date is required.");
        if (!formData?.dueDate) aggErrors.push("Due Date is required.");
        if (!formData?.description) aggErrors.push("Description is required.");
        // // Items validation
        // if (!rfqItems || rfqItems.length === 0) aggErrors.push("At least one RFQ item is required.");
        // // Vendors validation
        // if (!vendors || vendors.length === 0) aggErrors.push("At least one vendor is required.");
        setErrors(aggErrors);
        return aggErrors.length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateAll()) return;
        // Aggregate all form data and pass to parent for saving
        if (onSave) {
            onSave({
                rfq: formData,
                rfqItems,
                vendors,
                allQuotes: rfqItems?.flatMap(item => item.vendorQuotes || [])
            }, mode);
        }
    };

    return (
        <div className="w-full h-full p-6 space-y-6 overflow-y-auto">
            {errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                    <ul className="list-disc pl-5">
                        {errors.map((msg, idx) => (
                            <li key={idx}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}
            <form
                onSubmit={handleSubmit}
                className="h-full w-full p-6 overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                        <button
                            type="button"
                            onClick={onBack}
                            className="mr-4 hover:text-gray-900 transition-all duration-150 flex align-middle text-gray-500 text-base cursor-pointer mb-4">
                            <LuArrowLeft className="my-auto text-lg" />
                            &nbsp;Back to RFQ Details
                        </button>
                        <h1 className="text-2xl font-bold">{mode === "edit" ? "Edit Multi-Vendor RFQ" : "New Multi-Vendor RFQ"}</h1>
                        <h2 className="text-lg text-gray-500">
                            {rfq?.trNumber ? `${rfq.rfqNumber}` : "RFQ# (auto-generated)"} - {rfq?.description || ""}
                        </h2>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex border border-red-200 bg-red-400 hover:bg-red-500 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white">
                            <LuX className="mr-2" /> Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex border border-blue-200 bg-blue-500 hover:bg-blue-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white">
                            <LuSave className="mr-2" /> Save
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex border border-green-200 bg-green-500 hover:bg-green-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white">
                            <LuCheck className="mr-2" /> For Approval
                        </button>
                    </div>
                </div>
                <div
                    role="tablist"
                    className="tab-header p-1 space-x-1 bg-gray-100 rounded-sm flex justify-center w-full h-12 mb-6">
                    {TABS.map((tab) => (
                        <button
                            type="button"
                            key={tab.key}
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`w-full h-full rounded transition-all duration-200 flex items-center justify-center
                        ${activeTab === tab.key ? "active bg-white" : "hover:bg-gray-200 cursor-pointer"}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
                <div className="tab-content">
                    {activeTab === "details" && (
                        <RFQDetailsForm
                            rfq={formData}
                            setFormData={setFormData}
                            items={rfqItems}
                            mode={mode}
                        />
                    )}
                    {activeTab === "vendors" && (
                        <RFQVendorsForm
                            rfq={rfq}
                            items={rfqItems}
                            rfqVendors={vendors}
                            mode={mode}
                            onVendorAction={(vendorId, action, vendorObj) => {
                                if (action === "delete") {
                                    setVendors((vendors) => vendors.filter((v) => v.id !== vendorId));
                                } else if (action === "add" && vendorObj) {
                                    setVendors((vendors) => {
                                        if (vendors.some((v) => v.id === vendorObj.id)) return vendors;
                                        return [...vendors, vendorObj];
                                    });
                                }
                            }}
                        />
                    )}
                    {activeTab === "canvass" && (
                        <RFQCanvassSheet
                            rfq={rfq}
                            items={rfqItems}
                            selectedVendors={vendors}
                            mode={mode}
                        />
                    )}
                </div>
            </form>
        </div>
    );
}
