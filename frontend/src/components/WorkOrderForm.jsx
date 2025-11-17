/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { LuArrowLeft, LuCheck, LuX, LuCalendar } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js";

const WorkOrderForm = ({ workOrder, mode = "create", onSave, onBack }) => {
  console.log("WorkOrderForm mode:", mode, "workOrder:", workOrder);
  const [errors, setErrors] = useState(null);
  const [formData, setFormData] = useState({
    wo_number: "",
    work_description: "",
    assignee: "",
    assignee_username: "", // 🔹 added for display
    department_id: "",
    account_id: "", // <-- use account_id instead of accountName
    is_new_account: false,
    industry_id: "",
    mode: "",
    product_id: "",
    contact_person: "",
    contact_number: "",
    is_fsl: false,
    is_esl: false,
    wo_date: dayjs().format("YYYY-MM-DD"),
    due_date: "",
    from_time: "",
    to_time: "",
    actual_date: "",
    actual_from_time: "",
    actual_to_time: "",
    objective: "",
    instruction: "",
    target_output: "",
  });

  // 🔹 user search state
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [industries, setIndustries] = useState([]); // [{id, Code}]
  const [product_brands, setProductBrands] = useState([]); // [{id, Description}]
  const [departments, setDepartments] = useState([]); // [{id, Department}]
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const departmentRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [product_brandQuery, setProductBrandQuery] = useState("");
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [industryQuery, setIndustryQuery] = useState("");
  // Distinct dropdown states
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [product_brandDropdownOpen, setProductBrandDropdownOpen] =
    useState(false);
  const assigneeRef = useRef(null);
  const accountRef = useRef(null);
  const industryRef = useRef(null);
  const product_brandRef = useRef(null);
  const due_dateRef = useRef(null);

  // Helper to find by display name (case-insensitive exact match)
  const findByName = (list, key, value) => {
    if (!value) return undefined;
    const needle = String(value).trim().toLowerCase();
    return list.find((x) => String(x[key]).trim().toLowerCase() === needle);
  };

  // Prefer local accountName, then other common fields, then kristem.Name
  const accountDisplayName = (a) => {
    if (!a) return "";
    const name =
      a.accountName ??
      a.account_name ??
      a.name ??
      a.Name ??
      (a.kristem && a.kristem.Name ? a.kristem.Name : "");
    return String(name || "");
  };

  const findAccountByDisplayName = (list, value) => {
    if (!value) return undefined;
    const needle = String(value).trim().toLowerCase();
    return list.find((a) => accountDisplayName(a).trim().toLowerCase() === needle);
  };

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
        const res = await apiBackendFetch("/api/accounts/");
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
    // Populate assignee_username from assignee id if missing
    if (formData.assignee && !formData.assignee_username && users.length > 0) {
      const u = users.find((x) => x.id == formData.assignee);
      if (u) {
        setFormData((prev) => ({ ...prev, assignee_username: u.username }));
      }
    }

    console.log("Hydrating account-related fields if needed..., check formData:", formData);
    // Populate account-related display fields when account_id exists (edit mode)
    if (
      !formData.is_new_account &&
      formData.account_id &&
      (accounts.length > 0 ||
        industries.length > 0 ||
        product_brands.length > 0 ||
        departments.length > 0)
    ) {
      setFormData((prev) => {
        // If already hydrated, skip
        const acc = accounts.find((a) => a.id == prev.account_id);
        console.log("Hydrating account fields for", acc);
        if (!acc) return prev;
        const department_name =
          departments.find((d) => d.Id == acc.department?.Id)?.Department ||
          prev.department ||
          "";
        const industry_name =
          industries.find((i) => i.Id == acc.industry?.Id)?.Code ||
          prev.industry ||
          "";
        const product_name =
          product_brands.find((p) => p.ID == acc.brand?.ID)?.Description ||
          prev.product_brand ||
          "";
        return {
          ...prev,
          department: department_name,
          department_id: acc.department_id || prev.department_id,
          industry: industry_name,
          industry_id: acc.industry_id || prev.industry_id,
          product_brand: product_name,
          product_id: acc.product_id || prev.product_id,
        };
      });
    }
  }, [
    users,
    accounts,
    industries,
    product_brands,
    departments,
    formData.assignee,
    formData.assignee_username,
    formData.account_id,
    formData.is_new_account,
  ]);

  // filter users by search
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(assigneeQuery.toLowerCase()),
  );
  const filteredAccounts = accounts.filter((a) =>
    accountDisplayName(a).toLowerCase().includes(accountQuery.toLowerCase()),
  );
  const filteredProductBrands = product_brands.filter((p) =>
    p.Description.toLowerCase().includes(product_brandQuery.toLowerCase()),
  );
  const filteredDepartments = departments.filter((d) =>
    d.Department.toLowerCase().includes(departmentQuery.toLowerCase()),
  );
  const filteredIndustries = industries.filter((i) =>
    i.Code.toLowerCase().includes(industryQuery.toLowerCase())
  );

  // close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        assigneeDropdownOpen &&
        assigneeRef.current &&
        !assigneeRef.current.contains(e.target)
      ) {
        setAssigneeDropdownOpen(false);
      }
      if (
        accountDropdownOpen &&
        accountRef.current &&
        !accountRef.current.contains(e.target)
      ) {
        setAccountDropdownOpen(false);
      }
      if (
        industryDropdownOpen &&
        industryRef.current &&
        !industryRef.current.contains(e.target)
      ) {
        setIndustryDropdownOpen(false);
      }
      if (
        product_brandDropdownOpen &&
        product_brandRef.current &&
        !product_brandRef.current.contains(e.target)
      ) {
        setProductBrandDropdownOpen(false);
      }
      if (
        departmentDropdownOpen &&
        departmentRef.current &&
        !departmentRef.current.contains(e.target)
      ) {
        setDepartmentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    assigneeDropdownOpen,
    accountDropdownOpen,
    industryDropdownOpen,
    product_brandDropdownOpen,
    departmentDropdownOpen,
  ]);

  // load initial (editing) data
  useEffect(() => {
    console.log("WorkOrderForm received workOrder prop:", workOrder);
    if (workOrder && Object.keys(workOrder).length > 0) {
      console.log("Loading work order data into form:", workOrder);
      setFormData((prev) => ({
        ...prev,
        ...workOrder,
        wo_date: utils.formatDate(workOrder.wo_date, "YYYY-MM-DD") || prev.wo_date,
        // normalize incoming due_date to a YYYY-MM-DD string once
        due_date:
          utils.formatDate(workOrder.due_date, "YYYY-MM-DD") ||
          prev.due_date ||
          "",
        accountName: workOrder.account.accountName,
        product_brand: workOrder.account.brand.Description,
        department: workOrder.account.department.Department,
        industry: workOrder.account.industry.Code,
        product_id: workOrder.account.brand.ID,
        department_id: workOrder.account.department.Id,
        industry_id: workOrder.account.industry.Id,
      }));
    } else if (workOrder && Object.keys(workOrder).length === 0) {
      setFormData((prev) => ({
        ...prev,
        wo_number: "",
        work_description: "",
        assignee: "",
        assignee_username: "",
        department_id: "",
        account_id: "",
        is_new_account: false,
        industry_id: "",
        mode: "",
        product_id: "",
        contact_person: "",
        contact_number: "",
        is_fsl: false,
        is_esl: false,
        wo_date: prev.wo_date || dayjs().format("YYYY-MM-DD"),
        due_date: "",
        from_time: "",
        to_time: "",
        actual_date: "",
        actual_from_time: "",
        actual_to_time: "",
        objective: "",
        instruction: "",
        target_output: "",
      }));
    }
  }, [workOrder]);

  const handleChange = (e) => {
    console.log("Handling change for", e.target.name, "with value", e.target.value);
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

  // Sanitize date input so year doesn't exceed 4 digits while allowing user typing
  const handleDueDateChange = (e) => {
    const raw = e.target.value || "";
    const parts = raw.replace(/[^0-9-]/g, "").split("-");
    if (parts.length > 0) {
      parts[0] = (parts[0] || "").replace(/\D/g, "").slice(0, 4);
    }
    const normalized = parts.join("-");
    setFormData((prev) => ({ ...prev, due_date: normalized }));
    setErrors((prevErrors) => {
      if (!prevErrors) return prevErrors;
      if (normalized) {
        const { due_date, ...rest } = prevErrors;
        return rest;
      }
      return prevErrors;
    });
  };

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
      actual_date: formData.actual_date || null,
      actual_from_time: formData.actual_from_time || null,
      actual_to_time: formData.actual_to_time || null,
      from_time: formData.from_time || null,
      to_time: formData.to_time || null,
    };
    if (!formData.is_new_account) delete cleanedFormData.accountName;
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
    console.log("Validating form data:", data);
    const errors = {};
    // work_description
    if (
      !data.work_description ||
      String(data.work_description).trim().length < 3
    ) {
      errors.work_description = "Work description is required (min 3 chars).";
    }
    // assignee
    if (!data.assignee) errors.assignee = "Assignee is required.";

    // account/new-account rules
    if (data.is_new_account) {
      if (!data.accountName || String(data.accountName).trim() === "")
        errors.accountName = "Account name is required for new accounts.";
      if (!data.department_id) errors.department = "Department is required.";
      if (!data.industry_id) errors.industry = "Industry is required.";
      if (!data.product_id)
        errors.product_brand = "Product/Brand is required.";
    } else {
      if (!data.account_id) {
        errors.account_id = "Account is required.";
      } else {
        // If selected account has no mapping, require the field
        const hasDept = !!(
          selectedAccountObj?.department_id ?? selectedAccountObj?.department_id
        );
        const hasInd = !!(
          selectedAccountObj?.industry_id ?? selectedAccountObj?.industry_id
        );
        const hasBrand = !!(
          selectedAccountObj?.product_id ?? selectedAccountObj?.product_id
        );

        if (!hasDept && !data.department_id)
          errors.department = "Department is required.";
        if (!hasInd && !data.industry_id)
          errors.industry = "Industry is required.";
        if (!hasBrand && !data.product_id)
          errors.product_brand = "Product/Brand is required.";
      }
    }

    // mode
    if (!data.mode || String(data.mode).trim().length === 0) {
      errors.mode = "Mode is required.";
    }

    // FSL/ESL: exactly one must be selected
    if (!!data.is_fsl === !!data.is_esl) {
      // both true or both false
      errors.fslEsl = "Please select exactly one of FSL or ESL.";
    }

    // dates
    if (!isValidDate(data.wo_date))
      errors.wo_date = "WO Date is required and must be valid.";
    if (!isValidDate(data.due_date)) {
      errors.due_date = "Due Date is required and must be valid.";
    } else {
      // due_date must be today or later (disallow yesterday and earlier)
      const today = dayjs().startOf("day");
      const due = dayjs(data.due_date).startOf("day");
      if (due.isBefore(today)) {
        errors.due_date = "Due Date cannot be earlier than today.";
      }
    }
    if (isValidDate(data.wo_date) && isValidDate(data.due_date)) {
      if (dayjs(data.due_date).isBefore(dayjs(data.wo_date), "day"))
        errors.due_date = "Due Date cannot be before WO Date.";
    }

    // times
    if (data.from_time && !isValidTime(data.from_time))
      errors.from_time = "Invalid time (HH:mm).";
    if (data.to_time && !isValidTime(data.to_time))
      errors.to_time = "Invalid time (HH:mm).";
    if (
      data.from_time &&
      data.to_time &&
      isValidTime(data.from_time) &&
      isValidTime(data.to_time)
    ) {
      const from = dayjs(data.from_time, "HH:mm");
      const to = dayjs(data.to_time, "HH:mm");
      if (to.isBefore(from))
        errors.to_time = "End time must be same or after start time.";
    }

    // contact
    if (!data.contact_person || String(data.contact_person).trim().length === 0) {
      errors.contact_person = "Contact person is required.";
    }
    if (!data.contact_number || String(data.contact_number).trim().length === 0) {
      errors.contact_number = "Contact number is required.";
    } else if (!PHONE_RE.test(String(data.contact_number))) {
      errors.contact_number = "Invalid phone number.";
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  // Helper: get selected account object (use loose equality to avoid number/string mismatches)
  const selectedAccountObj = accounts.find((a) => a.id == formData.account_id);

  // Field editability depends only on "New Account" flag
  const canEditProductBrand = !!formData.is_new_account;
  const canEditDepartment = !!formData.is_new_account;
  const canEditIndustry = !!formData.is_new_account;

  return (
    <form onSubmit={handleSubmit} className="h-full w-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mr-4 rounded px-2 py-2 font-medium hover:bg-gray-100 transition-all duration-150 flex align-middle border border-gray-200"
        >
          <LuArrowLeft className="my-auto text-lg" />
        </button>
        <h1 className="text-2xl font-bold">
          {mode === "edit" ? "Edit Work Order" : "New Work Order"}
        </h1>
        <div className="ml-auto flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            onClick={(e) => {
              if (submitting) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={`flex border border-gray-200 px-4 py-2 rounded-md items-center text-sm text-white ${submitting ? "bg-gray-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"}`}
          >
            <LuCheck className="mr-2" /> {submitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex border border-gray-200 bg-gray-400 hover:bg-gray-500 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white"
          >
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
              <div
                className={`grid-cols-12 gap-x-4 col-span-12 ${mode === "create" ? "hidden" : "grid"}`}
              >
                <label className="text-sm text-right my-auto">WO#</label>
                <input
                  type="text"
                  name="wo_number"
                  value={formData.wo_number}
                  className="col-span-11 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-400 focus:outline-none focus:ring-0 cursor-not-allowed"
                  placeholder="WO-2025-0001"
                  readOnly
                />
              </div>
              {/* Work Description */}
              <div className={`grid-cols-10 gap-x-4 col-span-10 grid`}>
                <label className="text-sm text-right my-auto break-words hyphens-auto col-span-2 xl:col-span-1">
                  Work Description
                </label>
                <input
                  type="text"
                  name="work_description"
                  value={formData.work_description}
                  onChange={handleChange}
                  className={`col-span-8 xl:col-span-9 w-full h-10 my-auto rounded-md border px-3 py-2 focus:outline-1
                                                                                ${errors?.work_description ? "border-red-500" : "border-gray-200"}`}
                />
                {errors?.work_description && (
                  <p className="text-xs text-red-600 mt-1 col-span-10 col-start-2">
                    {errors.work_description}
                  </p>
                )}
              </div>
              <div className={`grid-cols-2 col-span-2 my-auto`}>
                {/* FSL / ESL checkboxes */}
                <div className="flex items-center justify-end gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_fsl"
                      checked={formData.is_fsl}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        // compute new state and update errors accordingly
                        setFormData((prev) => {
                          const ns = {
                            ...prev,
                            is_fsl: checked,
                            is_esl: checked ? false : prev.is_esl,
                          };
                          setErrors((prevErr) => {
                            if (!prevErr) return prevErr;
                            // if exactly one selected now, remove the fslEsl error
                            if (
                              (ns.is_fsl && !ns.is_esl) ||
                              (!ns.is_fsl && ns.is_esl)
                            ) {
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
                      name="is_esl"
                      checked={formData.is_esl}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => {
                          const ns = {
                            ...prev,
                            is_esl: checked,
                            is_fsl: checked ? false : prev.is_fsl,
                          };
                          setErrors((prevErr) => {
                            if (!prevErr) return prevErr;
                            if (
                              (ns.is_fsl && !ns.is_esl) ||
                              (!ns.is_fsl && ns.is_esl)
                            ) {
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
                {errors?.fslEsl && (
                  <p className="text-xs text-red-600 mt-1 break-words hyphens-auto">
                    {errors.fslEsl}
                  </p>
                )}
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
                  value={formData.assignee_username || ""}
                  onChange={(e) => {
                    const q = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      assignee_username: q,
                      assignee: q === "" ? "" : prev.assignee,
                    }));
                    setAssigneeQuery(q);
                    setAssigneeDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const u = findByName(
                        users,
                        "username",
                        formData.assignee_username,
                      );
                      if (u) {
                        setFormData((prev) => ({
                          ...prev,
                          assignee: u.id,
                          assignee_username: u.username,
                        }));
                        setAssigneeDropdownOpen(false);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!formData.assignee && formData.assignee_username) {
                      const u = findByName(
                        users,
                        "username",
                        formData.assignee_username,
                      );
                      if (u) {
                        setFormData((prev) => ({
                          ...prev,
                          assignee: u.id,
                          assignee_username: u.username,
                        }));
                        setAssigneeDropdownOpen(false);
                      } else {
                        // if user cleared or typed arbitrary text, keep cleared state
                        setFormData((prev) => ({ ...prev, assignee: "" }));
                      }
                    }
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
                              assignee_username: user.username, // display username
                            }));
                            setAssigneeDropdownOpen(false);
                            setAssigneeQuery("");
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        >
                          {user.username}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-gray-500 text-sm">
                        No results found
                      </li>
                    )}
                  </ul>
                )}
                {errors?.assignee && (
                  <p className="text-xs text-red-600 mt-1">{errors.assignee}</p>
                )}
              </div>
            </div>

            {/* Account + New Flag */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Account</label>
              <div className="col-span-4">
                {formData.is_new_account ? (
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
                      value={accountQuery !== "" ? accountQuery : (selectedAccountObj ? accountDisplayName(selectedAccountObj) : "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccountQuery(val);
                        setAccountDropdownOpen(true);
                        // If user types and it diverges from the selected account display, clear selection and mapped fields
                        setFormData((prev) => {
                          if (prev.account_id) {
                            const prevName = selectedAccountObj ? accountDisplayName(selectedAccountObj) : "";
                            if (val !== prevName) {
                              return {
                                ...prev,
                                account_id: "",
                                department: "",
                                department_id: "",
                                industry: "",
                                industry_id: "",
                                product_brand: "",
                                product_id: "",
                              };
                            }
                          }
                          return prev;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const acc = findAccountByDisplayName(
                            accounts,
                            e.currentTarget.value,
                          );
                          if (acc) {
                            console.log("Selected account on Enter:", acc);
                            const department_name =
                              departments.find((d) => d.Id == acc.department_id)
                                ?.Department || "";
                            const industry_name =
                              industries.find((i) => i.Id == acc.industry_id)
                                ?.Code || "";
                            const product_name =
                              product_brands.find((p) => p.ID == acc.product_id)
                                ?.Description || "";
                            setFormData((prev) => ({
                              ...prev,
                              account_id: acc.id,
                              department: department_name,
                              department_id: acc.department_id || "",
                              industry: industry_name,
                              industry_id: acc.industry_id || "",
                              product_brand: product_name,
                              product_id: acc.product_id || "",
                            }));
                            setAccountDropdownOpen(false);
                            setAccountQuery("");
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (!formData.is_new_account && !formData.account_id) {
                          const acc = findAccountByDisplayName(
                            accounts,
                            e.currentTarget.value,
                          );
                          if (acc) {
                            const department_name =
                              departments.find((d) => d.Id == acc.department_id)
                                ?.Department || "";
                            const industry_name =
                              industries.find((i) => i.Id == acc.industry_id)
                                ?.Code || "";
                            const product_name =
                              product_brands.find((p) => p.ID == acc.product_id)
                                ?.Description || "";
                            setFormData((prev) => ({
                              ...prev,
                              account_id: acc.id,
                              department: department_name,
                              department_id: acc.department_id || "",
                              industry: industry_name,
                              industry_id: acc.industry_id || "",
                              product_brand: product_name,
                              product_id: acc.product_id || "",
                            }));
                            setAccountDropdownOpen(false);
                            setAccountQuery("");
                          }
                        }
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
                                console.log("Selected account:", account);
                                console.log("Departments:", departments);
                                console.log("Industry:", industries);
                                console.log("Product Brands:", product_brands);
                                setFormData((prev) => ({
                                  ...prev,
                                  account_id: account.id,
                                  department:
                                    departments.find(
                                      (d) => d.Id === account.department.Id,
                                    )?.Department || "",
                                  department_id: account.department.Id || "",
                                  industry:
                                    industries.find(
                                      (i) => i.Id === account.industry.Id,
                                    )?.Code || "",
                                  industry_id: account.industry.Id || "",
                                  product_brand:
                                    product_brands.find(
                                      (p) => p.ID === account.brand.ID,
                                    )?.Description || "",
                                  product_id: account.brand.ID || "",
                                }));
                                setAccountDropdownOpen(false);
                                setAccountQuery("");
                              }}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                            >
                              {accountDisplayName(account)}
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-gray-500 text-sm">
                            No results found
                          </li>
                        )}
                      </ul>
                    )}
                    {!formData.is_new_account && errors?.account_id && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.account_id}
                      </p>
                    )}
                  </div>
                )}
                {errors?.accountName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.accountName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <input
                  type="checkbox"
                  name="is_new_account"
                  checked={!!formData.is_new_account}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      is_new_account: checked,
                      department: "",
                      department_id: "",
                      industry: "",
                      industry_id: "",
                      product_brand: "",
                      product_id: "",
                      account_id: "",
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
              <label className="text-sm text-right my-auto break-words hyphens-auto">
                Product/Brand
              </label>
              <div className="col-span-5 relative" ref={product_brandRef}>
                {canEditProductBrand ? (
                  <input
                    type="text"
                    name="product_brand"
                    autoComplete="off"
                    value={product_brandQuery || formData.product_brand}
                    onChange={(e) => {
                      const q = e.target.value;
                      setFormData((prev) => ({ ...prev, product_brand: q }));
                      setProductBrandQuery(q);
                      setProductBrandDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const prod = findByName(
                          product_brands,
                          "Description",
                          e.currentTarget.value,
                        );
                        if (prod) {
                          setFormData((prev) => ({
                            ...prev,
                            product_brand: prod.Description,
                            product_id: prod.ID,
                          }));
                          setProductBrandDropdownOpen(false);
                          setProductBrandQuery("");
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (formData.is_new_account) {
                        const prod = findByName(
                          product_brands,
                          "Description",
                          e.currentTarget.value,
                        );
                        if (prod) {
                          setFormData((prev) => ({
                            ...prev,
                            product_brand: prod.Description,
                            product_id: prod.ID,
                          }));
                          setProductBrandDropdownOpen(false);
                        }
                      }
                    }}
                    onFocus={() => setProductBrandDropdownOpen(true)}
                    placeholder="Search product/brand..."
                    className={`w-full h-10 rounded-md border px-3 py-2 ${errors?.product_brand ? "border-red-500" : "border-gray-200"}`}
                  />
                ) : (
                  <input
                    type="text"
                    name="product_brand"
                    autoComplete="off"
                    value={formData.product_brand}
                    className="w-full h-10 rounded-md border border-gray-200 bg-gray-100 px-3 py-2"
                    readOnly
                  />
                )}
                {canEditProductBrand && product_brandDropdownOpen && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredProductBrands.length > 0 ? (
                      filteredProductBrands.map((prod) => (
                        <li
                          key={prod.ID}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              product_brand: prod.Description,
                              product_id: prod.ID,
                            }));
                            setProductBrandDropdownOpen(false);
                            setProductBrandQuery("");
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        >
                          {prod.Description}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-gray-500 text-sm">
                        No results found
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {errors?.product_brand && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.product_brand}
                </p>
              )}
            </div>

            {/* Department */}
            <div className="grid grid-cols-6 gap-x-4" ref={departmentRef}>
              <label className="text-sm text-right my-auto break-words hyphens-auto">
                Department
              </label>
              <div className="col-span-5 relative" ref={departmentRef}>
                {canEditDepartment ? (
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const dept = findByName(
                          departments,
                          "Department",
                          e.currentTarget.value,
                        );
                        if (dept) {
                          setFormData((prev) => ({
                            ...prev,
                            department: dept.Department,
                            department_id: dept.Id,
                          }));
                          setDepartmentDropdownOpen(false);
                          setDepartmentQuery("");
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (formData.is_new_account && !formData.department_id) {
                        const dept = findByName(
                          departments,
                          "Department",
                          e.currentTarget.value,
                        );
                        if (dept) {
                          setFormData((prev) => ({
                            ...prev,
                            department: dept.Department,
                            department_id: dept.Id,
                          }));
                          setDepartmentDropdownOpen(false);
                        }
                      }
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
                {canEditDepartment && departmentDropdownOpen && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredDepartments.length > 0 ? (
                      filteredDepartments.map((dept) => (
                        <li
                          key={dept.Id}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              department: dept.Department,
                              department_id: dept.Id,
                            }));
                            setDepartmentDropdownOpen(false);
                            setDepartmentQuery("");
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        >
                          {dept.Department}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-gray-500 text-sm">
                        No results found
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {errors?.department && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.department}
                </p>
              )}
            </div>

            {/* Industry + Mode */}
            <div className="grid grid-cols-6 gap-x-4" ref={industryRef}>
              <label className="text-sm text-right my-auto break-words hyphens-auto">
                Industry
              </label>
              <div className="col-span-5 relative" ref={industryRef}>
                {canEditIndustry ? (
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const ind = findByName(
                          industries,
                          "Code",
                          e.currentTarget.value,
                        );
                        if (ind) {
                          setFormData((prev) => ({
                            ...prev,
                            industry: ind.Code,
                            industry_id: ind.Id,
                          }));
                          setIndustryDropdownOpen(false);
                          setIndustryQuery("");
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (formData.is_new_account && !formData.industry_id) {
                        const ind = findByName(
                          industries,
                          "Code",
                          e.currentTarget.value,
                        );
                        if (ind) {
                          setFormData((prev) => ({
                            ...prev,
                            industry: ind.Code,
                            industry_id: ind.Id,
                          }));
                          setIndustryDropdownOpen(false);
                        }
                      }
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
                {canEditIndustry && industryDropdownOpen && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredIndustries.length > 0 ? (
                      filteredIndustries.map((ind) => (
                        <li
                          key={ind.Id}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              industry: ind.Code,
                              industry_id: ind.Id,
                            }));
                            setIndustryDropdownOpen(false);
                            setIndustryQuery("");
                          }}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        >
                          {ind.Code}
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-gray-500 text-sm">
                        No results found
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {errors?.industry && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.industry}
                </p>
              )}
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
              {errors?.mode && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.mode}
                </p>
              )}
            </div>
          </div>

          {/* Right column (unchanged, keeping your structure) */}
          <div className="flex flex-col gap-y-5">
            {/* Contact Person */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">
                Contact Person
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
              />
              {errors?.contact_person && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.contact_person}
                </p>
              )}
            </div>

            {/* Contact Number */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">
                Contact Number
              </label>
              <input
                type="text"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
              />
              {errors?.contact_number && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.contact_number}
                </p>
              )}
            </div>
            {/* WO Date */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">WO Date</label>
              <input
                type="date"
                name="wo_date"
                autoComplete="off"
                value={formData.wo_date}
                readOnly
                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2 bg-gray-100 cursor-not-allowed"
              />
              {errors?.wo_date && (
                <p className="text-xs text-red-600 mt-1">{errors.wo_date}</p>
              )}
            </div>

            {/* Due Date */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Due Date</label>
              <div className="col-span-5 relative">
                <input
                  ref={due_dateRef}
                  type="date"
                  name="due_date"
                  autoComplete="off"
                  value={formData.due_date || ""}
                  onChange={handleDueDateChange}
                  min={dayjs().format("YYYY-MM-DD")}
                  max="2099-12-31"
                  className="hide-native-date-icon w-full h-10 rounded-md border border-gray-200 px-3 pr-10 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = due_dateRef.current;
                    if (!el) return;
                    if (typeof el.showPicker === "function") {
                      el.showPicker();
                    } else {
                      el.focus();
                      el.click();
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label="Open date picker"
                >
                  <LuCalendar className="w-5 h-5" />
                </button>
              </div>
              {errors?.due_date && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.due_date}
                </p>
              )}
            </div>

            {/* From / To Time */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">From Time</label>
              <input
                type="time"
                name="from_time"
                autoComplete="off"
                value={formData.from_time}
                onChange={handleChange}
                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
              />
              {errors?.from_time && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.from_time}
                </p>
              )}
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">To Time</label>
              <input
                type="time"
                name="to_time"
                autoComplete="off"
                value={formData.to_time}
                onChange={handleChange}
                className="col-span-5 w-full h-10 rounded-md border border-gray-200 px-3 py-2"
              />
              {errors?.to_time && (
                <p className="text-xs text-red-600 mt-1 col-span-5 col-start-2">
                  {errors.to_time}
                </p>
              )}
            </div>

            {/* Actuals */}
            {/* <div className="grid grid-cols-6 gap-x-4">
                                                        <label className="text-sm text-right my-auto">Actual Date</label>
                                                        <input
                                                                type="date"
                                                                name="actual_date"
                                                                value={utils.formatDate(formData.actual_date, "YYYY-MM-DD")}
                                                                onChange={handleChange}
                                                                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
                                                                readOnly
                                                        />
                                                </div>

                                                <div className="grid grid-cols-6 gap-x-4">
                                                        <label className="text-sm text-right my-auto">Actual From</label>
                                                        <input
                                                                type="time"
                                                                name="actual_from_time"
                                                                value={formData.actual_from_time}
                                                                onChange={handleChange}
                                                                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
                                                                readOnly
                                                        />
                                                </div>

                                                <div className="grid grid-cols-6 gap-x-4">
                                                        <label className="text-sm text-right my-auto">Actual To</label>
                                                        <input
                                                                type="time"
                                                                name="actual_to_time"
                                                                value={formData.actual_to_time}
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
            <label className="text-sm text-right my-auto col-span-2 xl:col-span-1">
              Objective
            </label>
            <textarea
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              className="col-span-10 xl:col-span-11 w-full min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-12 gap-4">
            <label className="text-sm text-right my-auto col-span-2 xl:col-span-1">
              Instruction
            </label>
            <textarea
              name="instruction"
              value={formData.instruction}
              onChange={handleChange}
              className="col-span-10 xl:col-span-11 w-full min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-12 gap-4">
            <label className="text-sm text-right my-auto col-span-2 xl:col-span-1">
              Target Output
            </label>
            <textarea
              name="target_output"
              value={formData.target_output}
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
