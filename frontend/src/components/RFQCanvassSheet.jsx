import { useState, useEffect, useCallback } from "react";
import { LuDownload, LuPrinter, LuFileText, LuCircleCheckBig, LuTrendingDown, LuCircleAlert, LuClock, LuCheck } from "react-icons/lu";

export default function RFQCanvassSheet({ rfq, formItems, formVendors, setFormItems, mode = "create", setFormData, onForApproval, onExportExcel, onExportPDF }) {
    const formData = rfq;
    // Handler to select best vendor per item
    const handleSelectRecommendedVendors = () => {
        const newSelection = {};
        const itemsSource = formItems || [];
        const updatedItems = itemsSource.map((item) => {
            const itemQuotes = generateQuotations(selectedVendorsByItem).filter((q) => q.itemId === item.itemId);
            const minTotal = Math.min(...itemQuotes.map((q) => q.total));
            const bestQuote = itemQuotes.find((q) => q.total === minTotal);
            if (bestQuote) {
                newSelection[item.itemId] = bestQuote.vendorId;
                return {
                    ...item,
                    unitPrice: bestQuote.unitPrice,
                    leadTime: bestQuote.leadTime,
                    quantity: bestQuote.quantity,
                    total: bestQuote.unitPrice * bestQuote.quantity
                };
            }
            return item;
        });
        setSelectedVendorsByItem(newSelection);
        // persist updated items back to wrapper state and parent formData
        setFormItems(updatedItems);
        setFormData((prev) => ({ ...prev, items: updatedItems, selectedVendorsByItem: newSelection }));
    };

    const [selectedVendorsByItem, setSelectedVendorsByItem] = useState(() => {
        // Initialize from formData.selectedVendorsByItem if available, else use bestVendorId
        if (formData.selectedVendorsByItem && Object.keys(formData.selectedVendorsByItem).length > 0) {
            return formData.selectedVendorsByItem;
        }
        const initial = {};
        (formItems || []).forEach((item) => {
            if (item.bestVendorId) initial[item.itemId] = item.bestVendorId;
        });
        return initial;
    });

    // Generate quotations array from items and vendors as state, derived from rfq.items and rfq.vendors
    const generateQuotations = useCallback((selectedVendorsByItem) => {
        const arr = [];
        const itemsSource = formItems || [];
        itemsSource.forEach((item) => {
            (formVendors || []).forEach((vendor) => {
                // vendor.quotes may come from different sources and use snake_case (item_id) or camelCase (itemId)
                const vendorItem = Array.isArray(vendor.quotes)
                    ? vendor.quotes.find((q) => (q.itemId || q.item_id) === (item.itemId || item.item_id))
                    : undefined;

                const unitPrice = vendorItem ? (vendorItem.unitPrice ?? vendorItem.unit_price ?? 0) : 0;
                const quantity = vendorItem
                    ? (vendorItem.quantity ?? vendorItem.Qty ?? vendorItem.qty ?? item.quantity ?? 1)
                    : (item.quantity ?? 1);

                arr.push({
                    itemId: item.itemId ?? item.item_id,
                    vendorId: vendor.vendorId ?? vendor.vendor_id,
                    unitPrice,
                    quantity,
                    leadTime: vendorItem ? (vendorItem.leadTime ?? vendorItem.lead_time) : "-",
                    leadTimeColor: vendorItem ? vendorItem.leadTimeColor ?? vendorItem.lead_time_color : "",
                    total: unitPrice * quantity,
                    // FIX: isSelected should compare selected vendorId for this item
                    isSelected: selectedVendorsByItem[item.itemId ?? item.item_id] === (vendor.vendorId ?? vendor.vendor_id),
                });
            });
        });
        // Mark best option per item
        (formItems || []).forEach((item) => {
            const itemQuotes = arr.filter((q) => q.itemId === item.itemId);
            const minTotal = Math.min(...itemQuotes.map((q) => q.total));
            itemQuotes.forEach((q) => {
                q.isBestOption = q.total === minTotal;
            });
        });
        return arr;
    }, [formItems, formVendors]);

    const [quotations, setQuotations] = useState(() =>
        generateQuotations(
            {
                ...((formItems || []).reduce((acc, item) => {
                    if (item.bestVendorId) acc[item.itemId] = item.bestVendorId;
                    return acc;
                }, {})),
            }
        )
    );

    // Sync quotations when selectedVendorsByItem changes
    useEffect(() => {
        setQuotations(generateQuotations(selectedVendorsByItem));
        // Persist selected vendors for each item in formData
        setFormData(prev => ({ ...prev, selectedVendorsByItem }));
    }, [selectedVendorsByItem, formItems, formVendors, generateQuotations, setFormData]);

    // Handler for selecting a vendor for an item
    const handleSelectVendor = (itemId, vendorId) => {
        // Find the selected quotation
    const selectedQuote = quotations.find(q => q.itemId === itemId && q.vendorId === vendorId);
        // Update all relevant fields in the item
        const updatedItems = (formItems || []).map(item =>
            item.itemId === itemId
                ? {
                    ...item,
                    unitPrice: selectedQuote?.unitPrice ?? item.unitPrice,
                    leadTime: selectedQuote?.leadTime ?? item.leadTime,
                    quantity: selectedQuote?.quantity ?? item.quantity,
                    total: selectedQuote ? selectedQuote.unitPrice * selectedQuote.quantity : item.total
                }
                : item
        );
        // Update selected vendors
        const newSelection = { ...selectedVendorsByItem, [itemId]: vendorId };
        setSelectedVendorsByItem(newSelection);
        // Persist selected vendors for each item in formData and update wrapper items
        setFormItems(updatedItems);
        setFormData(prev => ({ ...prev, items: updatedItems, selectedVendorsByItem: newSelection }));
    };

    console.log("RFQCanvassSheet props:", { formData, mode });
    // Calculate summary, vendorTotals, and recommendedVendor from props
    const totalItems = (formItems || []).length || 0;
    const quotedVendors = (formVendors || []).length || 0;

    console.log("Quotations:", quotations);

    // Mark best option per item
    (formItems || []).forEach((item) => {
        const itemQuotes = quotations.filter((q) => q.itemId === item.itemId);
        const minTotal = Math.min(...itemQuotes.map((q) => q.total));
        itemQuotes.forEach((q) => {
            q.isBestOption = q.total === minTotal;
        });
    });

    console.log(quotations);

    // Calculate vendorTotals from quotations array
    const vendorTotals = (formVendors || []).map((vendor) => {
        let total = quotations.filter((q) => q.vendorId === vendor.vendorId).reduce((sum, q) => sum + q.total, 0);
        return {
            id: vendor.vendorId,
            name: vendor.name || vendor.vendor?.Name || "-",
            total: total,
            recommended: false, // will be set below
            diff: null, // will be set below
        };
    });

    // Find lowest total
    const lowestTotal = vendorTotals.length > 0 ? Math.min(...vendorTotals.map((v) => v.total)) : 0;
    // Mark recommended vendor (lowest total)
    let recommendedVendor = {};
    vendorTotals.forEach((v) => {
        if (v.total === lowestTotal) {
            v.recommended = true;
            recommendedVendor = formData.vendors.find((vendorObj) => vendorObj.name === v.name) || {};
        } else {
            v.recommended = false;
        }
    });
    // Fill diff for non-recommended selectedVendors
    vendorTotals.forEach((v) => {
        if (!v.recommended) {
            v.diff = `+$${(v.total - lowestTotal).toFixed(2)}`;
        }
    });

    const summary = {
        totalItems,
        quotedVendors,
        lowestTotal,
    };
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-medium">Canvass Sheet</h3>
                    <p className="text-sm text-muted-foreground">
                        {rfq?.rfqNumber || "RFQ-XXXX-XXX"} - {rfq?.description || "No Description"}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        className="bg-primary text-white rounded-md px-4 py-2 flex items-center cursor-pointer"
                        onClick={onExportExcel}>
                        <LuDownload className="h-5 w-5 mr-1" />
                        Export Excel
                    </button>
                    <button
                        className="bg-primary text-white rounded-md px-4 py-2 flex items-center cursor-pointer"
                        onClick={onExportPDF}>
                        type="button"
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
                    value={`$${summary?.lowestTotal}`}
                    icon={<LuTrendingDown className="h-5 w-5 text-green-500" />}
                />
                <SummaryCard
                    label="Recommended"
                    value={recommendedVendor?.name}
                    icon={<LuCircleAlert className="h-5 w-5 text-orange-500" />}
                    highlight
                />
            </div>

            {/* Vendor Total Comparison */}
            <div className="rounded-xl border bg-card shadow border-gray-200">
                <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="font-semibold leading-none tracking-tight">Vendor Total Comparison</h3>
                </div>
                <div className="p-6 pt-0 space-y-4">
                    {vendorTotals.map((v, id) => (
                        <div
                            key={v.name}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                v.recommended ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                            }`}>
                            <div className="flex items-center space-x-3">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        v.recommended ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                                    }`}>
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
                                <p className="text-lg font-bold">${v.total}</p>
                                {v.diff && <p className="text-sm text-red-600">{v.diff}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Item-by-Item Comparison */}
            <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="flex flex-col space-y-1.5 p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold leading-none tracking-tight">Item-by-Item Comparison</h3>
                        {/* Add select all or other controls here if needed */}
                    </div>
                </div>
                <div className="p-6 pt-0 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200">
                            <tr>
                                <th></th>
                                <th className="text-left font-light">Item Details</th>
                                {formData.vendors.map((v) => (
                                    <th
                                        key={v.name}
                                        className="text-center min-w-[150px]">
                                        <div>
                                            <p className="font-medium">{v.name}</p>
                                            <p className="text-xs text-muted-foreground">{v.contactPerson}</p>
                                        </div>
                                    </th>
                                ))}
                                <th>Best Option</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(formItems || []).map((item) => (
                                <tr
                                    key={item.itemId}
                                    className="divide-y divide-gray-200">
                                    <td>{/* Checkbox or selection logic here */}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium">{item.name || item.Description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.brand || item.BRAND_ID || item.brand} - {item.partNumber || item.Code}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Qty: {item.quantity} {item.unit}
                                            </p>
                                        </div>
                                    </td>
                                    {formData.vendors.map((v) => {
                                        const quote = quotations.find((q) => q.itemId === item.itemId && q.vendorId === v.vendorId);
                                        console.log("Quote", quote, "is selected:", quote?.isSelected);
                                        return (
                                            <td
                                                key={v.vendorId}
                                                className={`text-center cursor-pointer align-middle relative hover:bg-gray-100 transition-all duration-150 hover:bg-gray-50 ${
                                                    quote?.isSelected ? "bg-blue-50" : ""
                                                }`}
                                                onClick={() => handleSelectVendor(item.itemId, v.vendorId)}>
                                                <div className={`p-2 rounded transition-all duration-150 align-stretch relative`}>
                                                    <p className="font-bold text-lg">{quote ? `$${quote.unitPrice}` : "-"}</p>
                                                    <p className="text-sm text-muted-foreground">Total: {quote ? `$${quote.total}` : "-"}</p>
                                                    <div className="flex items-center justify-center space-x-1 mt-1">
                                                        <LuClock />{" "}
                                                        <span className={`text-xs ${quote?.leadTimeColor ?? ""}`}>{quote?.leadTime ?? "-"}</span>
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
                                                // Find the best option quote for this item
                                                const bestQuote = quotations.find((q) => q.itemId === item.itemId && q.isBestOption);
                                                if (bestQuote) {
                                                    const bestVendor = formData.vendors.find((v) => v.vendorId === bestQuote.vendorId);
                                                    return (
                                                        <>
                                                            <p className="font-bold text-green-600">{bestVendor ? bestVendor.name : "-"}</p>
                                                            <p className="text-sm font-medium">{`$${bestQuote.unitPrice}`}</p>
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
            <div className="flex justify-between items-center">
                <div>
                    <button
                        type="button"
                        className="bg-green-600 hover:bg-green-700 text-white rounded-md px-8 h-10"
                        onClick={handleSelectRecommendedVendors}>
                        Select Recommended Vendor
                    </button>
                </div>
                <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-8 h-10 border-blue-600"
                    onClick={onForApproval}>
                    For Approval
                </button>
            </div>
        </div>
    );
}

// Helper for summary cards
function SummaryCard({ label, value, icon, highlight }) {
    // You can add icon logic here if needed
    return (
        <div className={`rounded-xl border bg-card text-card-foreground shadow-sm border-gray-200`}>
            <div className="p-4 flex items-center space-x-2">
                {icon}
                <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className={`text-2xl font-bold ${highlight ? "text-green-600" : ""}`}>{value}</p>
                </div>
            </div>
        </div>
    );
}