import { useState, useEffect, useRef } from "react";
import {
  LuArrowLeft,
  LuCheck,
  LuFile,
  LuPlus,
  LuSave,
  LuUpload,
  LuX,
  LuTrash,
} from "react-icons/lu";
import { apiBackendFetch } from "../services/api";

const TechnicalForm = ({
  technicalReco,
  mode,
  onSave,
  onBack,
  onSubmitForApproval,
}) => {
  const [errors, setErrors] = useState({});
  const [trProducts, setTrProducts] = useState([]);
  const [attachments, setAttachments] = useState([]);
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

  const onProductChange = (productId, field, value) => {
    setTrProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId ? { ...product, [field]: value } : product,
      ),
    );
    console.log(trProducts);
  };

  const onRemoveProduct = (productId) => {
    setTrProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId));
  };

  const onAddProduct = () => {
    const tempId = nextTempIdRef.current--;
    const newProduct = {
      id: tempId,
      productName: "",
      correctedPartNo: "",
      description: "",
      brand: "",
      unitOm: "",
    };
    setTrProducts((prevProducts) => [...prevProducts, newProduct]);
  };

  // Clear product recommendation error as soon as there's at least one product
  useEffect(() => {
    if (trProducts && trProducts.length > 0 && errors?.products) {
      setErrors((prev) => {
        const copy = { ...(prev || {}) };
        delete copy.products;
        return copy;
      });
    }
  }, [trProducts, errors]);

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
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.rows)
            ? data.rows
            : [];


        const normalized = rows.map((s) => ({
          // keep original MSSQL keys but add unified camel/id fields
          ...s,
          id: s.Id ?? s.id,
          Description:  `${s.Code} ${s.CustomerPartNumberSubCode??' '}|${s.Description}` ?? s.Description ?? s.description ?? s.Code ?? s.code ?? "",
          Code: s.Code ?? s.code ?? s.CustomerPartNumberSubCode ?? "",
          LocalPrice: s.LocalPrice ?? s.localPrice ?? s.Price ?? null,
          name:
            s.Name ??
            s.name ??
            s.Description ??
            s.description ??
            s.Code ??
            s.code ??
            `${s.CustomerPartNumberSubCode}-${s.Description}` ??
            "",
          description: s.Description ?? s.description ?? s.Code ?? s.code ?? s.Description ?? "",
        }));
        console.log("Productlist, normalized:", normalized);
        setItemsList(normalized);
      } catch (err) {
        console.error("Failed to fetch items", err);
      }
    };

    fetchUsers();
    fetchItems();
  }, []);

  // filter users by search
  const _filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
      // 🟢 If technicalReco has products, populate them into trProducts
      if (technicalReco.products && Array.isArray(technicalReco.products)) {
        console.log("📦 Loading", technicalReco.products.length, "existing products into form");
        setTrProducts(
          technicalReco.products.map((product) => ({
            id: product.id ?? nextTempIdRef.current--, // fallback if no id
            productName: product.product_name ?? product.productName ?? "",
            correctedPartNo: product.corrected_part_no ?? product.correctedPartNo ?? "",
            description: product.description ?? "",
            brand: product.brand ?? "",
            unitOm: product.unit_om ?? product.unitOm ?? "",
          })),
        );
        console.log("✅ Products loaded into form state");
      } else {
        console.log("ℹ️ No products found in technicalReco");
      }
      
      // Initialize attachments if they exist
      if (technicalReco.attachments && Array.isArray(technicalReco.attachments)) {
        const existingAttachments = technicalReco.attachments.map((att) => ({
          id: att.Id || att.id,
          name: att.FileName || att.filename || att.name,
          size: att.FileSize || att.file_size || att.size,
          type: att.FileType || att.file_type || att.type,
          uploaded: true,
          uploading: false,
          isExisting: true, // Flag to distinguish existing vs new files
          uploaded_at: att.UploadDate || att.uploaded_at,
          // Note: We don't store the actual file data in state for existing files
          // They will be loaded from the server when needed
        }));
        setAttachments(existingAttachments);
        console.log(`📁 Loaded ${existingAttachments.length} existing attachments`);
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
    if (!formData.title || formData.title.toString().trim() === "")
      err.title = "Title is required.";
    if (
      !formData.contactPerson ||
      formData.contactPerson.toString().trim() === ""
    )
      err.contactPerson = "Contact person is required.";
    if (!formData.contactEmail || !/^\S+@\S+\.\S+$/.test(formData.contactEmail))
      err.contactEmail = "A valid contact email is required.";
    if (
      !formData.contactNumber ||
      formData.contactNumber.toString().trim().length < 7
    )
      err.contactNumber = "A valid contact phone is required.";
    if (
      !formData.currentSystem ||
      formData.currentSystem.toString().trim() === ""
    )
      err.currentSystem = "Current system is required.";
    if (
      !formData.currentSystemIssues ||
      formData.currentSystemIssues.toString().trim() === ""
    )
      err.currentSystemIssues = "System issues are required.";
    if (
      !formData.proposedSolution ||
      formData.proposedSolution.toString().trim() === ""
    )
      err.proposedSolution = "Proposed solution is required.";
    if (
      !formData.technicalJustification ||
      formData.technicalJustification.toString().trim() === ""
    )
      err.technicalJustification = "Technical justification is required.";
    // products: use trProducts as product recommendations
    if (!trProducts || !Array.isArray(trProducts) || trProducts.length === 0)
      err.products = "At least one product recommendation is required.";

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

    // Convert empty optional fields to null and include trItems and attachments
    const cleanedFormData = {
      ...formData,
      installationRequirements: formData.installationRequirements || null,
      trainingRequirements: formData.trainingRequirements || null,
      maintenanceRequirements: formData.maintenanceRequirements || null,
      additionalNotes: formData.additionalNotes || null,
      products: trProducts,
      attachments: attachments.filter(att => att.uploaded), // Only include successfully uploaded files
    };

    setErrors({});
    
    // If there are new files to upload, include them in the cleaned data
    const newFiles = attachments.filter(att => att.uploaded && att.base64);
    if (newFiles.length > 0) {
      cleanedFormData.newAttachments = newFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        base64: file.base64
      }));
    }
    
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
      products: trProducts,
    };
    if (onSubmitForApproval) {
      onSubmitForApproval(cleanedFormData, mode);
    }
  };

  // Remove the dropdown close handler since we no longer need it for manual input
  // Products are now manually entered, no dropdown needed
  useEffect(() => {
    // Placeholder for future product-related effects if needed
  }, [trProducts]);

  // File upload functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: `File "${file.name}" is too large. Maximum size is 10MB.` };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `File "${file.name}" has an unsupported format.` };
    }

    return { valid: true };
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        continue;
      }

      // Check if file already exists
      if (attachments.find(att => att.name === file.name && att.size === file.size)) {
        alert(`File "${file.name}" is already uploaded.`);
        continue;
      }

      // Add file to attachments with uploading state
      const fileObj = {
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        uploading: true,
        uploaded: false
      };

      setAttachments(prev => [...prev, fileObj]);

      try {
        // Convert file to base64 for API transmission  
        const base64 = await fileToBase64(file);
        
        // Update file status to uploaded
        setAttachments(prev => 
          prev.map(att => 
            att.name === file.name && att.size === file.size
              ? { ...att, uploading: false, uploaded: true, base64 }
              : att
          )
        );

        console.log(`File "${file.name}" processed and ready for upload`);
      } catch (error) {
        console.error('Error processing file:', error);
        // Remove file from list if processing failed
        setAttachments(prev => 
          prev.filter(att => !(att.name === file.name && att.size === file.size))
        );
        alert(`Failed to process file "${file.name}"`);
      }
    }

    // Clear the input
    event.target.value = '';
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAttachment = async (attachmentId, filename) => {
    try {
      const trId = formData.id || formData.trId;
      if (!trId) {
        alert('Cannot download file: Technical recommendation ID not found');
        return;
      }

      const response = await apiBackendFetch(
        `/api/technicals/${trId}/attachments/${attachmentId}/download`
      );

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download ${filename}`);
    }
  };

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
            {technicalReco?.trNumber
              ? `${technicalReco.trNumber}`
              : "TR# (auto-generated)"}
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
          {/* <button
            type="button"
            onClick={handleSubmitForApproval}
            className="flex border border-green-200 bg-green-500 hover:bg-green-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md items-center text-sm text-white"
          >
            <LuCheck className="mr-2" /> For Approval
          </button> */}
        </div>
      </div>
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Basic Information
            </h3>
            <p className="text-sm text-gray-500">
              Enter the basic details for this technical recommendation
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* TR Number (readonly) */}
              {formData.trNumber && (
                <div>
                  <label className="text-sm font-medium" htmlFor="trNumber">
                    TR#
                  </label>
                  <input
                    className={`col-span-5 text-sm w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-1 focus:outline-gray-200 focus:border-gray-400 text-gray-600`}
                    id="trNumber"
                    name="trNumber"
                    value={formData.trNumber}
                    readOnly
                  />
                </div>
              )}
              {/* Status */}
              <div>
                <label className="text-sm font-medium" htmlFor="status">
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
                <label className="text-sm font-medium" htmlFor="priority">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  className={`flex h-9 w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm bg-yellow-50
                                                                                ${errors?.priority ? "border-red-500" : "border-gray-200"}`}
                  onChange={handleChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                {errors?.priority && (
                  <p className="text-red-600 text-sm mt-1">{errors.priority}</p>
                )}
              </div>
            </div>
            {/* Title and Sales Lead Ref */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium" htmlFor="title">
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
                {errors?.title && (
                  <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="salesLeadRef">
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
                <label className="text-sm font-medium" htmlFor="accountId">
                  Customer Name
                </label>
                <input
                  id="accountId"
                  name="accountId"
                  value={formData.account?.kristem?.Name}
                  readOnly
                  className={`col-span-5 text-sm w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-1 focus:outline-gray-200 focus:border-gray-400 text-gray-600`}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contactPerson">
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
                {errors?.contactPerson && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.contactPerson}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contactEmail">
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
                {errors?.contactEmail && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.contactEmail}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="contactNumber">
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
                {errors?.contactNumber && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.contactNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Technical Details
            </h3>
            <p className="text-sm text-gray-500">
              Provide information about the current system and proposed solution
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="currentSystem">
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
              {errors?.currentSystem && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.currentSystem}
                </p>
              )}
            </div>
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="currentSystemIssues"
              >
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
              {errors?.currentSystemIssues && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.currentSystemIssues}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="proposedSolution">
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
              {errors?.proposedSolution && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.proposedSolution}
                </p>
              )}
            </div>
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="technicalJustification"
              >
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
              {errors?.technicalJustification && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.technicalJustification}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Product Recommendations */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Product Recommendations
            </h3>
            <p className="text-sm text-gray-500">
              Specify the products recommended for this solution
            </p>
            {errors?.products && (
              <p className="text-red-600 text-sm mt-1 mb-2">
                {errors.products}
              </p>
            )}
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="rounded-md border border-gray-200">
              <div className="relative w-full overflow-overlay">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="border-b border-gray-200">
                    <tr className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Product Name
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Corrected Part No.
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Description
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Brand
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Unit of Measure
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {trProducts?.map((product, index) => (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-100 transition-all duration-200"
                      >
                        <td className="text-sm p-2 align-middle">
                          <input
                            type="text"
                            value={product.productName || ""}
                            onChange={(e) => {
                              onProductChange(
                                product.id,
                                "productName",
                                e.target.value,
                              );
                            }}
                            placeholder="Enter product name"
                            className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                            autoComplete="off"
                          />
                        </td>
                        <td className="text-sm p-2 align-middle">
                          <input
                            type="text"
                            value={product.correctedPartNo || ""}
                            onChange={(e) => {
                              onProductChange(
                                product.id,
                                "correctedPartNo",
                                e.target.value,
                              );
                            }}
                            placeholder="Enter part number"
                            className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                          />
                        </td>
                        <td className="text-sm p-2 align-middle">
                          <input
                            type="text"
                            value={product.description || ""}
                            onChange={(e) => {
                              onProductChange(
                                product.id,
                                "description",
                                e.target.value,
                              );
                            }}
                            placeholder="Enter description"
                            className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                          />
                        </td>
                        <td className="text-sm p-2 align-middle">
                          <input
                            type="text"
                            value={product.brand || ""}
                            onChange={(e) => {
                              onProductChange(
                                product.id,
                                "brand",
                                e.target.value,
                              );
                            }}
                            placeholder="Enter brand"
                            className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                          />
                        </td>
                        <td className="text-sm p-2 align-middle">
                          <input
                            type="text"
                            value={product.unitOm || ""}
                            onChange={(e) => {
                              onProductChange(
                                product.id,
                                "unitOm",
                                e.target.value,
                              );
                            }}
                            placeholder="e.g., PCS, SET"
                            className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                          />
                        </td>
                        <td className="text-sm p-2 align-middle">
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 text-sm"
                            onClick={() => onRemoveProduct(product.id)}
                          >
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
                onClick={onAddProduct}
              >
                <LuPlus className="mr-2" /> Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Additional Requirements */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Additional Requirements
            </h3>
            <p className="text-sm text-gray-500">
              Provide information about installation, training, and maintenance
              requirements
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="installationRequirements"
              >
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
                htmlFor="trainingRequirements"
              >
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
                htmlFor="maintenanceRequirements"
              >
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
            <h3 className="font-bold leading-none tracking-tight">
              Attachments
            </h3>
            <p className="text-sm text-gray-500">
              Upload relevant documents and files (Max 10MB per file)
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            {/* File Upload Area */}
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  // Create a fake event object for handleFileUpload
                  handleFileUpload({ target: { files, value: '' } });
                }
              }}
            >
              <input
                type="file"
                id="fileUpload"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="fileUpload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <LuUpload className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Click to upload files or drag and drop
                </span>
                <span className="text-xs text-gray-500">
                  PDF, DOC, XLS, PPT, TXT, Images (Max 10MB each)
                </span>
              </label>
            </div>

            {/* Uploaded Files List */}
            {attachments && attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Uploaded Files ({attachments.length})
                </h4>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <LuFile className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {file.type}
                            {file.isExisting && file.uploaded_at && (
                              <span> • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.uploading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                        {file.uploaded && !file.uploading && (
                          <>
                            {file.id && (
                              <button
                                type="button"
                                onClick={() => downloadAttachment(file.id, file.name)}
                                className="text-blue-500 hover:text-blue-700 transition-colors text-xs px-2 py-1 rounded border border-blue-300 hover:border-blue-500"
                              >
                                Download
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <LuX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">Notes</h3>
            <p className="text-sm text-gray-500">
              Add any additional notes or comments
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="additionalNotes"
              ></label>
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
