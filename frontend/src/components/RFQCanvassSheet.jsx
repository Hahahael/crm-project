import { useState, useEffect, useCallback, useRef } from "react";
import {
  LuDownload,
  LuPrinter,
  LuFileText,
  LuCircleCheckBig,
  LuTrendingDown,
  LuCircleAlert,
  LuClock,
  LuCheck,
} from "react-icons/lu";
import { formatMoney } from "../helper/utils.js";

export default function RFQCanvassSheet({
  rfq,
  formItems,
  formVendors,
  setFormVendors,
  setFormItems,
  mode = "create",
  setFormData,
  onForApproval,
  onExportExcel,
  onExportPDF,
  source = "rfq"
}) {
  console.log("RFQCanvassSheet rendering with props:", {
    rfq,
    formItems,
    formVendors,
    mode,
  });
  const formData = rfq;
  const readOnly = mode === "view";
  // Canonical ID helpers to avoid camel/snake and string/number mismatches
  const canonItemId = (obj) => (obj ? (obj.itemId ?? obj.item_id ?? obj.id) : undefined);
  const canonVendorId = (obj) => (obj ? (obj.vendorId ?? obj.vendor_id ?? obj.id) : undefined);
  const idEq = (a, b) => String(a ?? "") === String(b ?? "");
  // Forex rate helper: returns PHP conversion rate for vendor (1 if PHP)
  const getForexRate = (vendor) => {
    const code = vendor?.currency?.Code;
    if (!code || code === 'PHP') return 1;
    return Number(vendor?.forex?.Rate) || 1;
  };
  // Global selected vendor for ALL items - use the database field
  const [selectedVendorAll, setSelectedVendorAll] = useState(() => rfq?.selectedVendorId || rfq?.selected_vendor_id || null);

  // Apply a single vendor selection across all items
  const handleSelectVendorAll = (vendorId) => {
    if (readOnly) return;
    const itemsSource = formItems || [];
    const updatedItems = itemsSource.map((item) => {
      const iid = canonItemId(item);
      const selectedQuote = (quotations || []).find(
        (q) => idEq(q.itemId, iid) && idEq(q.vendorId, vendorId),
      );
      if (!selectedQuote) return item;
      return {
        ...item,
        unitPrice: selectedQuote.unitPrice ?? item.unitPrice,
        leadTime: selectedQuote.leadTime ?? item.leadTime,
        quantity: selectedQuote.quantity ?? item.quantity,
        total: (selectedQuote.unitPrice ?? 0) * (selectedQuote.quantity ?? 0),
      };
    });

    const newSelection = (formItems || []).reduce((acc, item) => {
      acc[canonItemId(item)] = vendorId;
      return acc;
    }, {});

    // Update isSelected flags on vendor quotes
    const updatedVendors = (formVendors || []).map((vendor) => {
      const vid = canonVendorId(vendor);
      return {
        ...vendor,
        quotes: (vendor.quotes || []).map((q) => ({
          ...q,
          isSelected: idEq(newSelection[q.itemId ?? q.item_id], vid),
        })),
      };
    });
    if (setFormVendors) setFormVendors(updatedVendors);

    setSelectedVendorAll(vendorId);
    setSelectedVendorsByItem(newSelection);
    setFormItems(updatedItems);
    if (!readOnly && setFormData)
      setFormData((prev) => ({
        ...prev,
        items: updatedItems,
        vendors: updatedVendors,
        selectedVendorId: vendorId,
        selectedVendorsByItem: newSelection,
      }));
  };

  // Handler to select best (lowest total) vendor for all items
  const handleSelectRecommendedVendors = () => {
    if (readOnly) return;
    if (!vendorTotals || vendorTotals.length === 0) return;
    const best = vendorTotals.reduce((min, v) => (v.total < min.total ? v : min), vendorTotals[0]);
    if (best?.id) handleSelectVendorAll(best.id);
  };

  // Select a specific vendor for a single item
  const handleSelectVendorForItem = (itemId, vendorId) => {
    if (readOnly) return;
    const newSelection = { ...selectedVendorsByItem, [itemId]: vendorId };
    setSelectedVendorsByItem(newSelection);

    // Update the item's price/leadTime from the selected quote
    const selectedQuote = (quotations || []).find(
      (q) => idEq(q.itemId, itemId) && idEq(q.vendorId, vendorId),
    );

    // Update isSelected flags on vendor quotes
    const updatedVendors = (formVendors || []).map((vendor) => {
      const vid = canonVendorId(vendor);
      return {
        ...vendor,
        quotes: (vendor.quotes || []).map((q) => ({
          ...q,
          isSelected: idEq(newSelection[q.itemId ?? q.item_id], vid),
        })),
      };
    });
    if (setFormVendors) setFormVendors(updatedVendors);

    // Determine if all items now select the same vendor (only if every item has a selection)
    const totalItems = (formItems || []).length;
    const allVids = (formItems || []).map((i) => newSelection[canonItemId(i)]).filter(Boolean);
    const uniqueVids = Array.from(new Set(allVids.map(String)));
    const globalVendorId = (totalItems > 0 && allVids.length === totalItems && uniqueVids.length === 1) ? allVids[0] : null;
    setSelectedVendorAll(globalVendorId);

    if (selectedQuote) {
      const updatedItems = (formItems || []).map((item) => {
        if (!idEq(canonItemId(item), itemId)) return item;
        return {
          ...item,
          unitPrice: selectedQuote.unitPrice ?? item.unitPrice,
          leadTime: selectedQuote.leadTime ?? item.leadTime,
          quantity: selectedQuote.quantity ?? item.quantity,
          total: (selectedQuote.unitPrice ?? 0) * (selectedQuote.quantity ?? 0),
        };
      });
      setFormItems(updatedItems);
      if (setFormData)
        setFormData((prev) => ({
          ...prev,
          items: updatedItems,
          vendors: updatedVendors,
          selectedVendorId: globalVendorId,
          selectedVendorsByItem: newSelection,
        }));
    } else {
      if (setFormData)
        setFormData((prev) => ({
          ...prev,
          vendors: updatedVendors,
          selectedVendorId: globalVendorId,
          selectedVendorsByItem: newSelection,
        }));
    }
  };

  const [selectedVendorsByItem, setSelectedVendorsByItem] = useState(() => {
    // Initialize per-item vendor selection based on the global selectedVendorId
    const itemVendorMap = {};
    const globalSelectedVendor = rfq?.selectedVendorId || rfq?.selected_vendor_id;
    
    if (globalSelectedVendor && Array.isArray(formItems)) {
      // If there's a global selected vendor, apply it to all items
      formItems.forEach((item) => {
        const iid = canonItemId(item);
        itemVendorMap[iid] = globalSelectedVendor;
      });
    } else if (rfq?.selectedVendorsByItem && Object.keys(rfq.selectedVendorsByItem).length > 0) {
      // Restore per-item selections from saved formData
      Object.assign(itemVendorMap, rfq.selectedVendorsByItem);
    } else if (Array.isArray(formVendors)) {
      // Derive from vendor quotes' isSelected flags (loaded from DB)
      formVendors.forEach((vendor) => {
        const vid = canonVendorId(vendor);
        (vendor.quotes || []).forEach((q) => {
          if (q.isSelected) {
            const iid = q.itemId ?? q.item_id;
            if (iid) itemVendorMap[iid] = vid;
          }
        });
      });
    }
    return itemVendorMap;
  });

  // Generate quotations array from items and vendors as state, derived from rfq.items and rfq.vendors
  const generateQuotations = useCallback(
    (selectedVendorsByItem) => {
      const arr = [];
      const itemsSource = formItems || [];
      itemsSource.forEach((item) => {
        const iid = canonItemId(item);
        (formVendors || []).forEach((vendor) => {
          const vid = canonVendorId(vendor);
          // vendor.quotes may come from different sources and use snake_case (item_id) or camelCase (itemId)
          const vendorItem = Array.isArray(vendor.quotes)
            ? vendor.quotes.find(
                (q) => idEq(q.itemId ?? q.item_id, iid),
              )
            : undefined;

          const unitPrice = vendorItem
            ? (vendorItem.unitPrice ?? vendorItem.unit_price ?? 0)
            : 0;
          const quantity = vendorItem
            ? (vendorItem.quantity ??
              vendorItem.Qty ??
              vendorItem.qty ??
              item.quantity ??
              1)
            : (item.quantity ?? 1);

          const total = unitPrice * quantity;
          const forexRate = getForexRate(vendor);
          const phpTotal = total * forexRate;

          arr.push({
            itemId: iid,
            vendorId: vid,
            unitPrice,
            quantity,
            leadTime: vendorItem
              ? (vendorItem.leadTime ?? vendorItem.lead_time)
              : "-",
            leadTimeColor: vendorItem
              ? (vendorItem.leadTimeColor ?? vendorItem.lead_time_color)
              : "",
            total,
            phpTotal,
            currencyCode: vendor?.currency?.Code || 'PHP',
            forexRate,
            isSelected: idEq(selectedVendorsByItem[iid], vid),
          });
        });
      });
      // Mark best option per item (compare in PHP-converted totals)
      (formItems || []).forEach((item) => {
        const iid2 = canonItemId(item);
        const itemQuotes = arr.filter((q) => idEq(q.itemId, iid2));
        const minPhpTotal = Math.min(...itemQuotes.map((q) => q.phpTotal));
        itemQuotes.forEach((q) => {
          q.isBestOption = q.phpTotal === minPhpTotal;
        });
      });
      return arr;
    },
    [formItems, formVendors],
  );

  const [quotations, setQuotations] = useState(() => {
    // Initialize quotations based on the selectedVendorsByItem
    const globalSelectedVendor = rfq?.selectedVendorId || rfq?.selected_vendor_id;
    let initialSelections = {};
    
    if (globalSelectedVendor && Array.isArray(formItems)) {
      // Use global selected vendor for all items
      formItems.forEach((item) => {
        const iid = canonItemId(item);
        initialSelections[iid] = globalSelectedVendor;
      });
    } else if (rfq?.selectedVendorsByItem && Object.keys(rfq.selectedVendorsByItem).length > 0) {
      initialSelections = { ...rfq.selectedVendorsByItem };
    } else if (Array.isArray(formVendors)) {
      // Derive from vendor quotes' isSelected flags
      formVendors.forEach((vendor) => {
        const vid = canonVendorId(vendor);
        (vendor.quotes || []).forEach((q) => {
          if (q.isSelected) {
            const iid = q.itemId ?? q.item_id;
            if (iid) initialSelections[iid] = vid;
          }
        });
      });
    }
    
    return generateQuotations(initialSelections);
  });

  // Watch for changes in the RFQ's selected vendor from OUTSIDE (e.g. loading from DB)
  // Only react to actual changes in the rfq prop's vendor ID, not formItems changes
  const prevGlobalVendorRef = useRef(rfq?.selectedVendorId || rfq?.selected_vendor_id);
  useEffect(() => {
    const globalSelectedVendor = rfq?.selectedVendorId || rfq?.selected_vendor_id;
    // Only sync if the global vendor ID actually changed from what we last saw
    if (globalSelectedVendor && globalSelectedVendor !== prevGlobalVendorRef.current) {
      prevGlobalVendorRef.current = globalSelectedVendor;
      setSelectedVendorAll(globalSelectedVendor);
      
      // Update selectedVendorsByItem to reflect the global selection
      if (Array.isArray(formItems)) {
        const newSelections = {};
        formItems.forEach((item) => {
          const iid = canonItemId(item);
          newSelections[iid] = globalSelectedVendor;
        });
        setSelectedVendorsByItem(newSelections);
      }
    }
  }, [rfq?.selectedVendorId, rfq?.selected_vendor_id]);

  // Sync quotations when selectedVendorsByItem changes
  useEffect(() => {
    setQuotations(generateQuotations(selectedVendorsByItem));
    // Persist selected vendors for each item in formData (only when not view mode)
    if (!readOnly && setFormData) {
      // Determine global selectedVendorId: only if EVERY item has the same vendor selected
      const totalItems = (formItems || []).length;
      const allVids = (formItems || []).map((i) => selectedVendorsByItem[canonItemId(i)]).filter(Boolean);
      const uniqueVids = Array.from(new Set(allVids.map(String)));
      const globalVendorId = (totalItems > 0 && allVids.length === totalItems && uniqueVids.length === 1) ? allVids[0] : null;
      setFormData((prev) => ({ ...prev, selectedVendorsByItem, selectedVendorId: globalVendorId }));
    }
  }, [
    selectedVendorsByItem,
    formItems,
    formVendors,
    generateQuotations,
    setFormData,
    readOnly,
  ]);

  // If all items share the same selected vendor, reflect it in selectedVendorAll (for header highlighting)
  useEffect(() => {
    const totalItems = (formItems || []).length;
    const vids = (formItems || [])
      .map((i) => selectedVendorsByItem[canonItemId(i)])
      .filter(Boolean);
    if (vids.length === 0) { setSelectedVendorAll(null); return; }
    const unique = Array.from(new Set(vids.map(String)));
    setSelectedVendorAll((totalItems > 0 && vids.length === totalItems && unique.length === 1) ? vids[0] : null);
  }, [selectedVendorsByItem, formItems]);

  // For backward-compatibility: redirect per-item clicks to global selection (no separate handler needed)

  console.log("RFQCanvassSheet props:", { formData, mode });
  // Calculate summary, vendorTotals, and recommendedVendor from props
  const totalItems = (formItems || []).length || 0;
  const quotedVendors = (formVendors || []).length || 0;

  console.log("Quotations:", quotations);

  console.log(quotations);

  // Calculate vendorTotals from quotations array
  const vendorTotals = (formVendors || []).map((vendor) => {
    const vid = canonVendorId(vendor);
    const total = quotations
      .filter((q) => idEq(q.vendorId, vid))
      .reduce((sum, q) => sum + q.total, 0);
    const forexRate = getForexRate(vendor);
    const phpTotal = total * forexRate;
    return {
      id: vid,
      name: vendor.Name || vendor.vendor?.Name || vendor.name || vendor.details?.Name || "-",
      total,
      phpTotal,
      currencyCode: vendor?.currency?.Code || 'PHP',
      forexRate,
      vendor,
      recommended: false,
      diff: null,
    };
  });

  // Find lowest PHP-converted total for comparison
  const lowestPhpTotal =
    vendorTotals.length > 0 ? Math.min(...vendorTotals.map((v) => v.phpTotal)) : 0;
  // Mark recommended vendor (lowest PHP total)
  let recommendedVendor = {};
  vendorTotals.forEach((v) => {
    if (v.phpTotal === lowestPhpTotal) {
      v.recommended = true;
      recommendedVendor = v.vendor || formData.vendors.find((vendorObj) => vendorObj.name === v.name) || {};
    } else {
      v.recommended = false;
    }
  });
  // Fill diff for non-recommended vendors (in PHP)
  vendorTotals.forEach((v) => {
    if (!v.recommended) {
      v.diff = v.phpTotal - lowestPhpTotal;
    }
  });

  const summary = {
    totalItems,
    quotedVendors,
    lowestPhpTotal,
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Canvass Sheet</h3>
          <p className="text-sm text-muted-foreground">
            {rfq?.rfqNumber || "RFQ-XXXX-XXX"} -{" "}
            {rfq?.description || "No Description"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className={`bg-primary text-white rounded-md px-4 py-2 flex items-center cursor-pointer ${readOnly ? "hidden cursor-not-allowed" : ""}`}
            onClick={readOnly ? undefined : onExportExcel}
            disabled={readOnly}
            aria-disabled={readOnly}
            title={readOnly ? "View only" : "Export to Excel"}
          >
            <LuDownload className="h-5 w-5 mr-1" />
            Export Excel
          </button>
          <button
            type="button"
            className={`bg-primary text-white rounded-md px-4 py-2 flex items-center cursor-pointer ${readOnly ? "hidden cursor-not-allowed" : ""}`}
            onClick={readOnly ? undefined : onExportPDF}
            disabled={readOnly}
            aria-disabled={readOnly}
            title={readOnly ? "View only" : "Export to PDF"}
          >
            <LuPrinter className="h-5 w-5 mr-1" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Items"
          value={summary?.totalItems}
          icon={<LuFileText className="h-5 w-5 text-blue-500" />}
        />
        <SummaryCard
          label="Quoted Vendors"
          value={summary?.quotedVendors}
          icon={<LuCircleCheckBig className="h-5 w-5 text-green-500" />}
        />
        <SummaryCard
          label="Lowest Total"
          value={formatMoney(summary?.lowestPhpTotal, null, { currency: 'PHP' })}
          icon={<LuTrendingDown className="h-5 w-5 text-green-500" />}
        />
        <SummaryCard
          label="Recommended"
          value={recommendedVendor?.Name || recommendedVendor?.name || "-"}
          icon={<LuCircleAlert className="h-5 w-5 text-orange-500" />}
          highlight
        />
      </div>

      {/* Vendor Total Comparison */}
      <div className="rounded-xl border bg-card shadow border-gray-200">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">
            Vendor Total Comparison
          </h3>
        </div>
        <div className="p-6 pt-0 space-y-4">
        {vendorTotals.map((v, id) => {
            console.log("Vendor object:", v); // 👈 Logs each vendor as the component renders

            return (
                <div
                key={v.name || v.details?.Name}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                    v.recommended
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
                >
                <div className="flex items-center space-x-3">
                    <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        v.recommended
                        ? "bg-green-500 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                    >
                    {id + 1}
                    </div>
                    <div>
                    <p className="font-medium">{v.name}</p>
                    {v.recommended && (
                        <span className="inline-flex items-center rounded-md px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 text-xs ml-2 shadow">
                        Recommended
                        </span>
                    )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold">{formatMoney(v.total, v.vendor)}</p>
                    {v.currencyCode !== 'PHP' && (
                      <p className="text-sm font-medium text-green-700">
                        {formatMoney(v.phpTotal, null, { currency: 'PHP' })}
                      </p>
                    )}
                    {v.diff != null && <p className="text-sm text-red-600">+{formatMoney(v.diff, null, { currency: 'PHP' })}</p>}
                </div>
                </div>
            );
            })}

        </div>
        {/* Selection is now done via header vendor buttons */}
      </div>

      {/* Item-by-Item Comparison */}
      <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-md">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold leading-none tracking-tight">
              Item-by-Item Comparison
            </h3>
            {/* Add select all or other controls here if needed */}
          </div>
        </div>
        <div className="p-6 pt-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th></th>
                <th className="text-left font-light">Item Details</th>
                {formData.vendors.map((v) => {
                  const vid = canonVendorId(v);
                  const isSelected = selectedVendorAll && idEq(selectedVendorAll, vid);
                  return (
                    <th key={vid} className="text-center min-w-[150px] px-2 py-3 align-bottom">
                      <button
                        type="button"
                        onClick={() => handleSelectVendorAll(vid)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150
                          ${isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                          } ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        disabled={readOnly}
                      >
                        <span className="block truncate">{v.Name || v.name || "-"}</span>
                      </button>
                    </th>
                  );
                })}
                <th className="text-center min-w-[120px] px-2 py-3 align-bottom">
                  <span className="text-sm font-medium text-gray-500">Best Option</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(formItems || []).map((item) => (
                <tr key={item.itemId} className="divide-y divide-gray-200">
                  <td>{/* Checkbox or selection logic here */}</td>
                  <td>
                    <div>
                      <p className="font-medium">
                        {item.productName || item.name || item.details?.Description || "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.brand?.Description || item.brand || item.details?.BRAND_ID || item.BRAND_ID}{" "}
                        - {item.partNumber || item.correctedPartNo || item.details?.Code || item.Code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {item.quantity} {item.unit}
                      </p>
                    </div>
                  </td>
                  {formData.vendors.map((v) => {
                    const quote = quotations.find(
                      (q) =>
                        idEq(q.itemId, canonItemId(item)) && idEq(q.vendorId, canonVendorId(v)),
                    );
                    console.log(
                      "Quote",
                      quote,
                      "is selected:",
                      quote?.isSelected,
                    );
                      const isItemSelected = idEq(selectedVendorsByItem[canonItemId(item)], canonVendorId(v));
                      return (
                      <td
                        key={v.vendorId}
                        className={`text-center align-middle relative transition-all duration-150 p-1 ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                        onClick={() => !readOnly && handleSelectVendorForItem(canonItemId(item), canonVendorId(v))}
                      >
                        <div
                          className={`p-2 rounded-lg transition-all duration-150 relative h-full flex flex-col items-center justify-center min-h-[120px] ${
                            isItemSelected ? "bg-blue-50 ring-2 ring-blue-300" : "hover:bg-gray-50"
                          }`}
                        >
                          {isItemSelected && (
                            <div className="absolute top-1 right-1">
                              <LuCheck className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          <p className="font-bold text-lg">
                            {quote ? formatMoney(quote.unitPrice, null, { currency: quote.currencyCode }) : "-"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total: {quote ? formatMoney(quote.total, null, { currency: quote.currencyCode }) : "-"}
                          </p>
                          {quote && quote.currencyCode !== 'PHP' && (
                            <p className="text-xs text-green-700">
                              {formatMoney(quote.phpTotal, null, { currency: 'PHP' })}
                            </p>
                          )}
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            <LuClock />{" "}
                            <span
                              className={`text-xs ${quote?.leadTimeColor ?? ""}`}
                            >
                              {quote?.leadTime ?? "-"}
                            </span>
                          </div>
                          {quote?.isBestOption && (
                            <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 text-xs mt-1">
                              Best Option
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-gray-200">
                    <div className="text-center">
                      {(() => {
                        const bestQuote = quotations.find(
                          (q) => idEq(q.itemId, canonItemId(item)) && q.isBestOption,
                        );
                        if (bestQuote) {
                          const bestVendor = formData.vendors.find(
                            (v) => idEq(canonVendorId(v), bestQuote.vendorId),
                          );
                          return (
                            <>
                              <p className="font-bold text-green-600">
                                {bestVendor ? (bestVendor.Name || bestVendor.name) : "-"}
                              </p>
                              <p className="text-sm font-medium">
                                {formatMoney(bestQuote.unitPrice, null, { currency: bestQuote.currencyCode })}
                              </p>
                              {bestQuote.currencyCode !== 'PHP' && (
                                <p className="text-xs text-green-700">
                                  {formatMoney(bestQuote.unitPrice * bestQuote.forexRate, null, { currency: 'PHP' })}
                                </p>
                              )}
                            </>
                          );
                        }
                        return <p className="text-sm font-medium">-</p>;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      {/* <div className="flex justify-between items-center">
        <div>
          <button
            type="button"
            className={`bg-green-600 hover:bg-green-700 text-white rounded-md px-8 h-10 ${source === 'rfq' ? '' : 'hidden'}`}
            onClick={handleSelectRecommendedVendors}
          >
            Select Recommended Vendor
          </button>
        </div>
      </div> */}
    </div>
  );
}

// Helper for summary cards
function SummaryCard({ label, value, icon, highlight }) {
  // You can add icon logic here if needed
  return (
    <div
      className={`rounded-xl border bg-card text-card-foreground shadow-sm border-gray-200`}
    >
      <div className="p-4 flex items-center space-x-2">
        {icon}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p
            className={`text-2xl font-bold ${highlight ? "text-green-600" : ""}`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
