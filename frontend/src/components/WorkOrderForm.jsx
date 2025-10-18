/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { LuArrowLeft, LuCheck, LuX } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js";

const WorkOrderForm = ({ workOrder, mode = "create", onSave, onBack }) => {
    const [errors, setErrors] = useState(null);
    const [formData, setFormData] = useState({
        woNumber: "",
        workDescription: "",
        assignee: "",
        assigneeUsername: "", // 🔹 added for display
        departmentId: "",
        accountId: "", // <-- use accountId instead of accountName
        isNewAccount: false,
        industryId: "",
        mode: "",
        productBrandId: "",
        contactPerson: "",
        contactNumber: "",
        isFsl: false,
        isEsl: false,
        woDate: dayjs().format("YYYY-MM-DD"),
        dueDate: "",
        fromTime: "",
        toTime: "",
        actualDate: "",
        actualFromTime: "",
        actualToTime: "",
        objective: "",
        instruction: "",
        targetOutput: "",
    });

    // 🔹 user search state
    const [users, setUsers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [industries, setIndustries] = useState([]); // [{id, industryName}]
    const [productBrands, setProductBrands] = useState([]); // [{id, productBrandName}]
    const [departments, setDepartments] = useState([]); // [{id, departmentName}]
    const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
    const departmentRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [assigneeQuery, setAssigneeQuery] = useState("");
    const [accountQuery, setAccountQuery] = useState("");
    const [productBrandQuery, setProductBrandQuery] = useState("");
    const [departmentQuery, setDepartmentQuery] = useState("");
    const [industryQuery, setIndustryQuery] = useState("");
    // Distinct dropdown states
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
    const [productBrandDropdownOpen, setProductBrandDropdownOpen] = useState(false);
    const assigneeRef = useRef(null);
    const accountRef = useRef(null);
    const industryRef = useRef(null);
    const productBrandRef = useRef(null);

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

        const fetchAccounts = async () => {
            try {
                const res = await apiBackendFetch("/api/accounts/all");
                const data = await res.json();
                console.log("Fetched accounts:", data);
                setAccounts(data);
            } catch (err) {
                console.error("Failed to fetch accounts", err);
            }
        };

        const fetchAccountIndustries = async () => {
            try {
                const res = await apiBackendFetch("/api/accounts/industries");
                const data = await res.json();
                setIndustries(data);
            } catch (err) {
                console.error("Failed to fetch account industries", err);
            }
        };

        const fetchAccountProductBrands = async () => {
            try {
                const res = await apiBackendFetch("/api/accounts/product-brands");
                const data = await res.json();
                setProductBrands(data);
            } catch (err) {
                console.error("Failed to fetch account product brands", err);
            }
        };

        const fetchDepartments = async () => {
            try {
                const res = await apiBackendFetch("/api/accounts/departments");
                const data = await res.json();
                setDepartments(data);
            } catch (err) {
                console.error("Failed to fetch account departments", err);
            }
        };

        fetchUsers();
        fetchAccounts();
        fetchAccountIndustries();
        fetchAccountProductBrands();
        fetchDepartments();
    }, []);

    // Hydrate display-only fields when editing and option lists/users are loaded
    useEffect(() => {
        // Populate assigneeUsername from assignee id if missing
        if (formData.assignee && !formData.assigneeUsername && users.length > 0) {
            const u = users.find((x) => x.id == formData.assignee);
            if (u) {
                setFormData((prev) => ({ ...prev, assigneeUsername: u.username }));
            }
        }
        // Populate account-related display fields when accountId exists (edit mode)
        if (!formData.isNewAccount && formData.accountId && (accounts.length > 0 || industries.length > 0 || productBrands.length > 0 || departments.length > 0)) {
            setFormData((prev) => {
                // If already hydrated, skip
                const acc = accounts.find((a) => a.id == prev.accountId);
                if (!acc) return prev;
                const depName = departments.find((d) => d.id == acc.departmentId)?.departmentName || prev.department || "";
                const indName = industries.find((i) => i.id == acc.industryId)?.industryName || prev.industry || "";
                const prodName = productBrands.find((p) => p.id == acc.productId)?.productBrandName || prev.productBrand || "";
                return {
                    ...prev,
                    department: depName,
                    departmentId: acc.departmentId || prev.departmentId,
                    industry: indName,
                    industryId: acc.industryId || prev.industryId,
                    productBrand: prodName,
                    productBrandId: acc.productId || prev.productBrandId,
                };
            });
        }
    }, [users, accounts, industries, productBrands, departments, formData.assignee, formData.assigneeUsername, formData.accountId, formData.isNewAccount]);

    // filter users by search
    const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(assigneeQuery.toLowerCase()));
    const filteredAccounts = accounts.filter((a) => a.accountName.toLowerCase().includes(accountQuery.toLowerCase()));
    const filteredProductBrands = productBrands.filter((p) => p.productBrandName.toLowerCase().includes(productBrandQuery.toLowerCase()));
    const filteredDepartments = departments.filter((d) => d.departmentName.toLowerCase().includes(departmentQuery.toLowerCase()));
    const filteredIndustries = industries.filter((i) => i.industryName.toLowerCase().includes(industryQuery.toLowerCase()));

    // close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (assigneeDropdownOpen && assigneeRef.current && !assigneeRef.current.contains(e.target)) {
                setAssigneeDropdownOpen(false);
            }
            if (accountDropdownOpen && accountRef.current && !accountRef.current.contains(e.target)) {
                setAccountDropdownOpen(false);
            }
            if (industryDropdownOpen && industryRef.current && !industryRef.current.contains(e.target)) {
                setIndustryDropdownOpen(false);
            }
            if (productBrandDropdownOpen && productBrandRef.current && !productBrandRef.current.contains(e.target)) {
                setProductBrandDropdownOpen(false);
            }
            if (departmentDropdownOpen && departmentRef.current && !departmentRef.current.contains(e.target)) {
                setDepartmentDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [assigneeDropdownOpen, accountDropdownOpen, industryDropdownOpen, productBrandDropdownOpen, departmentDropdownOpen]);

    // load initial (editing) data
    useEffect(() => {
        if (workOrder && Object.keys(workOrder).length > 0) {
            setFormData((prev) => ({ ...prev, ...workOrder, woDate: workOrder.woDate || prev.woDate }));
        } else if (workOrder && Object.keys(workOrder).length === 0) {
            setFormData((prev) => ({
                ...prev,
                woNumber: "",
                workDescription: "",
                assignee: "",
                assigneeUsername: "",
                departmentId: "",
                accountId: "",
                isNewAccount: false,
                industryId: "",
                mode: "",
                productBrandId: "",
                contactPerson: "",
                contactNumber: "",
                isFsl: false,
                isEsl: false,
                woDate: prev.woDate || dayjs().format("YYYY-MM-DD"),
                dueDate: "",
                fromTime: "",
                toTime: "",
                actualDate: "",
                actualFromTime: "",
                actualToTime: "",
                objective: "",
                instruction: "",
                targetOutput: "",
            }));
        }
    }, [workOrder]);

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
                return rest;
            }
            return prevErrors;
        });
    };

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validate form
        const { valid, errors: validationErrors } = validateForm(formData);
        if (!valid) {
            setErrors(validationErrors);
            console.log(validationErrors);
            // focus first invalid field
            const first = Object.keys(validationErrors)[0];
            try {
                const el = document.querySelector(`[name="${first}"]`);
                if (el && typeof el.focus === "function") el.focus();
            } catch (err) {
                // ignore
            }
            return;
        }

        setErrors({});
        // Clean optional fields to null
        const cleanedFormData = {
            ...formData,
            actualDate: formData.actualDate || null,
            actualFromTime: formData.actualFromTime || null,
            actualToTime: formData.actualToTime || null,
            fromTime: formData.fromTime || null,
            toTime: formData.toTime || null,
        };
        if (!formData.isNewAccount) delete cleanedFormData.accountName;
        // prevent double submit from rapid clicks or re-renders
        if (submitting) return;
        try {
            setSubmitting(true);
            // await parent's save (parent returns a promise because it's async)
            await onSave(cleanedFormData, mode);
        } finally {
            // only clear submitting if component still mounted (best-effort)
            setSubmitting(false);
        }
    };

    // ---------- Validation helpers ----------
    const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;
    const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

    function isValidDate(val) {
        if (!val) return false;
        return dayjs(val).isValid();
    }

    function isValidTime(val) {
        if (!val) return false;
        return TIME_RE.test(val);
    }

    function validateForm(data) {
        const errors = {};
        // workDescription
        if (!data.workDescription || String(data.workDescription).trim().length < 3) {
            errors.workDescription = "Work description is required (min 3 chars).";
        }
        // assignee
        if (!data.assignee) errors.assignee = "Assignee is required.";

        // account/new-account rules
        if (data.isNewAccount) {
            if (!data.accountName || String(data.accountName).trim() === "") errors.accountName = "Account name is required for new accounts.";
            if (!data.departmentId) errors.department = "Department is required.";
            if (!data.industryId) errors.industry = "Industry is required.";
            if (!data.productBrandId) errors.productBrand = "Product/Brand is required.";
        } else {
            if (!data.accountId) errors.accountId = "Account is required.";
        }

        // mode
        if (!data.mode || String(data.mode).trim().length === 0) {
            errors.mode = "Mode is required.";
        }

        // FSL/ESL: exactly one must be selected
        if (!!data.isFsl === !!data.isEsl) {
            // both true or both false
            errors.fslEsl = "Please select exactly one of FSL or ESL.";
        }

        // dates
        if (!isValidDate(data.woDate)) errors.woDate = "WO Date is required and must be valid.";
        if (!isValidDate(data.dueDate)) {
            errors.dueDate = "Due Date is required and must be valid.";
        } else {
            // dueDate must be strictly after today
            const today = dayjs().startOf("day");
            const due = dayjs(data.dueDate).startOf("day");
            if (!due.isAfter(today)) {
                errors.dueDate = "Due Date must be later than today.";
            }
        }
        if (isValidDate(data.woDate) && isValidDate(data.dueDate)) {
            if (dayjs(data.dueDate).isBefore(dayjs(data.woDate), "day")) errors.dueDate = "Due Date cannot be before WO Date.";
            // if dueDate equals woDate, it's also invalid per rule (due must be after today and woDate is today)
        }

        // times
        if (data.fromTime && !isValidTime(data.fromTime)) errors.fromTime = "Invalid time (HH:mm).";
        if (data.toTime && !isValidTime(data.toTime)) errors.toTime = "Invalid time (HH:mm).";
        if (data.fromTime && data.toTime && isValidTime(data.fromTime) && isValidTime(data.toTime)) {
            const from = dayjs(data.fromTime, "HH:mm");
            const to = dayjs(data.toTime, "HH:mm");
            if (to.isBefore(from)) errors.toTime = "End time must be same or after start time.";
        }

        // contact
        if (!data.contactPerson || String(data.contactPerson).trim().length === 0) {
            errors.contactPerson = "Contact person is required.";
        }
        if (!data.contactNumber || String(data.contactNumber).trim().length === 0) {
            errors.contactNumber = "Contact number is required.";
        } else if (!PHONE_RE.test(String(data.contactNumber))) {
            errors.contactNumber = "Invalid phone number.";
        }

        return { valid: Object.keys(errors).length === 0, errors };
    }

    // Helper: get selected account object (use loose equality to avoid number/string mismatches)
    const selectedAccountObj = accounts.find((a) => a.id == formData.accountId);

    return (
        <form
            onSubmit={handleSubmit}
            className="h-full w-full p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button
                    type="button"
                    onClick={onBack}
                    className="mr-4 rounded px-2 py-2 font-medium hover:bg-gray-100 transition-all duration-150 flex align-middle border border-gray-200">
                    <LuArrowLeft className="my-auto text-lg" />
                </button>
                <h1 className="text-2xl font-bold">{mode === "edit" ? "Edit Work Order" : "New Work Order"}</h1>
                <div className="ml-auto flex gap-2">
                    <button
                            type="submit"
                            disabled={submitting}
                            onClick={(e) => { if (submitting) { e.preventDefault(); e.stopPropagation(); } }}
                            className={`flex border border-gray-200 px-4 py-2 rounded-md items-center text-sm text-white ${submitting ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}>
                            <LuCheck className="mr-2" /> {submitting ? 'Saving...' : 'Save'}
                        </button>
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex border border-gray-200 bg-gray-400 hover:bg-gray-500 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white">
                        <LuX className="mr-2" /> Cancel
                    </button>
                </div>
            </div>

            {/* Form Body */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-5">
                    {/* Both Columns */}
                    <div className="flex flex-col xl:col-span-2 gap-y-5 gap-x-4">
                        <div className="grid grid-cols-12 gap-y-5 gap-x-4">
                            {/* WO# */}
                            <div className={`grid-cols-12 gap-x-4 col-span-12 ${mode === "create" ? "hidden" : "grid"}`}>
                                <label className="text-sm text-right my-auto">WO#</label>
                                <input
                                    type="text"
                                    name="woNumber"
                                    value={formData.woNumber}
                                    className="col-span-11 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-400 focus:outline-none focus:ring-0 cursor-not-allowed"
                                    placeholder="WO-2025-0001"
                                    readOnly
                                />
                            </div>
                            {/* Work Description */}
                            <div className={`grid-cols-10 gap-x-4 col-span-10 grid`}>
                                <label className="text-sm text-right my-auto break-words hyphens-auto col-span-2 xl:col-span-1">Work Description</label>
                                <input
                                    type="text"
                                    name="workDescription"
                                    value={formData.workDescription}
                                    onChange={handleChange}
                                    className={`col-span-8 xl:col-span-9 w-full h-10 my-auto rounded-md border px-3 py-2 focus:outline-1
                                        ${errors?.workDescription ? "border-red-500" : "border-gray-200"}`}
                                />
                                {errors?.workDescription && <p className="text-xs text-red-600 mt-1 col-span-10 col-start-2">{errors.workDescription}</p>}
                            </div>
                            <div className={`grid-cols-2 col-span-2 my-auto`}>
                                {/* FSL / ESL checkboxes */}
                                <div className="flex items-center justify-end gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="isFsl"
                                            checked={formData.isFsl}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                // compute new state and update errors accordingly
                                                setFormData(prev => {
                                                    const ns = { ...prev, isFsl: checked, isEsl: checked ? false : prev.isEsl };
                                                    setErrors(prevErr => {
                                                        if (!prevErr) return prevErr;
                                                        // if exactly one selected now, remove the fslEsl error
                                                        if ((ns.isFsl && !ns.isEsl) || (!ns.isFsl && ns.isEsl)) {
                                                            const { fslEsl, ...rest } = prevErr;
                                                            return rest;
                                                        }
                                                        return prevErr;
                                                    });
                                                    return ns;
                                                });
                                            }}
                                            className="h-4 w-4 border border-gray-400 rounded"
                                        />
                                        <span className="text-sm">FSL</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name="isEsl"
                                            checked={formData.isEsl}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setFormData(prev => {
                                                    const ns = { ...prev, isEsl: checked, isFsl: checked ? false : prev.isFsl };
                                                    setErrors(prevErr => {
                                                        if (!prevErr) return prevErr;
                                                        if ((ns.isFsl && !ns.isEsl) || (!ns.isFsl && ns.isEsl)) {
                                                            const { fslEsl, ...rest } = prevErr;
                                                            return rest;
                                                        }
                                                        return prevErr;
                                                    });
                                                    return ns;
                                                });
                                            }}
                                            className="h-4 w-4 border border-gray-400 rounded"
                                        />
                                        <span className="text-sm">ESL</span>
                                    </label>
                                </div>
                                {errors?.fslEsl && <p className="text-xs text-red-600 mt-1 break-words hyphens-auto">{errors.fslEsl}</p>}
                            </div>
                        </div>
                    </div>
                    {/* Left column */}
                    <div className="flex flex-col gap-y-5">
                        {/* Assignee + Dept */}
                        <div className="grid grid-cols-6 gap-x-4 relative">
                            <label className="text-sm text-right my-auto">Assignee</label>
                            <div className="col-span-5 relative" ref={assigneeRef}>
                                <input
                                    type="text"
                                    autoComplete="off"
                                    value={formData.assigneeUsername || ""}
                                    onChange={(e) => {
                                        const q = e.target.value;
                                        setFormData((prev) => ({
                                            ...prev,
                                            assigneeUsername: q,
                                        }));
                                        setAssigneeQuery(q);
                                        setAssigneeDropdownOpen(true);
                                    }}
                                    onFocus={() => setAssigneeDropdownOpen(true)}
                                    placeholder="Search user..."
                                    className="w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                                />
                                {assigneeDropdownOpen && (
                                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map((user) => (
                                                <li
                                                    key={user.id}
                                                    onClick={() => {
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            assignee: user.id, // store FK
                                                            assigneeUsername: user.username, // display username
                                                        }));
                                                        setAssigneeDropdownOpen(false);
                                                        setAssigneeQuery("");
                                                    }}
                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm">
                                                    {user.username}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-3 py-2 text-gray-500 text-sm">No results found</li>
                                        )}
                                    </ul>
                                )}
                                {errors?.assignee && <p className="text-xs text-red-600 mt-1">{errors.assignee}</p>}
                            </div>
                        </div>

                        {/* Account + New Flag */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Account</label>
                            <div className="col-span-4">
                                {formData.isNewAccount ? (
                                    <input
                                        type="text"
                                        name="accountName"
                                        autoComplete="off"
                                        value={formData.accountName || ""}
                                        onChange={handleChange}
                                        className="w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                                        placeholder="Enter new account name"
                                    />
                                ) : (
                                    <div className="relative" ref={accountRef}>
                                        <input
                                            type="text"
                                            name="accountSearch"
                                            autoComplete="off"
                                            value={selectedAccountObj?.accountName || accountQuery}
                                            onChange={(e) => {
                                                setAccountQuery(e.target.value);
                                                setAccountDropdownOpen(true);
                                            }}
                                            onFocus={() => setAccountDropdownOpen(true)}
                                            placeholder="Search account..."
                                            className="w-full rounded-md border border-gray-200 px-3 py-2"
                                        />
                                        {accountDropdownOpen && (
                                            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                {filteredAccounts.length > 0 ? (
                                                    filteredAccounts.map((account) => (
                                                        <li
                                                            key={account.id}
                                                            onClick={() => {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    accountId: account.id,
                                                                    department: departments.find(d => d.id === account.departmentId)?.departmentName || "",
                                                                    departmentId: account.departmentId || "",
                                                                    industry: industries.find(i => i.id === account.industryId)?.industryName || "",
                                                                    industryId: account.industryId || "",
                                                                    productBrand: productBrands.find(p => p.id === account.productId)?.productBrandName || "",
                                                                    productBrandId: account.productId || "",
                                                                }));
                                                                setAccountDropdownOpen(false);
                                                                setAccountQuery("");
                                                            }}
                                                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm">
                                                            {account.accountName}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="px-3 py-2 text-gray-500 text-sm">No results found</li>
                                                )}
                                            </ul>
                                        )}
                                        {(!formData.isNewAccount && errors?.accountId) && <p className="text-xs text-red-600 mt-1">{errors.accountId}</p>}
                                    </div>
                                )}
                                {errors?.accountName && <p className="text-xs text-red-600 mt-1">{errors.accountName}</p>}
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <input
                                    type="checkbox"
                                    name="isNewAccount"
                                    checked={!!formData.isNewAccount}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setFormData(prev => ({
                                            ...prev,
                                            isNewAccount: checked,
                                            department: "",
                                            departmentId: "",
                                            industry: "",
                                            industryId: "",
                                            productBrand: "",
                                            productBrandId: "",
                                            accountId: "",
                                            accountName: "",
                                        }));
                                    }}
                                    className="h-4 w-4 border border-gray-400"
                                />
                                <label className="text-sm text-gray-600">New</label>
                            </div>
                        </div>

                        {/* Product/Brand */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto break-words hyphens-auto">Product/Brand</label>
                            <div className="col-span-5 relative" ref={productBrandRef}>
                                {formData.isNewAccount ? (
                                    <input
                                        type="text"
                                        name="productBrand"
                                        autoComplete="off"
                                        value={productBrandQuery || formData.productBrand}
                                        onChange={(e) => {
                                            const q = e.target.value;
                                            setFormData((prev) => ({ ...prev, productBrand: q }));
                                            setProductBrandQuery(q);
                                            setProductBrandDropdownOpen(true);
                                        }}
                                        onFocus={() => setProductBrandDropdownOpen(true)}
                                        placeholder="Search product/brand..."
                                        className={`w-full h-10 rounded-md border px-3 py-2 ${errors?.productBrand ? "border-red-500" : "border-gray-200"}`}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        name="productBrand"
                                        autoComplete="off"
                                        value={formData.productBrand}
                                        className="w-full h-10 rounded-md border border-gray-200 bg-gray-100 px-3 py-2"
                                        readOnly
                                    />
                                )}
                                {formData.isNewAccount && productBrandDropdownOpen && (
                                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                        {filteredProductBrands.length > 0 ? (
                                            filteredProductBrands.map((prod) => (
                                                <li
                                                    key={prod.id}
                                                    onClick={() => {
                                                        setFormData((prev) => ({ ...prev, productBrand: prod.productBrandName, productBrandId: prod.id }));
                                                        setProductBrandDropdownOpen(false);
                                                        setProductBrandQuery("");
                                                    }}
                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm">
                                                    {prod.productBrandName}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-3 py-2 text-gray-500 text-sm">No results found</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            {errors?.productBrand && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.productBrand}</p>}
                        </div>

                        {/* Department */}
                        <div className="grid grid-cols-6 gap-x-4" ref={departmentRef}>
                            <label className="text-sm text-right my-auto break-words hyphens-auto">Department</label>
                            <div className="col-span-5 relative" ref={departmentRef}>
                                {formData.isNewAccount ? (
                                    <input
                                        type="text"
                                        name="department"
                                        autoComplete="off"
                                        value={departmentQuery || formData.department}
                                        onChange={(e) => {
                                            const q = e.target.value;
                                            setFormData((prev) => ({ ...prev, department: q }));
                                            setDepartmentQuery(q);
                                            setDepartmentDropdownOpen(true);
                                        }}
                                        onFocus={() => setDepartmentDropdownOpen(true)}
                                        placeholder="Search department..."
                                        className={`w-full h-10 rounded-md border px-3 py-2 ${errors?.department ? "border-red-500" : "border-gray-200"}`}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        name="department"
                                        autoComplete="off"
                                        value={formData.department}
                                        className="w-full h-10 rounded-md border border-gray-200 bg-gray-100 px-3 py-2"
                                        readOnly
                                    />
                                )}
                                {formData.isNewAccount && departmentDropdownOpen && (
                                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                        {filteredDepartments.length > 0 ? (
                                            filteredDepartments.map((dept) => (
                                                <li
                                                    key={dept.id}
                                                    onClick={() => {
                                                        setFormData((prev) => ({ ...prev, department: dept.departmentName, departmentId: dept.id }));
                                                        setDepartmentDropdownOpen(false);
                                                        setDepartmentQuery("");
                                                    }}
                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm">
                                                    {dept.departmentName}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-3 py-2 text-gray-500 text-sm">No results found</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            {errors?.department && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.department}</p>}
                        </div>

                        {/* Industry + Mode */}
                        <div className="grid grid-cols-6 gap-x-4" ref={industryRef}>
                            <label className="text-sm text-right my-auto break-words hyphens-auto">Industry</label>
                            <div className="col-span-5 relative" ref={industryRef}>
                                {formData.isNewAccount ? (
                                    <input
                                        type="text"
                                        name="industry"
                                        autoComplete="off"
                                        value={industryQuery || formData.industry}
                                        onChange={(e) => {
                                            const q = e.target.value;
                                            setFormData((prev) => ({ ...prev, industry: q }));
                                            setIndustryQuery(q);
                                            setIndustryDropdownOpen(true);
                                        }}
                                        onFocus={() => setIndustryDropdownOpen(true)}
                                        placeholder="Search industry..."
                                        className={`w-full h-10 rounded-md border px-3 py-2 ${errors?.industry ? "border-red-500" : "border-gray-200"}`}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        name="industry"
                                        autoComplete="off"
                                        value={formData.industry}
                                        className="w-full h-10 rounded-md border border-gray-200 bg-gray-100 px-3 py-2"
                                        readOnly
                                    />
                                )}
                                {formData.isNewAccount && industryDropdownOpen && (
                                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                        {filteredIndustries.length > 0 ? (
                                            filteredIndustries.map((ind) => (
                                                <li
                                                    key={ind.id}
                                                    onClick={() => {
                                                        setFormData((prev) => ({ ...prev, industry: ind.industryName, industryId: ind.id }));
                                                        setIndustryDropdownOpen(false);
                                                        setIndustryQuery("");
                                                    }}
                                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm">
                                                    {ind.industryName}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-3 py-2 text-gray-500 text-sm">No results found</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                            {errors?.industry && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.industry}</p>}
                        </div>

                        {/* Mode */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Mode</label>
                            <input
                                type="text"
                                name="mode"
                                value={formData.mode}
                                onChange={handleChange}
                                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                            />
                            {errors?.mode && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.mode}</p>}
                        </div>
                    </div>

                    {/* Right column (unchanged, keeping your structure) */}
                    <div className="flex flex-col gap-y-5">
                        {/* Contact Person */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Contact Person</label>
                            <input
                                type="text"
                                name="contactPerson"
                                value={formData.contactPerson}
                                onChange={handleChange}
                                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                            />
                            {errors?.contactPerson && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.contactPerson}</p>}
                        </div>

                        {/* Contact Number */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Contact Number</label>
                            <input
                                type="text"
                                name="contactNumber"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                            />
                            {errors?.contactNumber && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.contactNumber}</p>}
                        </div>
                        {/* WO Date */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">WO Date</label>
                            <input
                                type="date"
                                name="woDate"
                                autoComplete="off"
                                value={formData.woDate}
                                readOnly
                                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2 bg-gray-100 cursor-not-allowed"
                            />
                            {errors?.woDate && <p className="text-xs text-red-600 mt-1">{errors.woDate}</p>}
                        </div>

                        {/* Due Date */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Due Date</label>
                            <input
                                type="date"
                                name="dueDate"
                                autoComplete="off"
                                value={utils.formatDate(formData.dueDate, "YYYY-MM-DD") || ""}
                                onChange={handleChange}
                                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                            />
                            {errors?.dueDate && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.dueDate}</p>}
                        </div>

                        {/* From / To Time */}
                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">From Time</label>
                            <input
                                type="time"
                                name="fromTime"
                                autoComplete="off"
                                value={formData.fromTime}
                                onChange={handleChange}
                                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                            />
                            {errors?.fromTime && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.fromTime}</p>}
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">To Time</label>
                            <input
                                type="time"
                                name="toTime"
                                autoComplete="off"
                                value={formData.toTime}
                                onChange={handleChange}
                                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
                            />
                            {errors?.toTime && <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">{errors.toTime}</p>}
                        </div>

                        {/* Actuals */}
                        {/* <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Actual Date</label>
                            <input
                                type="date"
                                name="actualDate"
                                value={utils.formatDate(formData.actualDate, "YYYY-MM-DD")}
                                onChange={handleChange}
                                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
                                readOnly
                            />
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Actual From</label>
                            <input
                                type="time"
                                name="actualFromTime"
                                value={formData.actualFromTime}
                                onChange={handleChange}
                                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
                                readOnly
                            />
                        </div>

                        <div className="grid grid-cols-6 gap-x-4">
                            <label className="text-sm text-right my-auto">Actual To</label>
                            <input
                                type="time"
                                name="actualToTime"
                                value={formData.actualToTime}
                                onChange={handleChange}
                                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
                                readOnly
                            />
                        </div> */}
                    </div>
                </div>

                {/* Long Texts */}
                <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <label className="text-sm text-right my-auto col-span-2 xl:col-span-1">Objective</label>
                        <textarea
                            name="objective"
                            value={formData.objective}
                            onChange={handleChange}
                            className="col-span-10 xl:col-span-11 w-full min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
                        />
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <label className="text-sm text-right my-auto col-span-2 xl:col-span-1">Instruction</label>
                        <textarea
                            name="instruction"
                            value={formData.instruction}
                            onChange={handleChange}
                            className="col-span-10 xl:col-span-11 w-full min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
                        />
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <label className="text-sm text-right my-auto col-span-2 xl:col-span-1">Target Output</label>
                        <textarea
                            name="targetOutput"
                            value={formData.targetOutput}
                            onChange={handleChange}
                            className="col-span-10 xl:col-span-11 min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
                        />
                    </div>
                </div>
            </div>
        </form>
    );
};

export default WorkOrderForm;
