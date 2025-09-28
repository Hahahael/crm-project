import React from "react";
import { LuDownload, LuPrinter, LuFileText, LuCircleCheckBig, LuTrendingDown, LuCircleAlert } from "react-icons/lu";

export default function RFQCanvassSheet({ rfq, items = [], selectedVendors = [], mode = "create", onSelectRecommended, onForApproval, onExportExcel, onExportPDF}) {
    console.log("RFQCanvassSheet props:", { rfq, items, selectedVendors, mode });
        // Calculate summary, vendorTotals, and recommendedVendor from props
        const totalItems = items.length;
        const quotedVendors = selectedVendors.filter(v => v.status === "Quoted").length;

        // Calculate vendorTotals from items and selectedVendors
        const vendorTotals = selectedVendors.map(vendor => {
            // Sum up all item totals for this vendor
            let total = items.reduce((sum, item) => {
                const quote = Array.isArray(item.vendorQuotes)
                  ? item.vendorQuotes.find(q => q.vendor_id === vendor.id)  
                  : undefined;
                return sum + (quote ? quote.total : 0);
            }, 0);
            return {
                id: vendor.id,
                name: vendor.name,
                total: total,
                recommended: vendor.id === items[0]?.bestVendorId, // Mark recommended for first item (update logic if needed)
                diff: null // Will fill below
            };
        });

        // Find lowest total
        const lowestTotal = vendorTotals.length > 0 ? Math.min(...vendorTotals.map(v => v.total)) : 0;
        // Mark recommended vendor (lowest total)
        let recommendedVendor = {};
        vendorTotals.forEach(v => {
            if (v.total === lowestTotal) {
                v.recommended = true;
                recommendedVendor = selectedVendors.find(vendor => vendor.name === v.name) || {};
            } else {
                v.recommended = false;
            }
        });
        // Fill diff for non-recommended selectedVendors
        vendorTotals.forEach(v => {
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
                    <button className="bg-primary text-white rounded-md px-4 py-2 flex items-center cursor-pointer" onClick={onExportPDF}>
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
                    icon={<LuFileText className='h-5 w-5 text-blue-500' />}
                />
                <SummaryCard
                    label="Quoted Vendors"
                    value={summary?.quotedVendors}
                    icon={<LuCircleCheckBig className='h-5 w-5 text-green-500' />}
                />
                <SummaryCard
                    label="Lowest Total"
                    value={`$${summary?.lowestTotal}`}
                    icon={<LuTrendingDown className='h-5 w-5 text-green-500' />}
                />
                <SummaryCard
                    label="Recommended"
                    value={recommendedVendor?.name}
                    icon={<LuCircleAlert className='h-5 w-5 text-orange-500' />}
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
                        <thead>
                            <tr>
                                <th></th>
                                <th>Item Details</th>
                                {selectedVendors.map((v) => (
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
                            {items.map((item, idx) => (
                                <tr key={item.id}>
                                    <td>{/* Checkbox or selection logic here */}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium">{item.label}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.brand} - {item.partNo}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Qty: {item.qty} {item.unit}
                                            </p>
                                        </div>
                                    </td>
                                    {selectedVendors.map((v) => (
                                        <td
                                            key={v.id}
                                            className="text-center">
                                            {(() => {
                                                const quote = Array.isArray(item.vendorQuotes)
                                                  ? item.vendorQuotes.find(q => q.vendor_id === v.id)
                                                  : undefined;
                                                return (
                                                    <div className={`p-2 rounded ${item.bestVendorId === v.id ? "bg-green-50 border border-green-200" : ""}`}>
                                                        <p className="font-bold text-lg">{quote ? `$${quote.price}` : '-'}</p>
                                                        <p className="text-sm text-muted-foreground">Total: {quote ? `$${quote.total}` : '-'}</p>
                                                        <div className="flex items-center justify-center space-x-1 mt-1">
                                                            <span className={`text-xs ${quote ? quote.lead_time_color : ''}`}>{quote ? quote.lead_time : '-'}</span>
                                                        </div>
                                                        {item.bestVendorId === v.id && (
                                                            <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 text-xs mt-1">
                                                                Lowest
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    ))}
                                    <td>
                                        <div className="text-center">
                                            <p className="font-bold text-green-600">{item.bestVendor}</p>
                                            {(() => {
                                                // Find the best vendor quote by vendor_id
                                                const bestQuote = Array.isArray(item.vendorQuotes)
                                                  ? item.vendorQuotes.find(q => q.vendor_id === item.bestVendorId)
                                                  : undefined;
                                                return (
                                                    <p className="text-sm font-medium">{bestQuote ? `$${bestQuote.price}` : '-'}</p>
                                                );
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
                        onClick={onSelectRecommended}>
                        Select Recommended Vendor ({recommendedVendor.name})
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
