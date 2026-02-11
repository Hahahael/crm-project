import { useEffect, useState } from "react";
import { LuPlus, LuTrash, LuSearch } from "react-icons/lu";
import { useRef } from "react";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js";
import NewItemModal from "./NewItemModal.jsx";

export default function RFQDetailsForm({
  rfq,
  setFormData,
  formItems,
  setFormItems,
}) {
  console.log("RFQDetailsForm Props: ", rfq, formItems);
  const [itemsList, setItemsList] = useState([]);
  // const [kristemItems, setKristemItems] = useState([]);
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [viewItemModalOpen, setViewItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [remapConfirmOpen, setRemapConfirmOpen] = useState(false);
  const [remapItem, setRemapItem] = useState(null);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(null); // index of item with open dropdown
  const [searchQuery, setSearchQuery] = useState("");
  // errors state intentionally omitted (not used here)

  const onItemChange = (itemId, field, value) => {
    setFormItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const onRemoveItem = (itemId) => {
    setFormItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const onAddItem = () => {
    const newItem = {
      id: null,
      itemId: null,
      name: "",
      model: "",
      description: "",
      quantity: 1,
      price: "",
      unitPrice: null,
    };
    setFormItems((prev) => [...(prev || []), newItem]);
  };

  const dropdownRefs = useRef({});

  // Fetch Kristem items for mapping
  // useEffect(() => {
  //   const fetchKristemItems = async () => {
  //     try {
  //       console.log("🔍 Fetching Kristem items...");
  //       const res = await apiBackendFetch("/api/mssql/inventory/stocks?limit=5000");
  //       if (res.ok) {
  //         const data = await res.json();
  //         const items = data.rows || data || [];
  //         console.log("✅ Kristem items fetched:", items.length, "items");
  //         console.log("📦 Sample items:", items.slice(0, 3));
  //         setKristemItems(items);
  //       } else {
  //         console.error("❌ Failed to fetch Kristem items:", res.status, res.statusText);
  //       }
  //     } catch (err) {
  //       console.error("❌ Failed to fetch Kristem items", err);
  //     }
  //   };
  //   fetchKristemItems();
  // }, []);

  const handleSetupNewItem = (item, index) => {
    setSelectedItem({ ...item, _index: index });
    setNewItemModalOpen(true);
  };

  const handleSaveNewItem = async (formData) => {
    console.log("🟢 [DEBUG] handleSaveNewItem START - Saving locally");
    try {
      console.log("💾 Saving new item locally:", formData);
      
      // Update local formItems state with all item details directly
      setFormItems(prev => prev.map((item, idx) => 
        idx === selectedItem._index
          ? { 
              ...item,
              // Store all 14 fields directly in the item
              productName: formData.productName,
              correctedPartNo: formData.correctedPartNo,
              description: formData.description,
              correctedDescription: formData.correctedDescription,
              brand: formData.brand,
              unitOm: formData.unitOm,
              vendor: formData.vendor,
              stockType: formData.stockType,
              supplyType: formData.supplyType,
              weight: formData.weight,
              moq: formData.moq,
              moqBy: formData.moqBy,
              isActive: formData.isActive,
              isCommon: formData.isCommon,
              buyPrice: formData.buyPrice,
              sellingPrice: formData.sellingPrice,
              setupStatus: 'setup_complete', // Flag as setup complete
            }
          : item
      ));

      setNewItemModalOpen(false);
      setSelectedItem(null);

      console.log("🟢 [DEBUG] handleSaveNewItem END - Saved locally");
    } catch (err) {
      console.error("🔴 [ERROR] Error saving new item:", err);
      alert(`Failed to save new item: ${err.message}`);
    }
  };

  const handleChangeMapping = (item, index) => {
    if (item.mappedInTrApproval || item.mapped_in_tr_approval) {
      // Show confirmation dialog
      setRemapItem({ ...item, _index: index });
      setRemapConfirmOpen(true);
    } else {
      // Open search directly
      openMappingSearch(index);
    }
  };

  const openMappingSearch = (index) => {
    setSearchDropdownOpen(index);
    setSearchQuery('');
  };

  const closeMappingSearch = () => {
    setSearchDropdownOpen(null);
    setSearchQuery("");
  };

  const selectKristemItem = (kristemItem, itemIndex) => {
    // Update the form item with the new mapping
    setFormItems(prev => prev.map((item, idx) => {
      if (idx === itemIndex) {
        return {
          ...item,
          itemId: kristemItem.Id,
          item_id: kristemItem.Id,
          productName: kristemItem.Description || item.productName,
          product_name: kristemItem.Description || item.product_name,
          correctedPartNo: kristemItem.Code || item.correctedPartNo,
          corrected_part_no: kristemItem.Code || item.corrected_part_no,
          brand: kristemItem.BRAND_ID || item.brand,
          unitOm: kristemItem.SK_UOM || item.unitOm,
          unit_om: kristemItem.SK_UOM || item.unit_om,
          // Keep existing setup data if any
          setupStatus: item.setupStatus || item.setup_status,
          setup_status: item.setupStatus || item.setup_status,
        };
      }
      return item;
    }));
    closeMappingSearch();
  };

  const confirmRemap = () => {
    if (remapItem) {
      openMappingSearch(remapItem._index);
      setRemapConfirmOpen(false);
      setRemapItem(null);
    }
  };

  const cancelRemap = () => {
    setRemapConfirmOpen(false);
    setRemapItem(null);
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await apiBackendFetch(
          "/api/mssql/inventory/stocks?limit=1000",
        );
        const data = await res.json();
        console.log("Data:", data);
        const rows = data?.rows || data || [];
        setItemsList(rows);
      } catch (err) {
        console.error("Failed to fetch items", err);
      }
    };

    fetchItems();
  }, []);

  // Close dropdown on outside click for product name dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      setFormItems((prev) =>
        prev.map((item) => {
          const key = item.itemId ?? item.id;
          const ref = dropdownRefs.current[key];
          if (item.showDropdown && ref && !ref.contains(e.target)) {
            return { ...item, showDropdown: false };
          }
          return item;
        }),
      );
      
      // Close mapping search dropdown if clicking outside
      if (searchDropdownOpen !== null) {
        const searchDropdown = document.querySelector('[data-search-dropdown]');
        if (searchDropdown && !searchDropdown.contains(e.target)) {
          closeMappingSearch();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setFormItems, dropdownRefs, searchDropdownOpen]);

  // No totals effect here: wrapper owns totals and syncs formData from formItems

  return (
    <div className="w-full h-full space-y-6">
      {/* Basic Information */}
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col space-y-1.5">
          <h3 className="font-semibold leading-none tracking-tight">
            Basic Information
          </h3>
        </div>
        <div className="pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="rfqNumber">RFQ Number</label>
              <input
                id="rfqNumber"
                value={rfq.rfqNumber}
                readOnly
                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
              />
            </div>
            <div>
              <label htmlFor="rfqDate">RFQ Date</label>
              <input
                id="rfqDate"
                type="date"
                value={utils.formatDate(rfq.rfqDate, "YYYY-MM-DD")}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rfqDate: e.target.value }))
                }
                className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
              />
            </div>
            <div>
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                type="date"
                value={utils.formatDate(rfq.dueDate, "YYYY-MM-DD")}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="description">Description</label>
            <input
              id="description"
              value={rfq.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="salesLeadRef">Sales Lead Reference</label>
              <input
                id="salesLeadRef"
                value={rfq.slNumber}
                readOnly
                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
              />
            </div>
            <div>
              <label htmlFor="accountName">Account Name</label>
              <input
                id="accountName"
                value={rfq.account?.kristem?.Name}
                readOnly
                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="terms">Payment Terms</label>
            <input
              id="terms"
              value={rfq.paymentTerms}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentTerms: e.target.value,
                }))
              }
              className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
            />
          </div>
          <div>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={rfq.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
            />
          </div>
        </div>
      </div>

      {/* Items from Technical Recommendation */}
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col space-y-1.5 pb-6">
          <h3 className="font-bold leading-none tracking-tight">Items</h3>
          <p className="text-sm text-gray-500">
            Products from Technical Recommendation - Setup required before vendor selection
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-md border border-gray-200 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-medium text-gray-700">Product Name</th>
                  <th className="p-3 font-medium text-gray-700">Part No.</th>
                  <th className="p-3 font-medium text-gray-700">Description</th>
                  <th className="p-3 font-medium text-gray-700 text-center">Status</th>
                  <th className="p-3 font-medium text-gray-700">Kristem Item</th>
                  <th className="p-3 font-medium text-gray-700 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(formItems || []).map((item, idx) => {
                  const isNewItem = item.isNewItem || item.is_new_item;
                  const setupStatus = item.setupStatus || item.setup_status;
                  const hasSetup = setupStatus && setupStatus !== 'not_setup';
                  const isMapped = item.itemId || item.item_id;
                  const mappedInTr = item.mappedInTrApproval || item.mapped_in_tr_approval;
                  
                  let statusBadge, statusText;
                  if (hasSetup) {
                    statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                    statusText = setupStatus === 'setup_complete' ? "⚙️ Setup Complete (Unsaved)" : "✓ Setup Saved";
                  } else if (isNewItem) {
                    statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                    statusText = "⚠️ New Item";
                  } else if (isMapped) {
                    statusBadge = "bg-green-50 text-green-700 border-green-200";
                    statusText = "✓ Mapped";
                  } else {
                    statusBadge = "bg-gray-50 text-gray-700 border-gray-200";
                    statusText = "○ Unmapped";
                  }

                  const kristemItem = itemsList.find(k => k.Id === String(item.itemId || item.item_id));

                  // Display data directly from item (no more pendingItemData)
                  const displayData = item;

                  return (
                    <tr key={`rfq-item-${item.id}-${item.itemId || item.item_id}-${idx}`} className="hover:bg-gray-50">
                      <td className="p-3">{displayData.productName || item.product_name || '-'}</td>
                      <td className="p-3">{displayData.correctedPartNo || item.corrected_part_no || '-'}</td>
                      <td className="p-3 text-xs text-gray-600">
                        {displayData.description || item.description ? 
                          ((displayData.description || item.description).length > 50 
                            ? (displayData.description || item.description).substring(0, 50) + '...' 
                            : displayData.description || item.description)
                          : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusBadge}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="p-3">
                        {isMapped && kristemItem ? (
                          <div 
                            className="text-xs cursor-pointer hover:bg-blue-50 p-1 rounded"
                            onClick={() => {
                              setSelectedItem({ 
                                ...item, 
                                _index: idx,
                                // Add Kristem data for viewing
                                kristemData: kristemItem 
                              });
                              setViewItemModalOpen(true);
                            }}
                            title="Click to view details"
                          >
                            <div className="font-medium text-blue-600">{kristemItem.Code}</div>
                            <div className="text-gray-500 truncate max-w-xs">{kristemItem.Description}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isNewItem && !hasSetup ? (
                          <button
                            type="button"
                            onClick={() => handleSetupNewItem(item, idx)}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                          >
                            Setup Item
                          </button>
                        ) : hasSetup ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => handleSetupNewItem(item, idx)}
                              className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                            >
                              Edit Setup
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem({ ...item, _index: idx });
                                setViewItemModalOpen(true);
                              }}
                              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                            >
                              View Details
                            </button>
                          </div>
                        ) : searchDropdownOpen === idx ? (
                          <div className="relative" data-search-dropdown>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by code or description..."
                                className="w-64 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={closeMappingSearch}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                              >
                                ✕
                              </button>
                            </div>
                            {searchQuery.length >= 2 && (
                              <div className="absolute z-50 mt-1 w-80 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                                {(() => {
                                  const filtered = itemsList.filter(k => 
                                    (k.Code && k.Code.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                    (k.Description && k.Description.toLowerCase().includes(searchQuery.toLowerCase()))
                                  );
                                  if (filtered.length === 0) {
                                    return (
                                      <div className="p-3 text-xs text-gray-500 text-center">
                                        No items found matching "{searchQuery}"
                                      </div>
                                    );
                                  }
                                  return filtered.slice(0, 20).map((k) => (
                                    <div
                                      key={k.Id}
                                      onClick={() => selectKristemItem(k, idx)}
                                      className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="text-xs font-medium text-gray-900">{k.Code}</div>
                                      <div className="text-xs text-gray-500 truncate">{k.Description}</div>
                                      {k.BRAND_ID && <div className="text-xs text-gray-400">Brand: {k.BRAND_ID}</div>}
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleChangeMapping(item, idx)}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 inline-flex items-center gap-1"
                          >
                            <LuSearch className="h-3 w-3" />
                            {isMapped ? 'Change' : 'Map Item'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!formItems || formItems.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No items found. Items are automatically populated from Technical Recommendation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      <NewItemModal
        isOpen={newItemModalOpen}
        onClose={() => {
          setNewItemModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSave={handleSaveNewItem}
        mode="edit"
      />

      {/* View Item Modal */}
      <NewItemModal
        isOpen={viewItemModalOpen}
        onClose={() => {
          setViewItemModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        mode="view"
      />

      {/* Remap Confirmation Modal */}
      {remapConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4">
            <h3 className="text-lg font-bold mb-4">Confirm Remapping</h3>
            <p className="text-sm text-gray-600 mb-6">
              This item was mapped during TR approval. Are you sure you want to change the mapping?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelRemap}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemap}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Yes, Change Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Items Section - Hidden for now since items come from TR */}
      <div className="hidden rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col space-y-1.5 pb-6">
          <h3 className="font-bold leading-none tracking-tight">Items (Legacy)</h3>
          <p className="text-sm text-gray-500">
            List of items included in this RFQ
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-md border border-gray-200">
            <div className="relative w-full overflow-overlay">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="border-b border-gray-200">
                  <tr className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Product Name
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Brand
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Description
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Part No.
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Qty
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Unit
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Lead Time
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Unit Price
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Amount
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(formItems || []).map((item, idx) => (
                    <tr
                      key={`legacy-item-${item.id}-${item.itemId}-${idx}`}
                      className="hover:bg-gray-100 transition-all duration-200"
                    >
                      <td
                        className="text-sm p-2 align-middle"
                        style={{ position: "relative", overflow: "visible" }}
                      >
                        <div
                          className="relative"
                          ref={(el) => {
                            const key = item.itemId ?? item.id ?? idx;
                            dropdownRefs.current[key] = el;
                          }}
                          style={{ overflow: "visible" }}
                        >
                          <input
                            type="text"
                            value={
                              (item.searchQuery ??
                                item.name ??
                                item.details?.Description ??
                                item.Description) ||
                              ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormItems((prev) =>
                                prev.map((itm, i) =>
                                  i === idx
                                    ? {
                                        ...itm,
                                        name: v,
                                        showDropdown: true,
                                        searchQuery: v,
                                      }
                                    : itm,
                                ),
                              );
                            }}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                            onFocus={() =>
                              setFormItems((prev) =>
                                prev.map((itm, i) =>
                                  i === idx
                                    ? { ...itm, showDropdown: true }
                                    : itm,
                                ),
                              )
                            }
                          />
                          {item.showDropdown && (
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                bottom: "100%",
                                zIndex: 20,
                                width: "max-content",
                                minWidth: "100%",
                                maxWidth: "400px",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                                background: "white",
                                borderRadius: "0.5rem",
                                border: "1px solid #e5e7eb",
                                overflow: "visible",
                              }}
                            >
                              <ul
                                className="max-h-40 overflow-y-auto"
                                style={{ margin: 0, padding: 0 }}
                              >
                                {(itemsList || [])
                                  .filter(
                                    (i) =>
                                      (i.Description || i.description || "")
                                        .toLowerCase()
                                        .includes(
                                          (
                                            item.searchQuery ||
                                            item.name ||
                                            ""
                                          ).toLowerCase(),
                                        ) &&
                                      !(formItems || []).some(
                                        (tr) =>
                                          tr.itemId === i.Id || tr.id === i.Id,
                                      ),
                                  )
                                  .map((itm) => (
                                    <li
                                      key={itm.Id}
                                      onClick={() => {
                                        const detailsObj = {
                                          ...itm,
                                          ...Object.entries(itm.details).reduce(
                                            (acc, [key, value]) => {
                                              acc[`${key}_Details`] = value;
                                              return acc;
                                            },
                                            {},
                                          ),
                                        };
                                        const label =
                                          detailsObj?.Description ||
                                          itm.Description ||
                                          itm.Code ||
                                          "";
                                        setFormItems((prev) =>
                                          prev.map((itmRef, i) =>
                                            i === idx
                                              ? {
                                                  ...itmRef,
                                                  id: itmRef.id ?? null,
                                                  rfqId: itmRef.rfqId ?? null,
                                                  itemId: itm.Id,
                                                  item_id: itm.Id,
                                                  quantity:
                                                    itmRef.quantity || 1,
                                                  selectedVendorId: null,
                                                  leadTime: null,
                                                  unitPrice: null,
                                                  details: detailsObj,
                                                  // initialize visible name/search so input is editable immediately
                                                  name: label,
                                                  searchQuery: label,
                                                  showDropdown: false,
                                                }
                                              : itmRef,
                                          ),
                                        );
                                      }}
                                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                      style={{ listStyle: "none" }}
                                    >
                                      {`${itm.Description} - ${itm.Code}`}
                                    </li>
                                  ))}
                                {(itemsList || []).filter((i) =>
                                  (i.Description || i.description || "")
                                    .toLowerCase()
                                    .includes(
                                      (
                                        item.searchQuery ||
                                        item.name ||
                                        ""
                                      ).toLowerCase(),
                                    ),
                                ).length === 0 && (
                                  <li
                                    className="px-3 py-2 text-gray-500 text-sm"
                                    style={{ listStyle: "none" }}
                                  >
                                    No results found
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.details?.BRAND_ID || item.BRAND_ID || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={
                            item.details?.Description || item.Description || ""
                          }
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.details?.Code || item.Code || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white"
                          onChange={(e) => {
                            const value = Math.max(1, Number(e.target.value));
                            // update by index so it works even before itemId exists
                            setFormItems((prev) =>
                              prev.map((itm, i) =>
                                i === idx ? { ...itm, quantity: value } : itm,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.details?.SK_UOM || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.leadTime || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.unitPrice || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={`₱ ${item.unitPrice * item.quantity || ""}`}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 text-sm"
                          onClick={() =>
                            setFormItems((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
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
              className="border border-gray-200 text-gray-800 rounded-md px-4 py-2 flex items-center shadow-xs hover:bg-gray-200 transition-all duration-200 text-xs"
              onClick={onAddItem}
              disabled={(formItems || []).some((item) => item.itemId == null)}
              style={
                (formItems || []).some((item) => item.itemId == null)
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : {}
              }
            >
              <LuPlus className="mr-2" /> Add Item
            </button>
          </div>
          <div className="flex justify-end space-y-2">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal:</span>
                <span>₱ {rfq.subtotal != null ? rfq.subtotal : "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="font-medium">VAT (5%):</span>
                <span>₱ {rfq.vat != null ? rfq.vat : "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Grand Total:</span>
                <span>₱ {rfq.grandTotal != null ? rfq.grandTotal : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
