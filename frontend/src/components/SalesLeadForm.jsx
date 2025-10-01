/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import { LuArrowLeft, LuCheck, LuSave, LuX } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js";

const SalesLeadForm = ({ salesLead, mode = "create", onSave, onBack, onSubmit }) => {
    console.log("SalesLeadForm rendered with mode:", mode, "and salesLead:", salesLead);
    const [errors, setErrors] = useState(null);
    const [formData, setFormData] = useState({
        slNumber: "",
        salesStage: "Sales Lead",
        endUser: "",
        designation: "",
        department: "",
        immediateSupport: "",
        contactNo: "",
        emailAddress: "",

        // Application Details
        category: "",
        application: "",
        machine: "",
        machineProcess: "",
        neededProduct: "",
        existingSpecifications: "",
        issuesWithExisting: "",
        consideration: "",

        // Support and Quotation
        supportNeeded: "",
        urgency: "",
        modelToQuote: "",
        quantity: 0,
        quantityAttention: "",
        qrCc: "",
        qrEmailTo: "",
        nextFollowupDate: "",
        dueDate: "",
        doneDate: "",

        // Field Sales Lead Details
        account: "",
        industry: "",
        seId: 0, // You may want to map "Michael Johnson" to a user ID in your users mock
        salesPlanRep: "",
        fslDate: "",
        fslTime: "",
        fslLocation: "",
        ww: "",

        // Customer Actual/Setup
        requirement: "",
        requirementCategory: "",
        deadline: "",
        productApplication: "",
        customerIssues: "",
        existingSetupItems: "",
        customerSuggestedSetup: "",
        remarks: "",

        actualPicture: null,
        draftDesignLayout: null,
    });

    if (mode === "create") {
        formData.woId = salesLead;
    }

    // 🔹 user search state
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const assigneeRef = useRef(null);

    // fetch users once
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await apiBackendFetch("/api/users");
                const data = await res.json();
                setUsers(data);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchUsers();
    }, []);

    // filter users by search
    const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

    // close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // load initial (editing) data
    useEffect(() => {
        if (salesLead && Object.keys(salesLead).length > 0) {
            setFormData((prev) => ({ ...prev, ...salesLead }));
        } else if (salesLead && Object.keys(salesLead).length === 0) {
            setFormData((prev) => ({
                slNumber: "",
                salesStage: "",
                endUser: "",
                designation: "",
                department: "",
                immediateSupport: "",
                contactNo: "",
                emailAddress: "",

                // Application Details
                category: "",
                application: "",
                machine: "",
                machineProcess: "",
                neededProduct: "",
                existingSpecifications: "",
                issuesWithExisting: "",
                consideration: "",

                // Support and Quotation
                supportNeeded: "",
                urgency: "",
                modelToQuote: "",
                quantity: 0,
                quantityAttention: "",
                qrCc: "",
                qrEmailTo: "",
                nextFollowupDate: "",
                dueDate: "",
                doneDate: "",

                // Field Sales Lead Details
                account: "",
                industry: "",
                seId: 0, // You may want to map "Michael Johnson" to a user ID in your users mock
                salesPlanRep: "",
                fslDate: "",
                fslTime: "",
                fslLocation: "",
                ww: "",

                // Customer Actual/Setup
                requirement: "",
                requirementCategory: "",
                deadline: "",
                productApplication: "",
                customerIssues: "",
                existingSetupItems: "",
                customerSuggestedSetup: "",
                remarks: "",

                actualPicture: null,
                draftDesignLayout: null,
            }));
        }
    }, [salesLead]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;

        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));

        setErrors((prevErrors) => {
            if (!prevErrors) return prevErrors;
            if (newValue !== "" && newValue !== null && newValue !== undefined) {
                const { [name]: removed, ...rest } = prevErrors;
                console.log(rest);
                return rest;
            }
            console.log(prevErrors);
            return prevErrors;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // ...existing code...
        // Destructure optional + WO number
        const {
            slNumber,
            immediateSupport,
            existingSpecifications,
            quantityAttention,
            qrCc,
            doneDate,
            salesPlanRep,
            ww,
            existingSetupItems,
            customerSuggested,
            remarks,
            actualPicture,
            draftDesignLayout,
            consideration,
            issuesWithExisting,
            customerIssues,
            customerSuggestedSetup,
            ...requiredFields
        } = formData;
        // Find missing required fields
        // const missing = Object.entries(requiredFields).filter(([, value]) => value === "" || value === null || value === undefined);
        // if (missing.length > 0) {
        //     // Mark missing fields as errors
        //     const newErrors = {};
        //     missing.forEach(([key]) => {
        //         newErrors[key] = true;
        //     });
        //     setErrors(newErrors);
        //     return;
        // }
        console.log("Submitting form with data:", formData);
        // ✅ Reset errors if all fields are valid
        setErrors({});
        // ✅ Convert empty optional fields to null
        const cleanedFormData = {
            ...formData,
            immediateSupport: formData.immediateSupport || null,
            existingSpecifications: formData.existingSpecifications || null,
            quantityAttention: formData.quantityAttention || null,
            qrCc: formData.qrCc || null,
            doneDate: formData.doneDate || null,
            salesPlanRep: formData.salesPlanRep || null,
            ww: formData.ww || null,
            existingSetupItems: formData.existingSetupItems || null,
            customerSuggested: formData.customerSuggested || null,
            remarks: formData.remarks || null,
        };
        onSave(cleanedFormData, mode);
    };

    // Handler for submit/approval (calls parent onSubmit)
    const handleSubmitForApproval = () => {
        // Validate and clean data as above
        const {
            slNumber,
            immediateSupport,
            existingSpecifications,
            quantityAttention,
            qrCc,
            doneDate,
            salesPlanRep,
            ww,
            existingSetupItems,
            customerSuggested,
            remarks,
            actualPicture,
            draftDesignLayout,
            consideration,
            issuesWithExisting,
            customerIssues,
            customerSuggestedSetup,
            ...requiredFields
        } = formData;
        // const missing = Object.entries(requiredFields).filter(([, value]) => value === "" || value === null || value === undefined);
        // if (missing.length > 0) {
        //     const newErrors = {};
        //     missing.forEach(([key]) => {
        //         newErrors[key] = true;
        //     });
        //     setErrors(newErrors);
        //     return;
        // }
        // setErrors({});
        const cleanedFormData = {
            ...formData,
            immediateSupport: formData.immediateSupport || null,
            existingSpecifications: formData.existingSpecifications || null,
            quantityAttention: formData.quantityAttention || null,
            qrCc: formData.qrCc || null,
            doneDate: formData.doneDate || null,
            salesPlanRep: formData.salesPlanRep || null,
            ww: formData.ww || null,
            existingSetupItems: formData.existingSetupItems || null,
            customerSuggested: formData.customerSuggested || null,
            remarks: formData.remarks || null,
        };
        onSubmit(cleanedFormData);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="h-full w-full p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                    <button
                        type="button"
                        onClick={onBack}
                        className="mr-4 hover:text-gray-900 transition-all duration-150 flex align-middle text-gray-500 text-base cursor-pointer">
                        <LuArrowLeft className="my-auto text-lg" />
                        &nbsp;Back to Sales Lead Details
                    </button>
                    <h1 className="text-2xl font-bold">{mode === "edit" ? "Edit Sales Lead" : "New Sales Lead"}</h1>
                    <h2 className="text-lg text-gray-500">{salesLead?.slNumber ? `${salesLead.slNumber}` : "FSL# (auto-generated)"}</h2>
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
                        onClick={handleSubmitForApproval}
                        className="flex border border-green-200 bg-green-500 hover:bg-green-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white">
                        <LuCheck className="mr-2" /> Submit
                    </button>
                </div>
            </div>

            {/* Form Body */}
            {/* Basic Information */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <h3 className="font-semibold text-lg">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="endUser">End User</label>
                        <input
                            id="endUser"
                            name="endUser"
                            value={formData.endUser}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="salesStage">Sales Stage</label>
                        <select
                            id="salesStage"
                            name="salesStage"
                            value={formData.salesStage}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.salesStage ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Sales Lead">Sales Lead</option>
                            <option value="Qualified Lead">Qualified Lead</option>
                            <option value="Proposal">Proposal</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Closed Won">Closed Won</option>
                            <option value="Closed Lost">Closed Lost</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="department">Department</label>
                        <select
                            id="department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.department ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Manufacturing">Manufacturing</option>
                            <option value="Sales">Sales</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Operations">Operations</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="designation">Designation</label>
                        <input
                            id="designation"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.designation ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="contactNo">Contact No.</label>
                        <input
                            id="contactNo"
                            name="contactNo"
                            value={formData.contactNo}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.contactNo ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="immediateSupport">Immediate Support</label>
                        <input
                            id="immediateSupport"
                            name="immediateSupport"
                            value={formData.immediateSupport}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="emailAddress">Email Address</label>
                        <input
                            id="emailAddress"
                            name="emailAddress"
                            type="email"
                            value={formData.emailAddress}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.emailAddress ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                </div>
            </div>

            {/* Application Details */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <h3 className="font-semibold text-lg">Application Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="category">Category</label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.category ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Direct Application">Direct Application</option>
                            <option value="Replacement">Replacement</option>
                            <option value="Upgrade">Upgrade</option>
                            <option value="New Installation">New Installation</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="application">Application</label>
                        <select
                            id="application"
                            name="application"
                            value={formData.application}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.application ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Industrial Automation">Industrial Automation</option>
                            <option value="Process Control">Process Control</option>
                            <option value="Manufacturing">Manufacturing</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="machine">Machine</label>
                        <input
                            id="machine"
                            name="machine"
                            value={formData.machine}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.machine ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="machineProcess">Machine Process</label>
                        <select
                            id="machineProcess"
                            name="machineProcess"
                            value={formData.machineProcess}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.machineProcess ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Assembly Line">Assembly Line</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Quality Control">Quality Control</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="neededProduct">Needed Product</label>
                        <input
                            id="neededProduct"
                            name="neededProduct"
                            value={formData.neededProduct}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.neededProduct ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="existingSpecifications">Existing Specifications</label>
                        <input
                            id="existingSpecifications"
                            name="existingSpecifications"
                            value={formData.existingSpecifications}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.existingSpecifications ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="issuesWithExisting">Issues with Existing</label>
                        <textarea
                            id="issuesWithExisting"
                            name="issuesWithExisting"
                            value={formData.issuesWithExisting}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                            rows={2}
                            maxLength={500}
                        />
                    </div>
                    <div>
                        <label htmlFor="consideration">Consideration</label>
                        <textarea
                            id="consideration"
                            name="consideration"
                            value={formData.consideration}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.consideration ? "border-red-500" : "border-gray-200"}`}
                            rows={2}
                            maxLength={500}
                        />
                    </div>
                </div>
            </div>

            {/* Support and Quotation */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <h3 className="font-semibold text-lg">Support and Quotation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="supportNeeded">Support Needed</label>
                        <select
                            id="supportNeeded"
                            name="supportNeeded"
                            value={formData.supportNeeded}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.supportNeeded ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Technical Consultation">Technical Consultation</option>
                            <option value="Installation Support">Installation Support</option>
                            <option value="Training">Training</option>
                            <option value="Maintenance">Maintenance</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="urgency">Urgency</label>
                        <select
                            id="urgency"
                            name="urgency"
                            value={formData.urgency}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.urgency ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High - Production Affected">High - Production Affected</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="modelToQuote">Model to Quote</label>
                        <input
                            id="modelToQuote"
                            name="modelToQuote"
                            value={formData.modelToQuote}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.modelToQuote ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="quantity">Quantity</label>
                        <input
                            id="quantity"
                            name="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.quantity ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="quantityAttention">Quantity Attention</label>
                        <input
                            id="quantityAttention"
                            name="quantityAttention"
                            value={formData.quantityAttention}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="qrCc">QR CC</label>
                        <input
                            id="qrCc"
                            name="qrCc"
                            value={formData.qrCc}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="qrEmailTo">QR Email To</label>
                        <input
                            id="qrEmailTo"
                            name="qrEmailTo"
                            value={formData.qrEmailTo}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.qrEmailTo ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="nextFollowupDate">Next Follow-up Date</label>
                        <input
                            id="nextFollowupDate"
                            name="nextFollowupDate"
                            type="date"
                            value={formData.nextFollowupDate}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.nextFollowupDate ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="dueDate">Due Date</label>
                        <input
                            id="dueDate"
                            name="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.dueDate ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="doneDate">Done Date</label>
                        <input
                            id="doneDate"
                            name="doneDate"
                            type="date"
                            value={formData.doneDate}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.doneDate ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                </div>
            </div>

            {/* Field Sales Lead Details */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <h3 className="font-semibold text-lg">Field Sales Lead Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="account">Account</label>
                        <input
                            id="account"
                            name="account"
                            value={formData.account}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.account ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="endUser">End User</label>
                        <input
                            id="endUser"
                            name="endUser"
                            value={formData.endUser}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="industry">Industry</label>
                        <select
                            id="industry"
                            name="industry"
                            value={formData.industry}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.industry ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Manufacturing">Manufacturing</option>
                            <option value="Automotive">Automotive</option>
                            <option value="Pharmaceutical">Pharmaceutical</option>
                            <option value="Food & Beverage">Food & Beverage</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="designation">Designation</label>
                        <input
                            id="designation"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.designation ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="contactNo">Contact No.</label>
                        <input
                            id="contactNo"
                            name="contactNo"
                            value={formData.contactNo}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.contactNo ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="emailAddress">Email Address</label>
                        <input
                            id="emailAddress"
                            name="emailAddress"
                            type="email"
                            value={formData.emailAddress}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.emailAddress ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="category">Category</label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.category ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Direct Application">Direct Application</option>
                            <option value="Replacement">Replacement</option>
                            <option value="Upgrade">Upgrade</option>
                            <option value="New Installation">New Installation</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="seId">SE (Sales Engineer)</label>
                        <input
                            id="seId"
                            name="seId"
                            type="number"
                            value={formData.seId}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.seId ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="salesPlanRep">Sales Plan Rep</label>
                        <input
                            id="salesPlanRep"
                            name="salesPlanRep"
                            value={formData.salesPlanRep}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="fslRef">FSL Ref</label>
                        <input
                            id="fslRef"
                            name="fslRef"
                            value={formData.fslRef}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                            readOnly={true}
                        />
                    </div>
                    <div>
                        <label htmlFor="fslDate">Date</label>
                        <input
                            id="fslDate"
                            name="fslDate"
                            type="date"
                            value={formData.fslDate}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.fslDate ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="fslTime">Time</label>
                        <input
                            id="fslTime"
                            name="fslTime"
                            type="time"
                            value={formData.fslTime}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.fslTime ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="fslLocation">Location</label>
                        <input
                            id="fslLocation"
                            name="fslLocation"
                            value={formData.fslLocation}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.fslLocation ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="ww">WW</label>
                        <input
                            id="ww"
                            name="ww"
                            value={formData.ww}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                        />
                    </div>
                </div>
            </div>

            {/* Customer Actual/Setup */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <h3 className="font-semibold text-lg">Customer Actual / Setup</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="requirement">Requirement</label>
                        <textarea
                            id="requirement"
                            name="requirement"
                            value={formData.requirement}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.requirement ? "border-red-500" : "border-gray-200"}`}
                            maxLength={1000}
                        />
                    </div>
                    <div>
                        <label htmlFor="requirementCategory">Requirement Category</label>
                        <textarea
                            id="requirementCategory"
                            name="requirementCategory"
                            value={formData.requirementCategory}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.requirementCategory ? "border-red-500" : "border-gray-200"}`}
                            maxLength={500}
                        />
                    </div>
                    <div>
                        <label htmlFor="deadline">Deadline</label>
                        <input
                            id="deadline"
                            name="deadline"
                            type="date"
                            value={formData.deadline}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.deadline ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="machine">Machine</label>
                        <input
                            id="machine"
                            name="machine"
                            value={formData.machine}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.machine ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="machineProcess">Machine Process</label>
                        <select
                            id="machineProcess"
                            name="machineProcess"
                            value={formData.machineProcess}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.machineProcess ? "border-red-500" : "border-gray-200"}`}>
                            <option value="Assembly Line">Assembly Line</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Quality Control">Quality Control</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="productApplication">Product Application</label>
                        <input
                            id="productApplication"
                            name="productApplication"
                            value={formData.productApplication}
                            onChange={handleChange}
                            className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                ${errors?.productApplication ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="customerIssues">Issues</label>
                        <textarea
                            id="customerIssues"
                            name="customerIssues"
                            value={formData.customerIssues}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                            rows={2}
                            maxLength={500}
                        />
                    </div>
                    <div>
                        <label htmlFor="existingSetupItems">Existing Setup Items</label>
                        <textarea
                            id="existingSetupItems"
                            name="existingSetupItems"
                            value={formData.existingSetupItems}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                            maxLength={1000}
                        />
                    </div>
                    <div>
                        <label htmlFor="customerSuggestedSetup">Customer Suggested Setup</label>
                        <textarea
                            id="customerSuggestedSetup"
                            name="customerSuggestedSetup"
                            value={formData.customerSuggestedSetup}
                            onChange={handleChange}
                            className="col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1 border-gray-200"
                            maxLength={1000}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="remarks">Remarks/Additional Information</label>
                    <textarea
                        id="remarks"
                        name="remarks"
                        rows={4}
                        value={formData.remarks}
                        onChange={handleChange}
                        className="w-full bg-yellow-50 border px-3 py-1 rounded"
                        maxLength={2000}
                    />
                </div>
            </div>
        </form>
    );
};

export default SalesLeadForm;
