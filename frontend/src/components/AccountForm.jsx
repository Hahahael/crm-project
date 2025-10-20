import { useState, useEffect, useRef } from "react";
import {
  LuArrowLeft,
  LuCheck,
  LuPlus,
  LuSave,
  LuX,
  LuTrash,
} from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js";
import { items } from "../../../backend/mocks/itemsMock.js";

const AccountForm = ({
  account,
  mode,
  onSave,
  onBack,
  onSubmitForApproval,
}) => {
  const [errors, setErrors] = useState(null);
  const [itemsList, setItemsList] = useState([{}]);
  const [trItems, setTrItems] = useState([]);
  const [formData, setFormData] = useState({
    created_at: "",
    requestor: "Draft",
    ref_number: "Medium",
    designation: "",
    department_name: "",
    validity_period: "",
    due_date: "",
    account_name: "",
    contract_period: "",
    industry_name: "",
    designation_account: "",
    product_name: "",
    contract_number: "",
    location: "",
    email_address: "",
    address: "",
    buyer_incharge: "",
    trunkline: "",
    contract_number: "",
    process: "",
    email_address_buyer: "",
    machines: "",
    reason_to_apply: "",
    automotive_section: "",
    source_of_inquiry: "",
    commodity: "",
    business_activity: "",
    model: "",
    annual_target_sales: "",
    population: "",
    source_of_target: "",
    existing_bellows: "",
    products_to_order: "",
    model_under: "",
    target_areas: "",
    analysis: "",
    from_date: "",
    to_date: "",
    activity_period: "",
    perpared_by: "",
    noted_by: "",
    approved_by: "",
    received_by: "",
    acknowledged_by: "",
    ...account,
  });

  const handleChange = (e) => {
    console.log("Handle change event:", e);
    const { name, value, type, checked } = e.target;
    console.log("Handle change:", { name, value, type, checked });
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  // 🔹 user search state
  const [users, setUsers] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Destructure optional + WO number
    const {
      products,
      trNumber,
      installationRequirements,
      trainingRequirements,
      maintenanceRequirements,
      attachments,
      additionalNotes,
      ...requiredFields
    } = formData;

    // Find missing required fields
    // const missing = Object.entries(requiredFields).filter(([, value]) => value === "" || value === null || value === undefined);

    // console.log("Missing fields:", missing);

    // if (missing.length > 0) {
    //     // Mark missing fields as errors
    //     const newErrors = {};
    //     missing.forEach(([key]) => {
    //         newErrors[key] = true;
    //     });
    //     setErrors(newErrors);
    //     return;
    // }

    console.log("Form data is valid, submitting:", formData);

    // ✅ Reset errors if all fields are valid
    setErrors({});

    // ✅ Convert empty optional fields to null
    const cleanedFormData = {
      ...formData,
      installationRequirements: formData.installationRequirements || null,
      trainingRequirements: formData.trainingRequirements || null,
      maintenanceRequirements: formData.maintenanceRequirements || null,
      additionalNotes: formData.additionalNotes || null,
      items: trItems,
    };

    onSave(cleanedFormData, mode);
  };

  // Handler for submitting for approval
  const handleSubmitForApproval = async (e) => {
    e.preventDefault();
    // Validate required fields as in handleSubmit
    const {
      products,
      trNumber,
      installationRequirements,
      trainingRequirements,
      maintenanceRequirements,
      attachments,
      additionalNotes,
      trItems,
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
      status: "Submitted",
      installationRequirements: formData.installationRequirements || null,
      trainingRequirements: formData.trainingRequirements || null,
      maintenanceRequirements: formData.maintenanceRequirements || null,
      additionalNotes: formData.additionalNotes || null,
      items: trItems,
    };
    console.log(trItems);
    if (onSubmitForApproval) {
      onSubmitForApproval(cleanedFormData, mode);
    }
  };

  // Add a ref for dropdown
  const dropdownRefs = useRef({});

  // Close dropdown on outside click for product name dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      setTrItems((prevItems) =>
        prevItems.map((item) => {
          const ref = dropdownRefs.current[item.id];
          if (item.showDropdown && ref && !ref.contains(e.target)) {
            return { ...item, showDropdown: false };
          }
          return item;
        }),
      );
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [trItems]);

  return (
    <form onSubmit={handleSubmit} className="h-full w-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={onBack}
            className="mr-4 hover:text-gray-900 transition-all duration-150 flex align-middle text-gray-500 text-base cursor-pointer"
          >
            <LuArrowLeft className="my-auto text-lg" />
            &nbsp;Back to Technical Recommendation Details
          </button>
          <h1 className="text-2xl font-bold">
            {mode === "edit"
              ? "Edit Technical Recommendation"
              : "New Technical Recommendation"}
          </h1>
          <h2 className="text-lg text-gray-500">
            `${account.kristem?.Code}`
          </h2>
          <h2 className="text-sm text-gray-500">
            {mode === "edit"
              ? "Update the technical recommendation details below."
              : "Create a new Technical Recommendation"}
          </h2>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex border border-red-200 bg-red-400 hover:bg-red-500 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white"
          >
            <LuX className="mr-2" /> Cancel
          </button>
          <button
            type="submit"
            className="flex border border-blue-200 bg-blue-500 hover:bg-blue-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white"
          >
            <LuSave className="mr-2" /> Save
          </button>
          <button
            type="button"
            onClick={handleSubmitForApproval}
            className="flex border border-green-200 bg-green-500 hover:bg-green-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white"
          >
            <LuCheck className="mr-2" /> For Approval
          </button>
        </div>
      </div>
      <div className="space-y-6 pb-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Requestor Details
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium" htmlFor="created_at">
                  Date
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="created_at"
                  type="text"
                  name="created_at"
                  value={utils.formatDate(formData.created_at, "DD/MM/YYYY")}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="requestBy">
                  Requestor
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="requestBy"
                  type="text"
                  name="requestBy"
                  value={formData.requested_by}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="ref_number">
                  Ref #
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="ref_number"
                  type="text"
                  name="ref_number"
                  value={formData.kristem?.Code}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="designation">
                  Designation
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="designation"
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="department_name">
                  Department
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="department_name"
                  type="text"
                  name="department_name"
                  value={formData.department?.Department}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="validity_period">
                  Validity Period
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="validity_period"
                  type="text"
                  name="validity_period"
                  value={formData.validity_period}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="due_date">
                  Due Date
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="due_date"
                  type="text"
                  name="due_date"
                  value={
                    utils.formatDate(formData.due_date, "DD/MM/YYYY") || "-"
                  }
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="doneDate">
                  Done Date
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="doneDate"
                  type="text"
                  name="doneDate"
                  value={
                    utils.formatDate(formData.doneDate, "DD/MM/YYYY") || "-"
                  }
                  onChange={handleChange}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Account Details
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium" htmlFor="account_name">
                  Account
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="account_name"
                  type="text"
                  name="account_name"
                  value={formData.account_name}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contract_period">
                  Contract Period
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="contract_period"
                  type="text"
                  name="contract_period"
                  value={formData.contract_period}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="industry_name">
                  Industry
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="industry_name"
                  type="text"
                  name="industry_name"
                  value={formData.industry?.Code}
                  readOnly
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="designation_account"
                >
                  Designation
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="designation_account"
                  type="text"
                  name="designation_account"
                  value={formData.designation_account}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="product_name"
                >
                  Product
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="product_name"
                  type="text"
                  name="product_name"
                  value={formData.brand?.Description}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contract_number">
                  Contact No.
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="contract_number"
                  type="text"
                  name="contract_number"
                  value={formData.contract_number}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="location">
                  Location
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="location"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="email_address">
                  Email Address
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="email_address"
                  type="email"
                  name="email_address"
                  value={formData.email_address}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="address">
                  Address
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="buyer_incharge">
                  Buyer Incharge
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="buyer_incharge"
                  type="text"
                  name="buyer_incharge"
                  value={formData.buyer_incharge}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="trunkline">
                  Trunkline
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="trunkline"
                  type="text"
                  name="trunkline"
                  value={formData.trunkline}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contract_number">
                  Contract No
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="contract_number"
                  type="text"
                  name="contract_number"
                  value={formData.contract_number}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="process">
                  Process
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="process"
                  type="text"
                  name="process"
                  value={formData.process}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="email_address_buyer"
                >
                  Email Address
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="email_address_buyer"
                  type="text"
                  name="email_address_buyer"
                  value={formData.email_address_buyer}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="machines">
                  Machines
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="machines"
                  type="text"
                  name="machines"
                  value={formData.machines}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Justification
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium" htmlFor="reason_to_apply">
                  Reason to Apply
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="reason_to_apply"
                  type="text"
                  name="reason_to_apply"
                  value={formData.reason_to_apply}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="automotive_section"
                >
                  Automotive Section
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="automotive_section"
                  type="text"
                  name="automotive_section"
                  value={formData.automotive_section}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="source_of_inquiry"
                >
                  Source of Inquiry
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="source_of_inquiry"
                  type="text"
                  name="source_of_inquiry"
                  value={formData.source_of_inquiry}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="commodity">
                  Commodity
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="commodity"
                  type="text"
                  name="commodity"
                  value={formData.commodity}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="business_activity"
                >
                  Business Activity
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="business_activity"
                  type="text"
                  name="business_activity"
                  value={formData.business_activity}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="model">
                  Model
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="model"
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="annual_target_sales"
                >
                  Annual Target Sales
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="annual_target_sales"
                  type="text"
                  name="annual_target_sales"
                  value={formData.annual_target_sales}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="population">
                  Population
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="population"
                  type="text"
                  name="population"
                  value={formData.population}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="source_of_target">
                  Source of Target
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="source_of_target"
                  type="text"
                  name="source_of_target"
                  value={formData.source_of_target}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="existingBellow">
                  Existing Bellow
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="existingBellow"
                  type="text"
                  name="existingBellow"
                  value={formData.existingBellow}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="products_to_order"
                >
                  Products to Order
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="products_to_order"
                  type="text"
                  name="products_to_order"
                  value={formData.products_to_order}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="model_under">
                  Model Under
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="model_under"
                  type="text"
                  name="model_under"
                  value={formData.model_under}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="target_areas">
                  Target Areas
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="target_areas"
                  type="text"
                  name="target_areas"
                  value={formData.target_areas}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="additional">
                  Additional
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="additional"
                  type="text"
                  name="additional"
                  value={formData.additional}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="analysis">
                Analysis
              </label>
              <textarea
                className="flex h-24 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                id="analysis"
                name="analysis"
                value={formData.analysis}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Requestor Details
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium" htmlFor="from">
                  From
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="from"
                  type="time"
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="to">
                  To
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="to"
                  type="time"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="activity_period">
                  Activity Period
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                  id="activity_period"
                  type="text"
                  name="activity_period"
                  value={formData.activity_period}
                  onChange={handleChange}
                />
              </div>
            </div>
            {/* <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="w-full overflow-auto">
                                <table className="min-w-full border-collapse text-left text-sm">
                                    <thead className="bg-blue-800 text-white">
                                        <tr>
                                            <th className="p-2 font-normal">Working Week</th>
                                            <th className="p-2 font-normal">Update</th>
                                            <th className="p-2 font-normal">Probability</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {workWeeks && workWeeks.length > 0 ? (
                                            workWeeks.map((week, index) => (
                                                <tr key={index} className="hover:bg-gray-100 transition-all duration-200">
                                                    <td className="text-sm p-2 align-middle">{week.name}</td>
                                                    <td className="text-sm p-2 align-middle">{week.update}</td>
                                                    <td className="text-sm p-2 align-middle">{week.probability}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="p-2 text-center text-gray-500 border-b border-gray-200">
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="w-full overflow-auto">
                                <table className="min-w-full border-collapse text-left text-sm">
                                    <thead className="bg-blue-800 text-white">
                                        <tr>
                                            <th className="p-2 font-normal">Working Week</th>
                                            <th className="p-2 font-normal">Update</th>
                                            <th className="p-2 font-normal">Probability</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {workWeeks && workWeeks.length > 0 ? (
                                            workWeeks.map((week, index) => (
                                                <tr key={index} className="hover:bg-gray-100 transition-all duration-200">
                                                    <td className="text-sm p-2 align-middle">{week.name}</td>
                                                    <td className="text-sm p-2 align-middle">{week.update}</td>
                                                    <td className="text-sm p-2 align-middle">{week.probability}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="p-2 text-center text-gray-500 border-b border-gray-200">
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div> */}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-sm">
            I hereby certify that all information declared are true and correct.
            I provided my commitment based on my deep analysis.
          </p>
          <p className="text-sm">
            I understand that failure to generate sales output within the
            validity period will forfeit this application.
          </p>
          <p className="text-sm">
            I also understand that the management has the right to re-assess the
            applied account should I fail to perform within the agreed period to
            perform.
          </p>
          <p className="text-sm">
            I further understand that this account will be assigned to me only
            after it has been properly endorsed by my immediate supervisor and
            unless approved by the president.
          </p>
          <p className="text-sm">
            I hereby confirm this account under my area of responsibility. I am
            in-charge of all table to affiliated concerns.
          </p>
          <p className="text-sm">
            I commit to provide excellent customer service which serves as a
            factor for a continuous good business relationship with this
            account.
          </p>
        </div>

        {/* Approval Information */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Approval Information
            </h3>
          </div>
          <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium" htmlFor="approved_by">
                Prepared by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                id="approved_by"
                type="text"
                name="approved_by"
                value={formData.createdBy}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="noted_by">
                Noted by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                id="noted_by"
                type="text"
                name="noted_by"
                value={formData.noted_by}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="approved_by">
                Approved by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                id="approved_by"
                type="text"
                name="approved_by"
                value={formData.approved_by}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="received_by">
                Received by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                id="received_by"
                type="text"
                name="received_by"
                value={formData.received_by}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="acknowledged_by">
                Acknowledge Approved by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50"
                id="acknowledged_by"
                type="text"
                name="acknowledged_by"
                value={formData.acknowledged_by}
                onChange={handleChange}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AccountForm;
