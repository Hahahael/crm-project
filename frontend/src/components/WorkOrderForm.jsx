import { useState, useEffect, useRef } from "react";
import { LuArrowLeft, LuCheck, LuX } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js"

const WorkOrderForm = ({ workOrder, mode = "create", onSave, onBack }) => {
  const [errors, setErrors] = useState(null);
  const [formData, setFormData] = useState({
    woNumber: "",
    workDescription: "",
    assignee: "",
    assigneeUsername: "", // 🔹 added for display
    department: "",
    accountName: "",
    isNewAccount: false,
    industry: "",
    mode: "",
    productBrand: "",
    contactPerson: "",
    contactNumber: "",
    isFsl: false,
    isEsl: false,
    woDate: "",
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
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    if (workOrder && Object.keys(workOrder).length > 0) {
      setFormData((prev) => ({ ...prev, ...workOrder }));
    } else if (workOrder && Object.keys(workOrder).length === 0) {
      setFormData((prev) => ({
        ...prev,
        woNumber: "",
        workDescription: "",
        assignee: "",
        assigneeUsername: "",
        department: "",
        accountName: "",
        isNewAccount: false,
        industry: "",
        mode: "",
        productBrand: "",
        contactPerson: "",
        contactNumber: "",
        isFsl: false,
        isEsl: false,
        woDate: "",
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

  const handleSubmit = (e) => {
    e.preventDefault();
  
    // Destructure optional + WO number
    const { actualDate, actualFromTime, actualToTime, woNumber, ...requiredFields } = formData;
  
    // Find missing required fields
    const missing = Object.entries(requiredFields).filter(
      ([, value]) => value === "" || value === null || value === undefined
    );
  
    if (missing.length > 0) {
      // Mark missing fields as errors
      const newErrors = {};
      missing.forEach(([key]) => {
        newErrors[key] = true;
      });
      setErrors(newErrors);
      return;
    }
  
    // ✅ Reset errors if all fields are valid
    setErrors({});
  
    // ✅ Convert empty optional fields to null
    const cleanedFormData = {
      ...formData,
      actualDate: formData.actualDate || null,
      actualFromTime: formData.actualFromTime || null,
      actualToTime: formData.actualToTime || null,
      fromTime: formData.fromTime || null,
      toTime: formData.toTime || null,
    };
  
    onSave(cleanedFormData, mode);
  };
  

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
            className="flex border border-gray-200 bg-green-500 hover:bg-green-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white"
          >
            <LuCheck className="mr-2" /> Save
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          {/* Left column */}
          <div className="flex flex-col gap-y-5">
            {/* WO# */}
            <div className={`grid-cols-6 gap-x-4 ${mode === "create" ? "hidden" : "grid" }`}>
              <label className="text-sm text-right my-auto">WO#</label>
              <input
                type="text"
                name="woNumber"
                value={formData.woNumber}
                onChange={handleChange}
                className="col-span-5 w-full rounded-md border border-gray-200 px-3 py-2 text-gray-400 focus:outline-none focus:ring-0"
                placeholder="WO-2025-0001"
                readOnly
              />
            </div>

            {/* Work Description */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Work Desc</label>
              <input
                type="text"
                name="workDescription"
                value={formData.workDescription}
                onChange={handleChange}
                className={`col-span-5 w-full rounded-md border px-3 py-2 focus:outline-1
                  ${errors?.workDescription ? "border-red-500" : "border-gray-200"}`}
              />
            </div>

            {/* Assignee + Dept */}
            <div
              className="grid grid-cols-6 gap-x-4 relative"
              ref={assigneeRef}
            >
              <label className="text-sm text-right my-auto">Assignee</label>
              <div className="col-span-2 relative">
                <input
                  type="text"
                  value={formData.assigneeUsername || ""}
                  onChange={(e) => {
                    const q = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      assigneeUsername: q,
                    }));
                    setSearchQuery(q);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search user..."
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                />

                {dropdownOpen && (
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
                              department: user.department
                            }));
                            setDropdownOpen(false);
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
              </div>

              <label className="text-sm text-right my-auto">Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                readOnly
                className="col-span-2 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Account + New Flag */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Account</label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                className="col-span-4 w-full rounded-md border border-gray-200 px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isNew"
                  checked={!!formData.isNewAccount}
                  onChange={handleChange}
                  className="h-4 w-4 border border-gray-400"
                />
                <label className="text-sm text-gray-600">New</label>
              </div>
            </div>

            {/* Industry + Mode */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Industry</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="col-span-2 w-full rounded-md border border-gray-200 px-3 py-2"
              />
              <label className="text-sm text-right my-auto">Mode</label>
              <input
                type="text"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                className="col-span-2 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Product/Brand */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">
                Product/Brand
              </label>
              <input
                type="text"
                name="productBrand"
                value={formData.productBrand}
                onChange={handleChange}
                className="col-span-5 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Contact Person */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">
                Contact Person
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                className="col-span-5 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Contact Number */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">
                Contact Number
              </label>
              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="col-span-5 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>
          </div>

          {/* Right column (unchanged, keeping your structure) */}
          <div className="flex flex-col gap-y-5">
            {/* FSL / ESL checkboxes */}
            <div className="flex items-center justify-end gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isFsl"
                  checked={formData.isFsl}
                  onChange={handleChange}
                  className="h-4 w-4 border border-gray-400 rounded"
                />
                <span className="text-sm">FSL</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isEsl"
                  checked={formData.isEsl}
                  onChange={handleChange}
                  className="h-4 w-4 border border-gray-400 rounded"
                />
                <span className="text-sm">ESL</span>
              </label>
            </div>

            {/* WO Date */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">WO Date</label>
              <input
                type="date"
                name="woDate"
                value={utils.formatDate(formData.woDate, "YYYY-MM-DD")}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Due Date */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={utils.formatDate(formData.dueDate, "YYYY-MM-DD")}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* From / To Time */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">From Time</label>
              <input
                type="time"
                name="fromTime"
                value={formData.fromTime}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">To Time</label>
              <input
                type="time"
                name="toTime"
                value={formData.toTime}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Actuals */}
            <div className="grid grid-cols-6 gap-x-4">
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
              <label className="text-sm text-right my-auto">
                Actual From
              </label>
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
            </div>
          </div>
        </div>

        {/* Long Texts */}
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-6 gap-4">
            <label className="text-sm text-right my-auto">Objective</label>
            <textarea
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              className="col-span-5 min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-6 gap-4">
            <label className="text-sm text-right my-auto">Instruction</label>
            <textarea
              name="instruction"
              value={formData.instruction}
              onChange={handleChange}
              className="col-span-5 min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-6 gap-4">
            <label className="text-sm text-right my-auto">
              Target Output
            </label>
            <textarea
              name="targetOutput"
              value={formData.targetOutput}
              onChange={handleChange}
              className="col-span-5 min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default WorkOrderForm;
