import { useState, useEffect } from "react";

const ApprovalActionModal = ({ isOpen, type, approval, onClose, onSubmit }) => {
    console
    const [form, setForm] = useState({
        assignee: 1,
        dueDate: "10/10/2025",
        fromTime: "09:00",
        toTime: "17:00",
        remarks: "",
        nextStage: "",
    });

    useEffect(() => {
        if (isOpen) {
            setForm({ assignee: 1, dueDate: "10/10/2025", fromTime: "09:00", toTime: "17:00", remarks: "", nextStage: "" });
        }
    }, [isOpen]);

    // Determine dropdown options
    let nextStageOptions = [];
    if (approval) {
        if (approval.stage_name === "Sales Lead" || approval.module === "sales_lead") {
            nextStageOptions = [
                { value: "Technical Recommendation", label: "Technical Recommendation" },
                { value: "RFQ", label: "RFQ" },
            ];
        } else if (approval.stage_name === "Technical Recommendation" || approval.module === "technical_recommendation") {
            nextStageOptions = [{ value: "RFQ", label: "RFQ" }];
            // Check isNew flag on referenced work order
            if (approval.wo_id && approval.isNew) {
                nextStageOptions.push({ value: "NAEF", label: "NAEF" });
            } else {
                nextStageOptions.push({ value: "Quotations", label: "Quotations" });
            }
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: name === "assignee" ? Number(value) : value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 transition-opacity duration-300">
            <form
                className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md transform transition-all duration-300 scale-100 opacity-100"
                onSubmit={handleSubmit}>
                <h2 className="text-xl font-bold mb-4">{type === "approve" ? "Approve" : "Reject"} Stage</h2>
                <div className="space-y-3">
                    <input
                        name="assignee"
                        type="number"
                        placeholder="Assignee (User ID)"
                        value={form.assignee}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        required
                    />
                    <input
                        name="dueDate"
                        type="date"
                        placeholder="Due Date"
                        value={form.dueDate}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        required
                    />
                    <input
                        name="fromTime"
                        type="time"
                        placeholder="From Time"
                        value={form.fromTime}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        required
                    />
                    <input
                        name="toTime"
                        type="time"
                        placeholder="To Time"
                        value={form.toTime}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        required
                    />
                    {/* Conditional dropdown for next stage */}
                    {nextStageOptions.length > 0 && (
                        <select
                            name="nextStage"
                            value={form.nextStage}
                            onChange={handleChange}
                            className="w-full border rounded p-2"
                            required>
                            <option
                                value=""
                                disabled>
                                Select Next Stage
                            </option>
                            {nextStageOptions.map((opt) => (
                                <option
                                    key={opt.value}
                                    value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}
                    <textarea
                        name="remarks"
                        placeholder="Remarks"
                        value={form.remarks}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        className="px-4 py-2 rounded bg-gray-200"
                        onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`px-4 py-2 rounded text-white ${type === "approve" ? "bg-green-600" : "bg-red-600"}`}>
                        {type === "approve" ? "Approve" : "Reject"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ApprovalActionModal;
