import React from "react";
import { LuDownload, LuPrinter, LuFileText, LuCircleCheckBig, LuTrendingDown, LuCircleAlert, LuClock } from "react-icons/lu";

export default function RFQCanvassSheet({ rfq, mode = "create", onSelectRecommended, onForApproval, onExportExcel, onExportPDF}) {
    console.log("RFQCanvassSheet props:", { rfq, mode });
    // Calculate summary, vendorTotals, and recommendedVendor from props
    const totalItems = rfq.items.length;
    const quotedVendors = rfq.vendors.length;

    // Generate quotations array from items and vendors
    const quotations = [];
    rfq.items.forEach(item => {
        rfq.vendors.forEach(vendor => {
            // Find vendor's item for this rfq item
            const vendorItem = Array.isArray(vendor.items)
                ? vendor.items.find(vi => vi.id === item.id)
                : undefined;
            quotations.push({
                itemId: item.id,
                vendorId: vendor.id,
                price: vendorItem ? (vendorItem.price ?? vendorItem.unitPrice ?? 0) : 0,
                quantity: vendorItem ? (vendorItem.quantity ?? item.quantity ?? 1) : item.quantity ?? 1,
                leadTime: vendorItem ? vendorItem.leadTime : '-',
                leadTimeColor: vendorItem ? vendorItem.leadTimeColor : '',
                total: vendorItem ? ((vendorItem.price ?? vendorItem.unitPrice ?? 0) * (vendorItem.quantity ?? item.quantity ?? 1)) : 0,
                isSelected: item.bestVendorId === vendor.id // true if this vendor is selected for this item
            });
        });
    });

    // Mark best option per item
    rfq.items.forEach(item => {
        const itemQuotes = quotations.filter(q => q.itemId === item.id);
        const minTotal = Math.min(...itemQuotes.map(q => q.total));
        itemQuotes.forEach(q => {
            q.isBestOption = q.total === minTotal;
        });
    });

    console.log(quotations);

    // Calculate vendorTotals from quotations array
    const vendorTotals = rfq.vendors.map(vendor => {
        let total = quotations
            .filter(q => q.vendorId === vendor.id)
            .reduce((sum, q) => sum + q.total, 0);
        return {
            id: vendor.id,
            name: vendor.name,
            total: total,
            recommended: false, // will be set below
            diff: null // will be set below
        };
    });

    // Find lowest total
    const lowestTotal = vendorTotals.length > 0 ? Math.min(...vendorTotals.map(v => v.total)) : 0;
    // Mark recommended vendor (lowest total)
    let recommendedVendor = {};
    vendorTotals.forEach(v => {
        if (v.total === lowestTotal) {
            v.recommended = true;
            recommendedVendor = rfq.vendors.find(vendorObj => vendorObj.name === v.name) || {};
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
                        <thead className="border-b border-gray-200">
                            <tr>
                                <th></th>
                                <th className="text-left font-light">Item Details</th>
                                {rfq.vendors.map((v) => (
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
                            {rfq.items.map((item, idx) => (
                                <tr key={item.id} className="divide-y divide-gray-200">
                                    <td>{/* Checkbox or selection logic here */}</td>
                                    <td>
                                        <div>
                                            <p className="font-medium">{item.label}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.brand} - {item.partNumber}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Qty: {item.quantity} {item.unit}
                                            </p>
                                        </div>
                                    </td>
                                    {rfq.vendors.map((v) => (
                                        <td key={v.id} className="text-center">
                                            {(() => {
                                                // Find the quotations for this item and vendor
                                                const quote = quotations.find(q => q.itemId === item.id && q.vendorId === v.id);
                                                return (
                                                    <div className={`p-2 rounded ${quote?.isSelected ? "bg-green-50 border border-green-200" : ""}`}>
                                                        <p className="font-bold text-lg">{quote ? `$${quote.price}` : '-'}</p>
                                                        <p className="text-sm text-muted-foreground">Total: {quote ? `$${quote.total}` : '-'}</p>
                                                        <div className="flex items-center justify-center space-x-1 mt-1">
                                                            <LuClock /> <span className={`text-xs ${quote?.leadTimeColor ?? ''}`}>{quote?.leadTime ?? '-'}</span>
                                                        </div>
                                                        {quote?.isSelected && (
                                                            <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold bg-green-100 text-green-800 text-xs mt-1">
                                                                Lowest
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    ))}
                                    <td className="border-b border-gray-200">
                                        <div className="text-center">
                                            {(() => {
                                                // Find the best option quote for this item
                                                const bestQuote = quotations.find(q => q.itemId === item.id && q.isBestOption);
                                                if (bestQuote) {
                                                    const bestVendor = rfq.vendors.find(v => v.id === bestQuote.vendorId);
                                                    return (
                                                        <>
                                                            <p className="font-bold text-green-600">{bestVendor ? bestVendor.name : '-'}</p>
                                                            <p className="text-sm font-medium">{`$${bestQuote.price}`}</p>
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
