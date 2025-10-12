import React, { useState, useEffect, useRef } from "react";
import { LuX } from "react-icons/lu";

export default function VendorEditModal({ open, onClose, vendor, onSave }) {
    // Local state for transitions
    const [visible, setVisible] = useState(open);
    const [isAnimating, setIsAnimating] = useState(false);

    // Editable fields
    const [paymentTerms, setPaymentTerms] = useState(vendor?.paymentTerms || "");
    const [validUntil, setValidUntil] = useState(vendor?.validUntil || "");
    const [notes, setNotes] = useState(vendor?.notes || "");
    const [quotes, setQuotes] = useState(vendor?.quotes || []);
    const [subtotal, setSubtotal] = useState(vendor?.subtotal || 0);
    const [vat, setVat] = useState(vendor?.vat || 0);
    const [grandTotal, setGrandTotal] = useState(vendor?.grandTotal || 0);
    console.log("VendorEditModal - initial quotes:", quotes);
    const hasInitialized = useRef(false);

    useEffect(() => {
    if (!hasInitialized.current && Array.isArray(vendor?.quotes) && vendor.quotes.length > 0) {
        setQuotes(vendor.quotes);
        hasInitialized.current = true;
    }

    }, [vendor]);
    useEffect(() => {
        if (open) {
            setVisible(true);
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            const timeout = setTimeout(() => setVisible(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [open]);

    useEffect(() => {
        const sub = quotes.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        setSubtotal(sub);
        setVat(sub * 0.05);
        setGrandTotal(sub * 1.05);
    }, [quotes]);

    if (!open && !visible) return null;

    // Overlay transition
    const overlayClass = `fixed inset-0 z-40 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out ${
        isAnimating ? "opacity-50" : "opacity-0"
    }`;

    // Modal transition
    const modalClass = `fixed left-1/2 top-1/2 z-50 grid w-full max-w-6xl max-h-[90vh] overflow-hidden translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg transition-all duration-300 ease-in-out ${
        isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
    } sm:rounded-lg`;

    // Handlers
    const handleItemChange = (idx, field, value) => {
        setQuotes((quotes) => quotes.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
    };

    const handleSave = () => {
        // Normalize quotes to include vendor_id and item_id for backend
        const normalizedQuotes = quotes.map(q => ({
            ...q,
            vendor_id: q.vendor_id || q.vendorId || vendor.vendorId || vendor.vendor?.Id || vendor.vendor_id || vendor.id || null,
            item_id: q.item_id || q.itemId || q.item?.itemId || q.item?.item_id || q.itemId || null,
            unit_price: q.unit_price ?? q.unitPrice ?? q.unitPrice ?? null,
            lead_time: q.lead_time ?? q.leadTime ?? q.leadTime ?? null,
            is_selected: q.is_selected ?? q.isSelected ?? false,
        }));

        onSave({
            ...vendor,
            paymentTerms,
            validUntil,
            notes,
            quotes: normalizedQuotes,
            subtotal,
            vat,
            grandTotal
        });

        console.log("Saved vendor data:", {
            ...vendor,
            paymentTerms,
            validUntil,
            notes,
            quotes,
            subtotal,
            vat,
            grandTotal
        });
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={overlayClass}
                aria-hidden="true"
                onClick={onClose}></div>
            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                className={modalClass}
                onClick={(e) => e.stopPropagation()}>
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
                    <h2 className="text-lg font-semibold leading-none tracking-tight">Edit Quotation - {vendor?.name || "Vendor"}</h2>
                    <p className="text-sm text-gray-500">Update the quotation details for this vendor</p>
                </div>
                {/* Form fields */}
                <div className="space-y-6 overflow-y-auto max-h-[60vh]">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                className="text-sm font-medium leading-none"
                                htmlFor="terms">
                                Payment Terms
                            </label>
                            <input
                                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                id="terms"
                                placeholder="e.g., Net 30"
                                value={paymentTerms}
                                onChange={(e) => setPaymentTerms(e.target.value)}
                            />
                        </div>
                        <div>
                            <label
                                className="text-sm font-medium leading-none"
                                htmlFor="validUntil">
                                Valid Until
                            </label>
                            <input
                                type="date"
                                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                id="validUntil"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* Quotation Items Table */}
                    <div>
                        <label className="text-base font-medium">Quotation Items</label>
                        <div className="border rounded-lg mt-2">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Product Name</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Brand</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Description</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Part No.</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Qty</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Unit</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Lead Time</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Unit Price</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">Amount</th>
                                            <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {quotes.map((q, idx) => (
                                            <tr key={idx}>
                                                <td className="p-3">{q.name}</td>
                                                <td className="p-3">{q.brand}</td>
                                                <td className="p-3">{q.description}</td>
                                                <td className="p-3">{q.partNumber}</td>
                                                <td className="p-3">{q.quantity}</td>
                                                <td className="p-3">{q.unit}</td>
                                                <td className="p-3">
                                                    <input
                                                        className="flex h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Lead time"
                                                        value={q.leadTime}
                                                        onChange={(e) => handleItemChange(idx, "leadTime", e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        className="flex h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        step="0.01"
                                                        value={q.unitPrice}
                                                        onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-3 font-medium">Php {(q.quantity * q.unitPrice).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Totals */}
                            <div className="border-t bg-gray-50 p-4">
                                <div className="flex justify-end">
                                    <div className="text-right space-y-1">
                                        <div className="flex justify-between w-48">
                                            <span>Subtotal:</span>
                                            <span className="font-medium">
                                                ${subtotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between w-48">
                                            <span>VAT (5%):</span>
                                            <span className="font-medium">
                                                ${vat.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between w-48 text-lg font-bold border-t pt-1">
                                            <span>Grand Total:</span>
                                            <span>${grandTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Notes */}
                    <div>
                        <label
                            className="text-sm font-medium leading-none"
                            htmlFor="notes">
                            Notes
                        </label>
                        <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            id="notes"
                            placeholder="Additional notes or comments..."
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}></textarea>
                    </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-gray-300 bg-white shadow-sm hover:bg-gray-100 h-9 px-4 py-2"
                        onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white shadow hover:bg-blue-700 h-9 px-4 py-2"
                        onClick={handleSave}>
                        Save Quotation
                    </button>
                </div>
            </div>
        </>
    );
}