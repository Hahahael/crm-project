import { useState, useEffect, useRef } from "react";
import { apiBackendFetch } from "../services/api";

const TRApprovalModal = ({ 
  isOpen, 
  technicalReco, 
  onClose, 
  onSubmit, 
  submitting = false 
}) => {
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [productRouting, setProductRouting] = useState({});
  const [itemMappings, setItemMappings] = useState({}); // productId -> kristemItemId
  const [newItemFlags, setNewItemFlags] = useState({}); // productId -> boolean (true = new item)
  const [kristemItems, setKristemItems] = useState([]);
  const [itemSearchQueries, setItemSearchQueries] = useState({}); // productId -> searchQuery
  const [itemDropdownOpen, setItemDropdownOpen] = useState({}); // productId -> boolean
  const [validationError, setValidationError] = useState("");
  
  const [form, setForm] = useState({
    assignee: "",
    assigneeUsername: "",
    rfqAssignee: "", // For split scenario
    quotationAssignee: "", // For split scenario
    dueDate: "",
    fromTime: "",
    toTime: "",
    remarks: "",
    // Split scenario fields
    rfqDueDate: "",
    rfqFromTime: "",
    rfqToTime: "",
    rfqRemarks: "",
    quotationDueDate: "",
    quotationFromTime: "",
    quotationToTime: "",
    quotationRemarks: "",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        assignee: "",
        assigneeUsername: "",
        rfqAssignee: "",
        quotationAssignee: "",
        dueDate: "",
        fromTime: "",
        toTime: "",
        remarks: "",
        rfqDueDate: "",
        rfqFromTime: "",
        rfqToTime: "",
        rfqRemarks: "",
        quotationDueDate: "",
        quotationFromTime: "",
        quotationToTime: "",
        quotationRemarks: "",
      });
      setProductRouting({});
      setItemMappings({});
      setNewItemFlags({});
      setItemSearchQueries({});
      setItemDropdownOpen({});
      setValidationError("");
    }
  }, [isOpen]);

  // Close dropdown on outside click
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

  // Fetch users
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

    const fetchKristemItems = async () => {
      try {
        const res = await apiBackendFetch("/api/mssql/inventory/stocks?limit=1000");
        const data = await res.json();
        console.log("Fetched Kristem items data:", data);
        setKristemItems(Array.isArray(data.rows) ? data.rows : []);
        console.log("📦 Fetched", data.rows.length, "Kristem items for mapping");
      } catch (err) {
        console.error("Failed to fetch Kristem items", err);
        setKristemItems([]);
      }
    };

    fetchUsers();
    fetchKristemItems();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: (name === "assignee" || name === "rfqAssignee" || name === "quotationAssignee") ? Number(value) : value,
    });
  };

  // Calculate routing summary
  const products = technicalReco?.products || [];
  const rfqCount = Object.values(productRouting).filter(r => r === 'rfq').length;
  const directCount = Object.values(productRouting).filter(r => r === 'direct_quotation').length;
  const allRFQ = products.length > 0 && rfqCount === products.length;
  const allDirect = products.length > 0 && directCount === products.length;
  const isMixed = rfqCount > 0 && directCount > 0;

  // Determine next stage and message
  let nextStage = "";
  let routingMessage = "";
  let disclaimer = "";

  if (allRFQ) {
    nextStage = "RFQ";
    routingMessage = `All ${products.length} item(s) will proceed to RFQ`;
  } else if (allDirect) {
    nextStage = "Quotations";
    routingMessage = `All ${products.length} item(s) will proceed directly to Quotation (skipping RFQ)`;
  } else if (isMixed) {
    nextStage = "RFQ";
    routingMessage = `${rfqCount} item(s) → RFQ, ${directCount} item(s) → Direct to Quotation`;
    disclaimer = "Mixed routing detected: RFQ items will be processed first. Once RFQ is approved, all items (RFQ + Direct) will proceed to Quotation.";
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all products have routing
    const unroutedProducts = products.filter(p => !productRouting[p.id]);
    if (unroutedProducts.length > 0) {
      setValidationError(`Please select routing for all products (${unroutedProducts.length} item(s) not selected)`);
      return;
    }
    
    // Validate new item constraints
    for (const product of products) {
      const productId = product.id;
      const isNewItem = newItemFlags[productId];
      const routing = productRouting[productId];
      const isMapped = itemMappings[productId];
      
      // New items must go through RFQ
      if (isNewItem && routing === 'direct_quotation') {
        setValidationError(`"${product.productName || product.product_name}" is marked as new and must go through RFQ`);
        return;
      }
      
      // Direct to Quotation requires item mapping
      if (routing === 'direct_quotation' && !isMapped) {
        setValidationError(`"${product.productName || product.product_name}" marked for Direct to Quotation must be mapped to a Kristem item`);
        return;
      }
    }

    // Validate required fields
    if (isMixed) {
      // Split scenario requires both assignees and separate dates
      if (!form.rfqAssignee) {
        setValidationError("Please select an RFQ assignee");
        return;
      }
      if (!form.quotationAssignee) {
        setValidationError("Please select a Quotation assignee");
        return;
      }
      if (!form.rfqDueDate) {
        setValidationError("Please select an RFQ due date");
        return;
      }
      if (!form.quotationDueDate) {
        setValidationError("Please select a Quotation due date");
        return;
      }
    } else {
      // Single module requires one assignee and date
      if (!form.assignee) {
        setValidationError("Please select an assignee");
        return;
      }
      if (!form.dueDate) {
        setValidationError("Please select a due date");
        return;
      }
    }

    setValidationError("");
    
    const submissionData = {
      ...form,
      isMixed, // Pass split scenario flag
      productRouting,
      itemMappings,
      newItemFlags, // Add new item flags to submission
      nextStage,
    };
    
    console.log("Submitting TR approval:", submissionData);
    onSubmit(submissionData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 transition-opacity duration-300">
      <form
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold mb-4">
          Approve Technical Recommendation
        </h2>

        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {validationError}
          </div>
        )}

        {/* Product Routing Table */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm mb-2">Product Routing</h3>
          <p className="text-xs text-gray-500 mb-3">Select routing for each product</p>
          
          <div className="border border-gray-200 rounded-md" style={{ overflow: 'visible' }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-700">Product Name</th>
                  <th className="text-left p-2 font-medium text-gray-700">Part Number</th>
                  <th className="text-left p-2 font-medium text-gray-700">Description</th>
                  <th className="text-center p-2 font-medium text-gray-700">
                    <div className="flex items-center justify-center gap-1">
                      New Item?
                      <span className="text-xs text-gray-500 font-normal">(not in Kristem)</span>
                    </div>
                  </th>
                  <th className="text-left p-2 font-medium text-gray-700">Mapped Kristem Item</th>
                  <th className="text-center p-2 font-medium text-gray-700">Routing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => {
                  const productId = product.id;
                  const mappedItemId = itemMappings[productId];
                  const mappedItem = kristemItems.find(item => item.Id === mappedItemId);
                  const searchQuery = itemSearchQueries[productId] || "";
                  const isDropdownOpen = itemDropdownOpen[productId] || false;
                  const isNewItem = newItemFlags[productId] || false;
                  
                  // Filter items based on search query
                  const filteredKristemItems = searchQuery 
                    ? kristemItems.filter(item => {
                        const searchLower = searchQuery.toLowerCase();
                        const code = (item.Code || "").toLowerCase();
                        const description = (item.Description || "").toLowerCase();
                        const brand = (item.brand?.Code || item.brand?.Description || "").toLowerCase();
                        return code.includes(searchLower) || description.includes(searchLower) || brand.includes(searchLower);
                      }).slice(0, 50)
                    : kristemItems.slice(0, 50); // Show first 50 items when no search query
                  
                  return (
                    <tr key={productId} className="hover:bg-gray-50">
                      <td className="p-2">{product.productName || product.product_name || '-'}</td>
                      <td className="p-2">{product.correctedPartNo || product.corrected_part_no || '-'}</td>
                      <td className="p-2 text-xs text-gray-600">
                        {product.description ? 
                          (product.description.length > 50 ? product.description.substring(0, 50) + '...' : product.description)
                          : '-'}
                      </td>
                      <td className="p-2 text-center">
                        <label className="flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={isNewItem}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setNewItemFlags(prev => ({ ...prev, [productId]: checked }));
                              
                              // If marking as new, clear mapping and force RFQ
                              if (checked) {
                                setItemMappings(prev => {
                                  const updated = { ...prev };
                                  delete updated[productId];
                                  return updated;
                                });
                                setProductRouting(prev => ({ ...prev, [productId]: 'rfq' }));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          {isNewItem ? (
                            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">No</span>
                          )}
                        </label>
                      </td>
                      <td className="p-2" style={{ position: 'relative' }}>
                        {isNewItem ? (
                          <div className="text-xs text-gray-500 italic text-center">
                            New items must go through RFQ
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              value={mappedItem ? `${mappedItem.Code} - ${mappedItem.Description}` : searchQuery}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemSearchQueries(prev => ({ ...prev, [productId]: value }));
                                setItemDropdownOpen(prev => ({ ...prev, [productId]: true }));
                                // Clear mapping when user types
                                if (mappedItem) {
                                  setItemMappings(prev => {
                                    const updated = { ...prev };
                                    delete updated[productId];
                                    return updated;
                                  });
                                }
                              }}
                              onFocus={() => setItemDropdownOpen(prev => ({ ...prev, [productId]: true }))}
                              onBlur={() => {
                                // Delay to allow click on dropdown item
                                setTimeout(() => {
                                  setItemDropdownOpen(prev => ({ ...prev, [productId]: false }));
                                }, 200);
                              }}
                              placeholder="Search or select item..."
                            className={`w-full rounded border px-2 py-1 text-xs ${
                              mappedItem ? 'border-green-300 bg-green-50' : 'border-gray-200'
                            }`}
                            autoComplete="off"
                          />
                          {mappedItem && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 text-sm">✓</span>
                          )}
                          
                          {/* Dropdown - positioned below */}
                          {isDropdownOpen && !mappedItem && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                zIndex: 100,
                              }}
                              className="bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto"
                            >
                              {filteredKristemItems.length > 0 ? (
                                <ul className="py-1">
                                  {filteredKristemItems.map((item) => (
                                    <li
                                      key={item.Id}
                                      onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur on input
                                        setItemMappings(prev => ({ ...prev, [productId]: item.Id }));
                                        setItemSearchQueries(prev => ({ ...prev, [productId]: "" }));
                                        setItemDropdownOpen(prev => ({ ...prev, [productId]: false }));
                                        console.log(`Mapped product ${productId} to Kristem item ${item.Id}`);
                                      }}
                                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                      <div className="text-xs font-medium">{item.Code}</div>
                                      <div className="text-xs text-gray-600 truncate">{item.Description}</div>
                                      {item.brand?.Code && <div className="text-xs text-gray-400">Brand: {item.brand.Code}</div>}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="px-3 py-2 text-xs text-gray-500">
                                  {searchQuery ? 'No items found' : 'Type to search items...'}
                                </div>
                              )}
                            </div>
                          )}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={productRouting[productId] === 'rfq'}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProductRouting(prev => ({
                                    ...prev,
                                    [productId]: 'rfq'
                                  }));
                                } else {
                                  setProductRouting(prev => {
                                    const updated = { ...prev };
                                    delete updated[productId];
                                    return updated;
                                  });
                                }
                                setValidationError("");
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-xs">RFQ</span>
                          </label>
                          <label className={`flex items-center gap-2 p-1 rounded ${
                            isNewItem 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'cursor-pointer hover:bg-green-50'
                          }`}>
                            <input
                              type="checkbox"
                              checked={productRouting[productId] === 'direct_quotation'}
                              disabled={isNewItem}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProductRouting(prev => ({
                                    ...prev,
                                    [productId]: 'direct_quotation'
                                  }));
                                } else {
                                  setProductRouting(prev => {
                                    const updated = { ...prev };
                                    delete updated[productId];
                                    return updated;
                                  });
                                }
                                setValidationError("");
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-xs">Direct to Quotation</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Routing Summary */}
        {routingMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-900">Routing Summary</p>
            <p className="text-sm text-blue-700 mt-1">{routingMessage}</p>
            {disclaimer && (
              <p className="text-xs text-blue-600 mt-2 italic">{disclaimer}</p>
            )}
          </div>
        )}

        {/* Standard Approval Fields */}
        <div className="space-y-3">
          {/* Conditional Assignee Fields */}
          {isMixed ? (
            /* Split Scenario: Show separate assignees for RFQ and Quotation */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {/* RFQ Assignee */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-blue-700">RFQ Assignee *</label>
                  <select
                    name="rfqAssignee"
                    value={form.rfqAssignee}
                    onChange={handleChange}
                    className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm"
                  >
                    <option value="">Select user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quotation Assignee */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-green-700">Quotation Assignee *</label>
                  <select
                    name="quotationAssignee"
                    value={form.quotationAssignee}
                    onChange={handleChange}
                    className="w-full rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm"
                  >
                    <option value="">Select user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 italic">
                💡 Split routing allows different assignees for RFQ and Quotation modules
              </p>
            </div>
          ) : (
            /* Single Module: Show one assignee field */
            <div>
              <label className="block text-sm font-medium mb-1">Assignee *</label>
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
                              assignee: user.id,
                              assigneeUsername: user.username,
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
            </div>
          )}

          {/* Conditional Scheduling Fields */}
          {isMixed ? (
            /* Split Scenario: Side-by-side scheduling for RFQ and Quotation on larger screens */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* RFQ Scheduling */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">📦 RFQ Schedule</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date *</label>
                    <input
                      type="date"
                      name="rfqDueDate"
                      value={form.rfqDueDate}
                      onChange={handleChange}
                      className="w-full rounded-md border border-blue-200 px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">From Time</label>
                      <input
                        type="time"
                        name="rfqFromTime"
                        value={form.rfqFromTime}
                        onChange={handleChange}
                        className="w-full rounded-md border border-blue-200 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">To Time</label>
                      <input
                        type="time"
                        name="rfqToTime"
                        value={form.rfqToTime}
                        onChange={handleChange}
                        className="w-full rounded-md border border-blue-200 px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Remarks</label>
                    <textarea
                      name="rfqRemarks"
                      value={form.rfqRemarks}
                      onChange={handleChange}
                      rows={2}
                      className="w-full rounded-md border border-blue-200 px-3 py-2"
                      placeholder="Optional remarks for RFQ..."
                    />
                  </div>
                </div>
              </div>

              {/* Quotation Scheduling */}
              <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
                <h4 className="text-sm font-semibold text-green-900 mb-3">📝 Quotation Schedule</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date *</label>
                    <input
                      type="date"
                      name="quotationDueDate"
                      value={form.quotationDueDate}
                      onChange={handleChange}
                      className="w-full rounded-md border border-green-200 px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">From Time</label>
                      <input
                        type="time"
                        name="quotationFromTime"
                        value={form.quotationFromTime}
                        onChange={handleChange}
                        className="w-full rounded-md border border-green-200 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">To Time</label>
                      <input
                        type="time"
                        name="quotationToTime"
                        value={form.quotationToTime}
                        onChange={handleChange}
                        className="w-full rounded-md border border-green-200 px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Remarks</label>
                    <textarea
                      name="quotationRemarks"
                      value={form.quotationRemarks}
                      onChange={handleChange}
                      rows={2}
                      className="w-full rounded-md border border-green-200 px-3 py-2"
                      placeholder="Optional remarks for Quotation..."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Module: One set of scheduling fields */
            <div className="space-y-3">
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                />
              </div>
              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From Time</label>
                  <input
                    type="time"
                    name="fromTime"
                    value={form.fromTime}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To Time</label>
                  <input
                    type="time"
                    name="toTime"
                    value={form.toTime}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-200 px-3 py-2"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2"
                  placeholder="Optional approval remarks..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Approving..." : "Approve"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TRApprovalModal;
