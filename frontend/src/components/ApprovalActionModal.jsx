import { useState, useEffect, useRef } from "react";
import { apiBackendFetch } from "../services/api";

const ApprovalActionModal = ({ isOpen, type, approval, onClose, onSubmit, submitting = false }) => {
  console.log("ApprovalActionModal props:", { isOpen, type, approval });
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    assignee: "",
    assigneeUsername: "",
    dueDate: "10/10/2025",
    fromTime: "09:00",
    toTime: "17:00",
    remarks: "",
    nextStage: "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        assignee: "",
        assigneeUsername: "",
        dueDate: "10/10/2025",
        fromTime: "09:00",
        toTime: "17:00",
        remarks: "",
        nextStage: "",
      });
    }
  }, [isOpen]);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [assigneeDropdownOpen]);

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

  // Derive isNew from referenced work order when approval changes
  const [woIsNew, setWoIsNew] = useState(null);
  useEffect(() => {
    const woId = approval?.woId ?? approval?.wo_id;
    setWoIsNew(null);
    if (!woId) return;
    let cancelled = false;
    (async () => {
      try {
        const woRes = await apiBackendFetch(`/api/workorders/${woId}`);
        if (!woRes.ok) return;
        const woData = await woRes.json();
        const isNew = Boolean(woData?.isNewAccount ?? woData?.is_new_account);
        if (!cancelled) setWoIsNew(isNew);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [approval]);

  // Determine dropdown options
  const stage = approval?.stageName || approval?.stage_name || approval?.module;
  let nextStageOptions = [];
  if (stage === "Sales Lead" || stage === "sales_lead") {
    nextStageOptions = [
      { value: "Technical Recommendation", label: "Technical Recommendation" },
      { value: "RFQ", label: "RFQ" },
    ];
  } else if (
    stage === "Technical Recommendation" ||
    stage === "technical_recommendation"
  ) {
    nextStageOptions = [{ value: "RFQ", label: "RFQ" }];
    // Prefer computed woIsNew; fallback to approval flag if provided
    const isNew = woIsNew ?? approval?.isNew ?? approval?.is_new;
    if (isNew) {
      nextStageOptions.push({ value: "NAEF", label: "NAEF" });
    } else {
      nextStageOptions.push({ value: "Quotations", label: "Quotations" });
    }
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "assignee" ? Number(value) : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("submitting", form);
    onSubmit(form);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 transition-opacity duration-300">
      <form
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md transform transition-all duration-300 scale-100 opacity-100"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold mb-4">
          {type === "approve" ? "Approve" : "Reject"} Stage
        </h2>
        <div className="space-y-3">
          {type === "approve" && (
            <div className="space-y-3">
              <div className="relative" ref={assigneeRef}>
                <input
                  name="assigneeUsername"
                  type="text"
                  autoComplete="off"
                  value={form.assigneeUsername || ""}
                  onChange={(e) => {
                    const q = e.target.value;
                    setForm((prev) => ({ ...prev, assigneeUsername: q }));
                    setSearchQuery(q);
                    setAssigneeDropdownOpen(true);
                  }}
                  onFocus={() => setAssigneeDropdownOpen(true)}
                  placeholder="Search user..."
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                />
                {assigneeDropdownOpen && (
                  <ul className="absolute left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <li
                          key={user.id}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              assignee: user.id, // store FK
                              assigneeUsername: user.username, // display username
                            }));
                            setAssigneeDropdownOpen(false);
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
              <input
                name="dueDate"
                type="date"
                placeholder="Due Date"
                value={form.dueDate}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded p-2"
                required
              />
              <input
                name="fromTime"
                type="time"
                placeholder="From Time"
                value={form.fromTime}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded p-2"
                required
              />
              <input
                name="toTime"
                type="time"
                placeholder="To Time"
                value={form.toTime}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded p-2"
                required
              />
              {/* Conditional dropdown for next stage */}
              {nextStageOptions.length > 0 && (
                <select
                  name="nextStage"
                  value={form.nextStage}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded p-2"
                  required
                >
                  <option value="" disabled>
                    Select Next Stage
                  </option>
                  {nextStageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <textarea
            name="remarks"
            placeholder="Remarks"
            value={form.remarks}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded p-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-4 py-2 rounded text-white transition-all duration-200 ${
              type === "approve" 
                ? submitting 
                  ? "bg-green-400 cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-700" 
                : submitting 
                  ? "bg-red-400 cursor-not-allowed" 
                  : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {type === "approve" ? "Approving..." : "Rejecting..."}
              </div>
            ) : (
              type === "approve" ? "Approve" : "Reject"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApprovalActionModal;
