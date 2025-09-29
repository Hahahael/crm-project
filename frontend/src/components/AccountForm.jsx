import React from "react";

export default function AccountForm() {
  // Placeholder for form logic
  return (
    <div className="bg-gray-50 rounded shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-2">Account Form</h2>
      {/* Form will go here */}
      <form>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Account Name</label>
          <input className="border rounded px-2 py-1 w-full" type="text" name="name" />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Type</label>
          <input className="border rounded px-2 py-1 w-full" type="text" name="type" />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Status</label>
          <input className="border rounded px-2 py-1 w-full" type="text" name="status" />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">Save</button>
      </form>
    </div>
  );
}
