import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { apiBackendFetch } from "../services/api.js";

const NewItemModal = ({ isOpen, onClose, item, onSave, mode = "edit" }) => {
  const [visible, setVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    correctedPartNo: "",
    description: "",
    correctedDescription: "",
    brand: "",
    unitOm: "",
    vendor: "",
    stockType: "",
    supplyType: "",
    weight: "",
    moq: "",
    moqBy: "",
    isActive: true,
    isCommon: false,
    buyPrice: "",
    sellingPrice: "",
  });

  const [errors, setErrors] = useState({});

  // Lookup data for dropdowns
  const [brands, setBrands] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [stockTypes, setStockTypes] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const isViewMode = mode === "view";

  // Helper to get input props based on mode
  const getInputProps = (fieldName, baseClassName = "w-full rounded border px-3 py-2 text-sm") => ({
    readOnly: isViewMode,
    className: isViewMode
      ? `${baseClassName} bg-gray-50 cursor-default border-gray-300`
      : `${baseClassName} ${errors[fieldName] ? "border-red-300" : "border-gray-300"}`,
  });

  useEffect(() => {
    if (isOpen && item) {
      // Pre-fill form with existing item data directly
      // For Brand/UOM/StockType: prefer the ID (for dropdown matching), fall back to description string
      const brandVal = item.brand_details?.ID || item.details?.BRAND_ID || item.brandId || item.brand_id || item.brand || "";
      const uomVal = item.uom_details?.Id || item.details?.SK_UOM || item.uomId || item.uom_id || item.unitOm || item.unit_om || "";
      const stockTypeVal = item.stockType_details?.Id || item.details?.Stock_Type_Id || item.stockTypeId || item.stock_type_id || item.stockType || item.stock_type || "";
      
      setFormData({
        productName: item.details?.Description || item.productName || item.product_name || "",
        correctedPartNo: item.details?.Code || item.correctedPartNo || item.corrected_part_no || "",
        description: item.details?.Description || item.description || "",
        correctedDescription: item.correctedDescription || item.corrected_description || item.details?.custom_description || "",
        brand: String(brandVal),
        unitOm: String(uomVal),
        vendor: item.vendor || "",
        stockType: String(stockTypeVal),
        supplyType: item.category_details?.Description || item.supplyType || item.supply_type || "",
        weight: String(item.details?.weight_kg ?? item.weight ?? ""),
        moq: item.details?.MOQPurchase || item.moq || "",
        moqBy: item.details?.MOQMultiplier || item.moqBy || item.moq_by || "",
        isActive: item.details?.Status === "1" || item.isActive !== undefined ? item.isActive : item.is_active !== undefined ? item.is_active : true,
        isCommon: item.isCommon !== undefined ? item.isCommon : item.is_common !== undefined ? item.is_common : false,
        buyPrice: item.buyPrice || item.buy_price || "",
        sellingPrice: item.sellingPrice || item.selling_price || "",
      });
      setErrors({});
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        // Restore
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      };
    } else {
      setIsAnimating(false);
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Prevent scroll on window when modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    const preventScroll = (e) => {
      // Allow scroll inside modal
      const modal = document.querySelector('[role="dialog"]');
      if (modal && modal.contains(e.target)) {
        return;
      }
      e.preventDefault();
    };
    
    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [isOpen]);

  // Fetch lookup data for dropdowns when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [brandsRes, uomsRes, stockTypesRes] = await Promise.all([
          apiBackendFetch("/api/mssql/inventory/brands"),
          apiBackendFetch("/api/mssql/inventory/uoms"),
          apiBackendFetch("/api/mssql/inventory/stock-types"),
        ]);
        const [brandsData, uomsData, stockTypesData] = await Promise.all([
          brandsRes.json(),
          uomsRes.json(),
          stockTypesRes.json(),
        ]);
        if (!cancelled) {
          setBrands(brandsData.rows || []);
          setUoms(uomsData.rows || []);
          setStockTypes(stockTypesData.rows || []);
        }
      } catch (err) {
        console.error("Failed to fetch lookup data:", err);
      } finally {
        if (!cancelled) setLoadingLookups(false);
      }
    };
    fetchLookups();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Auto-fetch supply type default when stock type changes
  useEffect(() => {
    if (!formData.stockType || isViewMode) return;
    // Find the stock type ID from the selected value
    const selectedST = stockTypes.find(
      (st) => String(st.Id) === String(formData.stockType) || st.Description === formData.stockType || st.Code === formData.stockType,
    );
    const stockTypeId = selectedST?.Id;
    if (!stockTypeId) return;

    let cancelled = false;
    const fetchSupplyType = async () => {
      try {
        const res = await apiBackendFetch(`/api/mssql/inventory/supply-type/${stockTypeId}`);
        const data = await res.json();
        if (!cancelled && data.supplyType) {
          setFormData((prev) => ({ ...prev, supplyType: data.supplyType }));
        }
      } catch (err) {
        console.error("Failed to fetch supply type:", err);
      }
    };
    fetchSupplyType();
    return () => { cancelled = true; };
  }, [formData.stockType, stockTypes, isViewMode]);

  if (!isOpen && !visible) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Required fields
    if (!formData.productName.trim()) newErrors.productName = "Product name is required";
    if (!formData.correctedPartNo.trim()) newErrors.correctedPartNo = "Part number is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.correctedDescription.trim()) newErrors.correctedDescription = "Corrected description is required";
    if (!formData.brand) newErrors.brand = "Brand is required";
    if (!formData.unitOm) newErrors.unitOm = "Unit of measure is required";
    if (!formData.vendor.trim()) newErrors.vendor = "Vendor is required";
    if (!formData.stockType) newErrors.stockType = "Stock type is required";
    if (!formData.supplyType.trim()) newErrors.supplyType = "Supply type is required";
    if (!formData.weight || parseFloat(formData.weight) <= 0) newErrors.weight = "Valid weight is required";
    if (!formData.moq || parseInt(formData.moq) <= 0) newErrors.moq = "Valid MOQ is required";
    if (!formData.moqBy.trim()) newErrors.moqBy = "MOQ unit is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    console.log("🔵 [DEBUG] NewItemModal.handleSubmit START");
    console.trace("🔵 [TRACE] Modal submit stack:");

    if (!validate()) {
      console.log("🔵 [DEBUG] Validation failed, returning");
      return;
    }

    try {
      console.log("🔵 [DEBUG] Calling onSave...");
      await onSave(formData);
      console.log("🔵 [DEBUG] onSave completed successfully");
    } catch (err) {
      console.error("🔴 [ERROR] Error in modal submit:", err);
      console.trace("🔴 [TRACE] Error stack:");
    }
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay - blocks all interaction behind */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isAnimating ? "opacity-60" : "opacity-0"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Modal Centering Container - no scroll here */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal - only this scrolls */}
        <div
          role="dialog"
          aria-modal="true"
          className={`pointer-events-auto relative w-full max-w-6xl max-h-[85vh] overflow-y-auto overscroll-contain bg-white p-6 shadow-lg sm:rounded-lg transition-all duration-300 ease-in-out ${
            isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={onClose}>
            <LuX className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {/* Header */}
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              {mode === "view" ? "Item Details" : item?.setupStatus || item?.setup_status ? "Edit Item Setup" : "Setup New Item"}
            </h2>
            <p className="text-sm text-gray-500">
              {mode === "view" 
                ? "View the complete details of this item" 
                : "Configure the item details for inventory setup"}
            </p>
          </div>
          
          {/* Form fields - Scrollable */}
          <div className="space-y-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Product Name {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        name="productName"
                        value={formData.productName}
                        onChange={handleChange}
                        {...getInputProps("productName", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                    {errors.productName && !isViewMode && <p className="text-xs text-red-500 mt-1">{errors.productName}</p>}
                </div>

                {/* Corrected Part No */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Correct Part No. {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        name="correctedPartNo"
                        value={formData.correctedPartNo}
                        onChange={handleChange}
                        {...getInputProps("correctedPartNo", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                    {errors.correctedPartNo && !isViewMode && <p className="text-xs text-red-500 mt-1">{errors.correctedPartNo}</p>}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                    <label className="text-sm font-medium leading-none">
                        Description {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        readOnly={isViewMode}
                        rows={2}
                        className={`flex min-h-[60px] w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewMode ? "bg-gray-50 cursor-default border-gray-300" : errors.description ? "border-red-300" : "border-gray-300"}`}
                    />
                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                </div>

                {/* Corrected Description */}
                <div className="md:col-span-2">
                    <label className="text-sm font-medium leading-none">
                        Correct Description {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                        name="correctedDescription"
                        value={formData.correctedDescription}
                        onChange={handleChange}
                        readOnly={isViewMode}
                        rows={2}
                        className={`flex min-h-[60px] w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewMode ? "bg-gray-50 cursor-default border-gray-300" : errors.correctedDescription ? "border-red-300" : "border-gray-300"}`}
                    />
                    {errors.correctedDescription && <p className="text-xs text-red-500 mt-1">{errors.correctedDescription}</p>}
                </div>

                {/* Brand */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Brand {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <select
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        disabled={isViewMode || loadingLookups}
                        className={`flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewMode ? "bg-gray-50 cursor-default border-gray-300" : errors.brand ? "border-red-300" : "border-gray-300"}`}
                    >
                        <option value="">Select Brand...</option>
                        {brands.map((b) => (
                          <option key={b.ID} value={b.ID}>{b.Description || b.Code}</option>
                        ))}
                    </select>
                    {errors.brand && <p className="text-xs text-red-500 mt-1">{errors.brand}</p>}
                </div>

                {/* Vendor */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Vendor {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        name="vendor"
                        value={formData.vendor}
                        onChange={handleChange}
                        {...getInputProps("vendor", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                    {errors.vendor && <p className="text-xs text-red-500 mt-1">{errors.vendor}</p>}
                </div>

                {/* Stock Type */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Stock Type {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <select
                        name="stockType"
                        value={formData.stockType}
                        onChange={handleChange}
                        disabled={isViewMode || loadingLookups}
                        className={`flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewMode ? "bg-gray-50 cursor-default border-gray-300" : errors.stockType ? "border-red-300" : "border-gray-300"}`}>
                        <option value="">Select Stock Type...</option>
                        {stockTypes.map((st) => (
                          <option key={st.Id} value={st.Id}>{st.Description || st.Code}</option>
                        ))}
                    </select>
                    {errors.stockType && <p className="text-xs text-red-500 mt-1">{errors.stockType}</p>}
                </div>

                {/* Supply Type */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Supply Type {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        name="supplyType"
                        value={formData.supplyType}
                        readOnly
                        className="flex h-9 w-full rounded-md border bg-gray-50 cursor-default border-gray-300 px-3 py-1 text-sm shadow-sm focus:outline-none"
                        placeholder={formData.stockType ? "Loading..." : "Select Stock Type first"}
                    />
                    {errors.supplyType && <p className="text-xs text-red-500 mt-1">{errors.supplyType}</p>}
                </div>

                {/* Weight */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Weight (kg) {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        {...getInputProps("weight", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                    {errors.weight && <p className="text-xs text-red-500 mt-1">{errors.weight}</p>}
                </div>

                {/* Unit of Measure */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        Unit of Measure {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <select
                        name="unitOm"
                        value={formData.unitOm}
                        onChange={handleChange}
                        disabled={isViewMode || loadingLookups}
                        className={`flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isViewMode ? "bg-gray-50 cursor-default border-gray-300" : errors.unitOm ? "border-red-300" : "border-gray-300"}`}
                    >
                        <option value="">Select UOM...</option>
                        {uoms.map((u) => (
                          <option key={u.Id} value={u.Id}>{u.Description || u.Code}</option>
                        ))}
                    </select>
                    {errors.unitOm && <p className="text-xs text-red-500 mt-1">{errors.unitOm}</p>}
                </div>

                {/* MOQ */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        MOQ {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="number"
                        name="moq"
                        value={formData.moq}
                        onChange={handleChange}
                        {...getInputProps("moq", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                    {errors.moq && <p className="text-xs text-red-500 mt-1">{errors.moq}</p>}
                </div>

                {/* MOQ By */}
                <div>
                    <label className="text-sm font-medium leading-none">
                        MOQ By {!isViewMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        name="moqBy"
                        value={formData.moqBy}
                        onChange={handleChange}
                        placeholder="e.g., PCS, BOX"
                        {...getInputProps("moqBy", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                    {errors.moqBy && <p className="text-xs text-red-500 mt-1">{errors.moqBy}</p>}
                </div>

                {/* Buy Price (Optional) */}
                <div>
                    <label className="text-sm font-medium leading-none">Buy Price (Optional)</label>
                    <input
                        type="number"
                        step="0.01"
                        name="buyPrice"
                        value={formData.buyPrice}
                        onChange={handleChange}
                        {...getInputProps("buyPrice", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                </div>

                {/* Selling Price (Optional) */}
                <div>
                    <label className="text-sm font-medium leading-none">Selling Price (Optional)</label>
                    <input
                        type="number"
                        step="0.01"
                        name="sellingPrice"
                        value={formData.sellingPrice}
                        onChange={handleChange}
                        {...getInputProps("sellingPrice", "flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500")}
                    />
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className="w-4 h-4 text-blue-600 rounded disabled:opacity-50"
                    />
                    <label className="ml-2 text-sm text-gray-700">Active (Optional)</label>
                </div>

                {/* Common Checkbox */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        name="isCommon"
                        checked={formData.isCommon}
                        onChange={handleChange}
                        disabled={isViewMode}
                        className="w-4 h-4 text-blue-600 rounded disabled:opacity-50"
                    />
                    <label className="ml-2 text-sm text-gray-700">Common Item (Optional)</label>
                </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
                {isViewMode ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-gray-300 bg-white shadow-sm hover:bg-gray-100 h-9 px-4 py-2">
                        Close
                    </button>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-gray-300 bg-white shadow-sm hover:bg-gray-100 h-9 px-4 py-2">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white shadow hover:bg-blue-700 h-9 px-4 py-2">
                        Save Item
                    </button>
                </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewItemModal;
