import { useState, useEffect, useRef } from "react";
import { LuArrowLeft, LuCheck, LuPlus, LuSave, LuX, LuTrash } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";

const TechnicalForm = ({ technicalReco, mode, onSave, onBack, onSubmitForApproval }) => {
    const [errors, setErrors] = useState({});
    const [itemsList, setItemsList] = useState([]);
    const [trItems, setTrItems] = useState([]);
    const nextTempIdRef = useRef(-1);
    const [formData, setFormData] = useState({
        trNumber: "",
        status: "Draft",
        priority: "Medium",
        title: "",
        accountId: "",
        contactPerson: "",
        contactEmail: "",
        contactNumber: "",
        currentSystem: "",
        currentSystemIssues: "",
        proposedSolution: "",
        technicalJustification: "",
        products: [],
        installationRequirements: "",
        trainingRequirements: "",
        maintenanceRequirements: "",
        attachments: [],
        additionalNotes: "",
        items: [],
        ...technicalReco,
    });

    // 🔹 user search state
    const [users, setUsers] = useState([]);
    const [searchQuery, _setSearchQuery] = useState("");
    const [_dropdownOpen, _setDropdownOpen] = useState(false);
    const assigneeRef = useRef(null);

    const onItemChange = (itemId, field, value) => {
        setTrItems((prevItems) => prevItems.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
        console.log(trItems);
    };

    const onRemoveItem = (itemId) => {
        setTrItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    };

    const onAddItem = () => {
        const tempId = nextTempIdRef.current--;
        const newItem = { id: tempId, item_id: null, name: "", model: "", description: "", quantity: 1, unitPrice: 0, showDropdown: false, searchQuery: "" };
        setTrItems((prevItems) => [...prevItems, newItem]);
    };

    // Clear product recommendation error as soon as there's at least one product
    useEffect(() => {
        if (trItems && trItems.length > 0 && errors?.products) {
            setErrors(prev => {
                const copy = { ...(prev || {}) };
                delete copy.products;
                return copy;
            });
        }
    }, [trItems, errors]);

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
        
        const fetchItems = async () => {
            try {
                const res = await apiBackendFetch("/api/inventory/mssql/stocks");
                const data = await res.json();
                // API may return { rows } or a bare array; handle both
                const rows = Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : []);
                const normalized = rows.map((s) => ({
                    // keep original MSSQL keys but add unified camel/id fields
                    ...s,
                    id: s.Id ?? s.id,
                    Description: s.Description ?? s.description ?? s.Code ?? s.code ?? "",
                    Code: s.Code ?? s.code ?? "",
                    LocalPrice: s.LocalPrice ?? s.localPrice ?? null,
                    name: (s.Name ?? s.name ?? s.Description ?? s.description ?? s.Code ?? s.code ?? ""),
                    description: (s.Description ?? s.description ?? s.Code ?? s.code ?? ""),
                }));
                setItemsList(normalized);
            } catch (err) {
                console.error("Failed to fetch items", err);
            }
        };

        fetchUsers();
        fetchItems();
    }, []);

    // filter users by search
    const _filteredUsers = users.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

    // close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
                _setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // load initial (editing) data
    useEffect(() => {
        if (technicalReco && Object.keys(technicalReco).length > 0) {
            setFormData((_prev) => ({ ..._prev, ...technicalReco }));
            // 🟢 If technicalReco has items, populate them into trItems
            if (technicalReco.items && Array.isArray(technicalReco.items)) {
                setTrItems(technicalReco.items.map((item) => ({
                    id: item.id ?? nextTempIdRef.current--, // fallback if no id
                    item_id: item.item_id ?? item.itemId ?? null,
                    name: item.name ?? item.Description ?? "",
                    model: item.model ?? item.Code ?? "",
                    description: item.description ?? item.Description ?? "",
                    quantity: item.quantity ?? 1,
                    unitPrice: item.unitPrice ?? item.LocalPrice ?? item.Price ?? 0,
                    showDropdown: false,
                    searchQuery: "",
                })));
            }
        } else if (technicalReco && Object.keys(technicalReco).length === 0) {
            setFormData({
                trNumber: "",
                status: "Draft",
                priority: "Medium",
                title: "",
                accountId: "",
                contactPerson: "",
                contactEmail: "",
                contactNumber: "",
                currentSystem: "",
                currentSystemIssues: "",
                proposedSolution: "",
                technicalJustification: "",
                products: [],
                installationRequirements: "",
                trainingRequirements: "",
                maintenanceRequirements: "",
                attachments: [],
                additionalNotes: "",
                items: [],
            });
        }
    }, [technicalReco]);

    const handleChange = (e) => {
        console.log("Fetched items:", itemsList);
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;

        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));

        // Clear error for this field when user edits it
        setErrors((prev) => {
            if (!prev) return {};
            const copy = { ...prev };
            if (Object.prototype.hasOwnProperty.call(copy, name)) {
                delete copy[name];
            }
            return copy;
        });
    };

    const validateForm = () => {
        const err = {};
        // required fields
        if (!formData.priority) err.priority = "Priority is required.";
        if (!formData.title || formData.title.toString().trim() === "") err.title = "Title is required.";
        if (!formData.contactPerson || formData.contactPerson.toString().trim() === "") err.contactPerson = "Contact person is required.";
        if (!formData.contactEmail || !/^\S+@\S+\.\S+$/.test(formData.contactEmail)) err.contactEmail = "A valid contact email is required.";
        if (!formData.contactNumber || formData.contactNumber.toString().trim().length < 7) err.contactNumber = "A valid contact phone is required.";
        if (!formData.currentSystem || formData.currentSystem.toString().trim() === "") err.currentSystem = "Current system is required.";
        if (!formData.currentSystemIssues || formData.currentSystemIssues.toString().trim() === "") err.currentSystemIssues = "System issues are required.";
        if (!formData.proposedSolution || formData.proposedSolution.toString().trim() === "") err.proposedSolution = "Proposed solution is required.";
        if (!formData.technicalJustification || formData.technicalJustification.toString().trim() === "") err.technicalJustification = "Technical justification is required.";
        // products: use trItems as product recommendations
        if (!trItems || !Array.isArray(trItems) || trItems.length === 0) err.products = "At least one product recommendation is required.";

        const valid = Object.keys(err).length === 0;
        return { valid, errors: err };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const { valid, errors: validationErrors } = validateForm(false);
        if (!valid) {
            setErrors(validationErrors);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        // Convert empty optional fields to null and include trItems
        const cleanedFormData = {
            ...formData,
            installationRequirements: formData.installationRequirements || null,
            trainingRequirements: formData.trainingRequirements || null,
            maintenanceRequirements: formData.maintenanceRequirements || null,
            additionalNotes: formData.additionalNotes || null,
            items: trItems
        };

        setErrors({});
        onSave(cleanedFormData, mode);
    };

    // Handler for submitting for approval
    const handleSubmitForApproval = async (e) => {
        e.preventDefault();
        const { valid, errors: validationErrors } = validateForm(true);
        if (!valid) {
            setErrors(validationErrors);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        const cleanedFormData = {
            ...formData,
            status: "Submitted",
            installationRequirements: formData.installationRequirements || null,
            trainingRequirements: formData.trainingRequirements || null,
            maintenanceRequirements: formData.maintenanceRequirements || null,
            additionalNotes: formData.additionalNotes || null,
            items: trItems
        };
        if (onSubmitForApproval) {
            onSubmitForApproval(cleanedFormData, mode);
        }
    };

    // Add a ref for dropdown
    const dropdownRefs = useRef({});

    // Close dropdown on outside click for product name dropdowns
    useEffect(() => {
        const handleClickOutside = (e) => {
            setTrItems((prevItems) => prevItems.map((item) => {
                const ref = dropdownRefs.current[item.id];
                if (item.showDropdown && ref && !ref.contains(e.target)) {
                    return { ...item, showDropdown: false };
                }
                return item;
            }));
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [trItems]);

    return (
        <form
            onSubmit={handleSubmit}
            className="h-full w-full p-6 overflow-y-auto">
            {/* Header */}
            <div className="py-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <button
                        type="button"
                        onClick={onBack}
                        className="mr-4 hover:text-gray-900 transition-all duration-150 flex align-middle text-gray-500 text-base cursor-pointer">
                        <LuArrowLeft className="my-auto text-lg" />
                        &nbsp;Back to Technical Recommendation Details
                    </button>
                    <h1 className="text-2xl font-bold">{mode === "edit" ? "Edit Technical Recommendation" : "New Technical Recommendation"}</h1>
                    <h2 className="text-lg text-gray-500">{technicalReco?.trNumber ? `${technicalReco.trNumber}` : "TR# (auto-generated)"}</h2>
                    <h2 className="text-sm text-gray-500">{mode === "edit" ? "Update the technical recommendation details below." : "Create a new Technical Recommendation"}</h2>
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
                        <LuCheck className="mr-2" /> For Approval
                    </button>
                </div>
            </div>
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
                            {formData.trNumber && (<div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="trNumber">
                                    TR#
                                </label>
                                <input
                                    className={`col-span-5 text-sm w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-1 focus:outline-gray-200 focus:border-gray-400 text-gray-600`}
                                    id="trNumber"
                                    name="trNumber"
                                    value={formData.trNumber}
                                    readOnly
                                />
                            </div>)}
                            {/* Status */}
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="status">
                                    Status
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                        ${errors?.status ? "border-red-500" : "border-gray-200"}`}
                                >
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
                                    id="priority"
                                    name="priority"
                                    value={formData.priority}
                                    className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                        ${errors?.priority ? "border-red-500" : "border-gray-200"}`}
                                    onChange={handleChange}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                                {errors?.priority && <p className="text-red-600 text-sm mt-1">{errors.priority}</p>}
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
                                    className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                        ${errors?.title ? "border-red-500" : "border-gray-200"}`}
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter a descriptive title"
                                />
                                {errors?.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                            </div>
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="salesLeadRef">
                                    Sales Lead Reference
                                </label>
                                <input
                                    className={`col-span-5 text-sm w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-1 focus:outline-gray-200 focus:border-gray-400 text-gray-600`}
                                    id="salesLeadRef"
                                    name="salesLeadRef"
                                    value={formData.slNumber}
                                    onChange={handleChange}
                                    readOnly
                                />
                            </div>
                        </div>
                        {/* Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="accountId">
                                    Customer Name
                                </label>
                                <input
                                    id="accountId"
                                    name="accountId"
                                    value={formData.accountName}
                                    readOnly
                                    className={`col-span-5 text-sm w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-1 focus:outline-gray-200 focus:border-gray-400 text-gray-600`}
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
                                    id="contactPerson"
                                    name="contactPerson"
                                    value={formData.contactPerson}
                                    className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                        ${errors?.contactPerson ? "border-red-500" : "border-gray-200"}`}
                                    onChange={handleChange}
                                />
                                {errors?.contactPerson && <p className="text-red-600 text-sm mt-1">{errors.contactPerson}</p>}
                            </div>
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="contactEmail">
                                    Contact Email
                                </label>
                                <input
                                    type="email"
                                    id="contactEmail"
                                    name="contactEmail"
                                    value={formData.contactEmail}
                                    className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                        ${errors?.contactEmail ? "border-red-500" : "border-gray-200"}`}
                                    onChange={handleChange}
                                />
                                {errors?.contactEmail && <p className="text-red-600 text-sm mt-1">{errors.contactEmail}</p>}
                            </div>
                            <div>
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="contactNumber">
                                    Contact Phone
                                </label>
                                <input
                                    id="contactNumber"
                                    name="contactNumber"
                                    value={formData.contactNumber}
                                    className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                        ${errors?.contactNumber ? "border-red-500" : "border-gray-200"}`}
                                    onChange={handleChange}
                                />
                                {errors?.contactNumber && <p className="text-red-600 text-sm mt-1">{errors.contactNumber}</p>}
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
                                id="currentSystem"
                                name="currentSystem"
                                rows={3}
                                value={formData.currentSystem}
                                onChange={handleChange}
                                className={`flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                    ${errors?.currentSystem ? "border-red-500" : "border-gray-200"}`}
                                placeholder="Describe the current system in detail"
                            />
                                {errors?.currentSystem && <p className="text-red-600 text-sm mt-1">{errors.currentSystem}</p>}
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="currentSystemIssues">
                                Current System Issues
                            </label>
                            <textarea
                                id="currentSystemIssues"
                                name="currentSystemIssues"
                                rows={3}
                                value={formData.currentSystemIssues}
                                onChange={handleChange}
                                className={`flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                    ${errors?.currentSystemIssues ? "border-red-500" : "border-gray-200"}`}
                                placeholder="Describe the issues with the current system"
                            />
                                {errors?.currentSystemIssues && <p className="text-red-600 text-sm mt-1">{errors.currentSystemIssues}</p>}
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="proposedSolution">
                                Proposed Solution
                            </label>
                            <textarea
                                id="proposedSolution"
                                name="proposedSolution"
                                rows={3}
                                value={formData.proposedSolution}
                                className={`flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                    ${errors?.proposedSolution ? "border-red-500" : "border-gray-200"}`}
                                onChange={handleChange}
                                placeholder="Describe the proposed solution in detail"
                            />
                                {errors?.proposedSolution && <p className="text-red-600 text-sm mt-1">{errors.proposedSolution}</p>}
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="technicalJustification">
                                Technical Justification
                            </label>
                            <textarea
                                id="technicalJustification"
                                name="technicalJustification"
                                rows={3}
                                value={formData.technicalJustification}
                                className={`flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                    ${errors?.technicalJustification ? "border-red-500" : "border-gray-200"}`}
                                onChange={handleChange}
                                placeholder="Provide technical justification for the proposed solution"
                            />
                                {errors?.technicalJustification && <p className="text-red-600 text-sm mt-1">{errors.technicalJustification}</p>}
                        </div>
                    </div>
                </div>

                {/* Product Recommendations */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Product Recommendations</h3>
                        <p className="text-sm text-gray-500">Specify the products recommended for this solution</p>
                        {errors?.products && <p className="text-red-600 text-sm mt-1 mb-2">{errors.products}</p>}
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                        <div className="rounded-md border border-gray-200">
                            <div className="relative w-full overflow-overlay">
                                <table className="min-w-full border-collapse text-left text-sm">
                                    <thead className="border-b border-gray-200">
                                        <tr className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Product Name</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Model</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Description</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Quantity</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Unit Price</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {trItems?.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-gray-100 transition-all duration-200">
                                                <td className="text-sm p-2 align-middle" style={{ position: 'relative', overflow: 'visible' }}>
                                                    <div className="relative" ref={el => { dropdownRefs.current[item.id] = el; }} style={{ overflow: 'visible' }}>
                                                        <input
                                                            type="text"
                                                            value={item.description || ""}
                                                            onChange={(e) => {
                                                                onItemChange(item.id, "description", e.target.value);
                                                                setTrItems((prevItems) => prevItems.map((itm) =>
                                                                    itm.id === item.id ? { ...itm, showDropdown: true, searchQuery: e.target.value } : itm
                                                                ));
                                                            }}
                                                            className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                                                            onFocus={() => setTrItems((prevItems) => prevItems.map((itm) =>
                                                                itm.id === item.id ? { ...itm, showDropdown: true } : itm
                                                            ))}
                                                            autoComplete="off"
                                                        />
                                                        {item.showDropdown && (
                                                            <div style={{ position: 'absolute', left: 0, bottom: '100%', zIndex: 20, width: 'max-content', minWidth: '100%', maxWidth: '400px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'visible' }}>
                                                                <ul className="max-h-40 overflow-y-auto" style={{ margin: 0, padding: 0 }}>
                                                                    {(itemsList || [])
                                                                        .filter(i => {
                                                                            const q = (item.searchQuery || item.description || "").toString().trim().toLowerCase();
                                                                            // if user hasn't typed anything, don't show the entire list
                                                                            if (!q) return false;
                                                                            const text = ((i.name || i.description || i.Description || i.Code || "")).toString().toLowerCase();
                                                                            const already = trItems.some(tr => tr.item_id === (i.Id || i.id));
                                                                            return text.includes(q) && !already;
                                                                        })
                                                                        .map((itm) => (
                                                                        <li
                                                                            key={itm.Id}
                                                                            onClick={() => {
                                                                                console.log("Selected item:", itm);
                                                                                setTrItems((prevItems) => prevItems.map((it) =>
                                                                                    it.id === item.id ? {
                                                                                        ...it,
                                                                                        id: itm.Id || itm.id,
                                                                                        item_id: itm.Id || itm.id,
                                                                                        model: itm.Code || itm.Code || itm.Model || itm.model || "",
                                                                                        description: itm.Description || itm.description || itm.Code || itm.code || "",
                                                                                        quantity: it.quantity || 1,
                                                                                        unitPrice: itm.Price_Detail ?? itm.LocalPrice ?? itm.LocalPrice_Details ?? itm.SourcePrice_Details ?? itm.LocalPrice ?? itm.Localprice ?? itm.localPrice ?? itm.price ?? itm.Price ?? 0,
                                                                                        showDropdown: false,
                                                                                        searchQuery: ""
                                                                                    } : it
                                                                                ));
                                                                            }}
                                                                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm" style={{ listStyle: 'none' }}>
                                                                            {itm.Description || itm.description || itm.Code || itm.code}
                                                                        </li>
                                                                    ))}
                                                                    {(itemsList || []).filter(i => (i.name || i.description || "").toLowerCase().includes((item.searchQuery || "").toLowerCase())).length === 0 && (
                                                                        <li className="px-3 py-2 text-gray-500 text-sm" style={{ listStyle: 'none' }}>No results found</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-sm p-2 align-middle">
                                                    <input
                                                        type="text"
                                                        value={item.model || ""}
                                                        readOnly
                                                        className="w-full rounded border border-gray-200 px-2 py-2 text-sm bg-gray-100"
                                                    />
                                                </td>
                                                <td className="text-sm p-2 align-middle">
                                                    <input
                                                        type="text"
                                                        value={item.description || ""}
                                                        readOnly
                                                        className="w-full rounded border border-gray-200 px-2 py-2 text-sm bg-gray-100"
                                                    />
                                                </td>
                                                <td className="text-sm p-2 align-middle">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        className="w-full rounded border border-gray-200 px-2 py-2 text-sm bg-white"
                                                        onChange={e => {
                                                            const value = Math.max(1, Number(e.target.value));
                                                            onItemChange(item.id, "quantity", value);
                                                        }}
                                                    />
                                                </td>
                                                <td className="text-sm p-2 align-middle">
                                                    <input
                                                        type="text"
                                                        value={item.unitPrice}
                                                        readOnly
                                                        className="w-full rounded border border-gray-200 px-2 py-2 text-sm bg-gray-100"
                                                    />
                                                </td>
                                                <td className="text-sm p-2 align-middle">
                                                    <button
                                                        type="button"
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                        onClick={() => onRemoveItem(item.id)}>
                                                        <LuTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <button
                                type="button"
                                className="border border-gray-200 text-gray-800 rounded-md px-4 py-2 flex items-center shadow-xs hover:bg-gray-200 transition-all duration-200 cursor-pointer text-xs"
                                onClick={onAddItem}>
                                <LuPlus className="mr-2" /> Add Item
                            </button>
                        </div>
                    </div>
                </div>

                {/* Additional Requirements */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Additional Requirements</h3>
                        <p className="text-sm text-gray-500">Provide information about installation, training, and maintenance requirements</p>
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="installationRequirements">
                                Installation Requirements
                            </label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                id="installationRequirements"
                                name="installationRequirements"
                                rows={3}
                                value={formData.installationRequirements}
                                onChange={handleChange}
                                placeholder="Describe the current system in detail"
                            />
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="trainingRequirements">
                                Training Requirements
                            </label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                id="trainingRequirements"
                                name="trainingRequirements"
                                rows={3}
                                value={formData.trainingRequirements}
                                onChange={handleChange}
                                placeholder="Describe the issues with the current system"
                            />
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="maintenanceRequirements">
                                Maintenance Requirements
                            </label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                id="maintenanceRequirements"
                                name="maintenanceRequirements"
                                rows={3}
                                value={formData.maintenanceRequirements}
                                onChange={handleChange}
                                placeholder="Describe the proposed solution in detail"
                            />
                        </div>
                    </div>
                </div>

                {/* Attachments */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Attachments</h3>
                        <p className="text-sm text-gray-500">Upload relevant documents and files</p>
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="attachmentsPlaceholder">
                                Attachments Placeholder
                            </label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                id="attachmentsPlaceholder"
                                name="attachmentsPlaceholder"
                                rows={3}
                                value={formData.attachmentsPlaceholder}
                                onChange={handleChange}
                                placeholder="Describe the current system in detail"
                                isReadOnly={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-bold leading-none tracking-tight">Notes</h3>
                        <p className="text-sm text-gray-500">Add any additional notes or comments</p>
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                        <div>
                            <label
                                className="text-sm font-medium"
                                htmlFor="additionalNotes">
                            </label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-yellow-50"
                                id="additionalNotes"
                                name="additionalNotes"
                                rows={3}
                                value={formData.additionalNotes}
                                onChange={handleChange}
                                placeholder="Describe the current system in detail"
                            />
                        </div>
                    </div>
                </div>

                {/* Product Recommendations, Additional Requirements, Attachments, Notes */}
                {/* ...repeat the same card/section pattern for each group of fields... */}
            </div>
        </form>
    );
};

export default TechnicalForm;
