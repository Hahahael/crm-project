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
    createdAt: "",
    requestor: "",
    refNumber: "",
    designation: "",
    departmentName: "",
    validityPeriod: "",
    dueDate: "",
    accountName: "",
    contractPeriod: "",
    industryName: "",
    designationAccount: "",
    productName: "",
    contactNumber: "",
    location: "",
    emailAddress: "",
    address: "",
    buyerInCharge: "",
    trunkline: "",
    contractNumber: "",
    process: "",
    emailAddressBuyer: "",
    machines: "",
    reasonToApply: "",
    automotiveSection: "",
    sourceOfInquiry: "",
    commodity: "",
    businessActivity: "",
    model: "",
    annualTargetSales: "",
    population: "",
    sourceOfTarget: "",
    existingBellows: "",
    productsToOrder: "",
    modelUnder: "",
    targetAreas: "",
    analysis: "",
    fromDate: "",
    toDate: "",
    activityPeriod: "",
    preparedBy: "",
    notedBy: "",
    approvedBy: "",
    receivedBy: "",
    acknowledgedBy: "",
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
                <label className="text-sm font-medium" htmlFor="createdAt">
                  Date Created
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                  id="createdAt"
                  type="text"
                  name="createdAt"
                  value={utils.formatDate(formData.createdAt, "MM/DD/YYYY")}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="requestBy">
                  Requestor
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                  id="requestBy"
                  type="text"
                  name="requestBy"
                  value={formData.preparedBy}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="ref_number">
                  Ref #
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
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
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="designation"
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="departmentName">
                  Department
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                  id="departmentName"
                  type="text"
                  name="departmentName"
                  value={formData.department?.Department}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="validityPeriod">
                  Validity Period
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="validityPeriod"
                  type="text"
                  name="validityPeriod"
                  value={formData.validityPeriod}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="dueDate">
                  Due Date
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                  id="dueDate"
                  type="text"
                  name="dueDate"
                  value={
                    utils.formatDate(formData.dueDate, "MM/DD/YYYY") || "-"
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
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                  id="doneDate"
                  type="text"
                  name="doneDate"
                  value={
                    utils.formatDate(formData.doneDate, "MM/DD/YYYY") || "-"
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
                <label className="text-sm font-medium" htmlFor="accountName">
                  Account
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 bg-gray-50 text-gray-600"
                  id="accountName"
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contractPeriod">
                  Contract Period
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="contractPeriod"
                  type="text"
                  name="contractPeriod"
                  value={formData.contractPeriod}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="industryName">
                  Industry
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                  id="industryName"
                  type="text"
                  name="industryName"
                  value={formData.industry?.Code}
                  readOnly
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="designationAccount"
                >
                  Designation
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="designationAccount"
                  type="text"
                  name="designationAccount"
                  value={formData.designationAccount}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="productName"
                >
                  Product
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                  id="productName"
                  type="text"
                  name="productName"
                  value={formData.brand?.Description}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contactNumber">
                  Contact No.
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="contactNumber"
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="location">
                  Location
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="location"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="emailAddress">
                  Email Address
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="emailAddress"
                  type="email"
                  name="emailAddress"
                  value={formData.emailAddress}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="address">
                  Address
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="buyerInCharge">
                  Buyer Incharge
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="buyerInCharge"
                  type="text"
                  name="buyerInCharge"
                  value={formData.buyerInCharge}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="trunkline">
                  Trunkline
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="trunkline"
                  type="text"
                  name="trunkline"
                  value={formData.trunkline}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contractNumber">
                  Contract No
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="contractNumber"
                  type="text"
                  name="contractNumber"
                  value={formData.contractNumber}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="process">
                  Process
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
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
                  htmlFor="emailAddressBuyer"
                >
                  Email Address
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="emailAddressBuyer"
                  type="text"
                  name="emailAddressBuyer"
                  value={formData.emailAddressBuyer}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="machines">
                  Machines
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
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
                <label className="text-sm font-medium" htmlFor="reasonToApply">
                  Reason to Apply
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="reasonToApply"
                  type="text"
                  name="reasonToApply"
                  value={formData.reasonToApply}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="automotiveSection"
                >
                  Automotive Section
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="automotiveSection"
                  type="text"
                  name="automotiveSection"
                  value={formData.automotiveSection}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="sourceOfInquiry"
                >
                  Source of Inquiry
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="sourceOfInquiry"
                  type="text"
                  name="sourceOfInquiry"
                  value={formData.sourceOfInquiry}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="commodity">
                  Commodity
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
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
                  htmlFor="businessActivity"
                >
                  Business Activity
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="businessActivity"
                  type="text"
                  name="businessActivity"
                  value={formData.businessActivity}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="model">
                  Model
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
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
                  htmlFor="annualTargetSales"
                >
                  Annual Target Sales
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="annualTargetSales"
                  type="text"
                  name="annualTargetSales"
                  value={formData.annualTargetSales}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="population">
                  Population
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="population"
                  type="text"
                  name="population"
                  value={formData.population}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="sourceOfTarget">
                  Source of Target
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="sourceOfTarget"
                  type="text"
                  name="sourceOfTarget"
                  value={formData.sourceOfTarget}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="existingBellows">
                  Existing Bellow
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="existingBellows"
                  type="text"
                  name="existingBellows"
                  value={formData.existingBellows}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="productsToOrder"
                >
                  Products to Order
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="productsToOrder"
                  type="text"
                  name="productsToOrder"
                  value={formData.productsToOrder}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="modelUnder">
                  Model Under
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="modelUnder"
                  type="text"
                  name="modelUnder"
                  value={formData.modelUnder}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="targetAreas">
                  Target Areas
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="targetAreas"
                  type="text"
                  name="targetAreas"
                  value={formData.targetAreas}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="additional">
                  Additional
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
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
                className="flex h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
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
                <label className="text-sm font-medium" htmlFor="fromTime">
                  From
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="fromTime"
                  type="time"
                  name="fromTime"
                  value={formData.fromTime}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="toTime">
                  To
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="toTime"
                  type="time"
                  name="toTime"
                  value={formData.toTime}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="activityPeriod">
                  Activity Period
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm"
                  id="activityPeriod"
                  type="text"
                  name="activityPeriod"
                  value={formData.activityPeriod}
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
              <label className="text-sm font-medium" htmlFor="preparedBy">
                Prepared by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                id="preparedBy"
                type="text"
                name="preparedBy"
                value={formData.preparedBy}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="notedBy">
                Noted by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                id="notedBy"
                type="text"
                name="notedBy"
                value={formData.notedBy}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="approvedBy">
                Approved by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                id="approvedBy"
                type="text"
                name="approvedBy"
                value={formData.approvedBy}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="receivedBy">
                Received by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                id="receivedBy"
                type="text"
                name="receivedBy"
                value={formData.receivedBy}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="acknowledgedBy">
                Acknowledge Approved by
              </label>
              <input
                className="flex h-9 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm bg-gray-50 text-gray-600"
                id="acknowledgedBy"
                type="text"
                name="acknowledgedBy"
                value={formData.acknowledgedBy}
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
