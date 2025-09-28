import React, { useState, useEffect } from "react";

export default function VendorEditModal({ open, onClose, vendor, quotation, onSave }) {
  // Local state for transitions
  const [visible, setVisible] = useState(open);
  const [isAnimating, setIsAnimating] = useState(false);

  // Editable fields
  const [paymentTerms, setPaymentTerms] = useState(quotation?.paymentTerms || "");
  const [validUntil, setValidUntil] = useState(quotation?.validUntil || "");
  const [items, setItems] = useState(quotation?.items || []);
  const [notes, setNotes] = useState(quotation?.notes || "");

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
    setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSave = () => {
    onSave({
      paymentTerms,
      validUntil,
      items,
      notes,
    });
  };

  return (
    <>
      {/* Overlay */}
      <div className={overlayClass} aria-hidden="true" onClick={onClose}></div>
      {/* Modal */}
      <div role="dialog" aria-modal="true" className={modalClass} onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={onClose}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
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
              <label className="text-sm font-medium leading-none" htmlFor="terms">Payment Terms</label>
              <input
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="terms"
                placeholder="e.g., Net 30"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium leading-none" htmlFor="validUntil">Valid Until</label>
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                id="validUntil"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
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
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Brand</th>
                      <th className="text-left p-3 font-medium">Part No.</th>
                      <th className="text-left p-3 font-medium">Qty</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-left p-3 font-medium">Lead Time</th>
                      <th className="text-left p-3 font-medium">Unit Price</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">{item.description}</td>
                        <td className="p-3">{item.brand}</td>
                        <td className="p-3">{item.partNo}</td>
                        <td className="p-3">{item.qty}</td>
                        <td className="p-3">{item.unit}</td>
                        <td className="p-3">
                          <input
                            className="flex h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Lead time"
                            value={item.leadTime}
                            onChange={e => handleItemChange(idx, "leadTime", e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            className="flex h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e => handleItemChange(idx, "unitPrice", e.target.value)}
                          />
                        </td>
                        <td className="p-3 font-medium">${(item.qty * item.unitPrice).toFixed(2)}</td>
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
                      <span className="font-medium">${items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48">
                      <span>VAT (7%):</span>
                      <span className="font-medium">${(items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0) * 0.07).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 text-lg font-bold border-t pt-1">
                      <span>Grand Total:</span>
                      <span>${(items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0) * 1.07).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="text-sm font-medium leading-none" htmlFor="notes">Notes</label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="notes"
              placeholder="Additional notes or comments..."
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            ></textarea>
          </div>
        </div>
        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-gray-300 bg-white shadow-sm hover:bg-gray-100 h-9 px-4 py-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white shadow hover:bg-blue-700 h-9 px-4 py-2"
            onClick={handleSave}
          >
            Save Quotation
          </button>
        </div>
      </div>
    </>
  );
}
