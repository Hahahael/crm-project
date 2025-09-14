import { useState, useEffect } from "react";
import { LuArrowLeft, LuCheck, LuX } from "react-icons/lu";

const WorkOrderForm = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    woNumber: "",
    workDescription: "",
    assignee: "",
    department: "",
    account: "",
    isNewAccount: false,
    industry: "",
    mode: "",
    productBrand: "",
    contactPerson: "",
    contactNumber: "",
    fsl: false,
    esl: false,
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

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="h-full w-full p-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="mr-4 rounded px-2 py-2 font-medium hover:bg-gray-100 transition-all duration-150 flex align-middle border border-gray-200"
        >
          <LuArrowLeft className="my-auto text-lg" />
        </button>
        <h1 className="text-2xl font-bold">
          {initialData ? "Edit Work Order" : "New Work Order"}
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
            onClick={onCancel}
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
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">WO#</label>
              <input
                type="text"
                name="woNumber"
                value={formData.woNumber}
                onChange={handleChange}
                className="col-span-5 w-full rounded-md border border-gray-200 px-3 py-2"
                placeholder="WO-2025-0001"
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
                className="col-span-5 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Assignee + Dept */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Assignee</label>
              <input
                type="text"
                name="assignee"
                value={formData.assignee}
                onChange={handleChange}
                className="col-span-2 w-full rounded-md border border-gray-200 px-3 py-2"
              />
              <label className="text-sm text-right my-auto">Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="col-span-2 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Account + New Flag */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Account</label>
              <input
                type="text"
                name="account"
                value={formData.account}
                onChange={handleChange}
                className="col-span-4 w-full rounded-md border border-gray-200 px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isNewAccount"
                  checked={formData.isNewAccount}
                  onChange={handleChange}
                  className="h-4 w-4 border border-gray-400 rounded"
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
              <label className="text-sm text-right my-auto">Product/Brand</label>
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
              <label className="text-sm text-right my-auto">Contact Person</label>
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
              <label className="text-sm text-right my-auto">Contact Number</label>
              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="col-span-5 w-full rounded-md border border-gray-200 px-3 py-2"
              />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-y-5">
            {/* FSL / ESL checkboxes */}
            <div className="flex items-center justify-end gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="fsl"
                  checked={formData.fsl}
                  onChange={handleChange}
                  className="h-4 w-4 border border-gray-400 rounded"
                />
                <span className="text-sm">FSL</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="esl"
                  checked={formData.esl}
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
                value={formData.woDate}
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
                value={formData.dueDate}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* From Time */}
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

            {/* To Time */}
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

            {/* Actual Date */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Actual Date</label>
              <input
                type="date"
                name="actualDate"
                value={formData.actualDate}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Actual From Time */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Actual From</label>
              <input
                type="time"
                name="actualFromTime"
                value={formData.actualFromTime}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>

            {/* Actual To Time */}
            <div className="grid grid-cols-6 gap-x-4">
              <label className="text-sm text-right my-auto">Actual To</label>
              <input
                type="time"
                name="actualToTime"
                value={formData.actualToTime}
                onChange={handleChange}
                className="col-span-5 rounded-md border border-gray-200 px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Long Texts */}
        <div className="mt-6 space-y-4">
          {/* Objective */}
          <div className="grid grid-cols-6 gap-4">
            <label className="text-sm text-right my-auto">Objective</label>
            <textarea
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              className="col-span-5 min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          {/* Instruction */}
          <div className="grid grid-cols-6 gap-4">
            <label className="text-sm text-right my-auto">Instruction</label>
            <textarea
              name="instruction"
              value={formData.instruction}
              onChange={handleChange}
              className="col-span-5 min-h-[80px] rounded-md border border-gray-200 px-3 py-2"
            />
          </div>

          {/* Target Output */}
          <div className="grid grid-cols-6 gap-4">
            <label className="text-sm text-right my-auto">Target Output</label>
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
