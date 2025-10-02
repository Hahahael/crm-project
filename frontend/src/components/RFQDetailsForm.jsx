import { useEffect, useState } from "react";
import { LuPlus, LuTrash } from "react-icons/lu";
import { useRef } from "react";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js";

export default function RFQDetailsForm({ rfq, setFormData, mode }) {
    const [rfqItems, setRfqItems] = useState(rfq.items || []);
    const [itemsList, setItemsList] = useState([]);
    const [errors, setErrors] = useState(null);
    // formData and setFormData are now managed by parent
    const formData = rfq;
    // setFormData is now passed as a prop

    const onItemChange = (itemId, field, value) => {
        setRfqItems((prevItems) => prevItems.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
        console.log(rfqItems);
    };

    const onRemoveItem = (itemId) => {
        setRfqItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    };

    const onAddItem = () => {
        const newItem = { id: null, item_id: null, name: "", model: "", description: "", quantity: 1, price: 0 };
        setRfqItems((prevItems) => [...prevItems, newItem]);
    };

    const dropdownRefs = useRef({});

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await apiBackendFetch("/api/inventory/items");
                const data = await res.json();
                setItemsList(data);
            } catch (err) {
                console.error("Failed to fetch items", err);
            }
        };

        fetchItems();
    }, []);

    // Close dropdown on outside click for product name dropdowns
    useEffect(() => {
        const handleClickOutside = (e) => {
            setRfqItems((prevItems) => prevItems.map((item) => {
                const ref = dropdownRefs.current[item.id];
                if (item.showDropdown && ref && !ref.contains(e.target)) {
                    return { ...item, showDropdown: false };
                }
                return item;
            }));
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            handleSetRfqItems(rfqItems);
        }
    }, [rfqItems]);

    // Example usage inside RFQDetailsForm:
    const handleSetRfqItems = (newRfqItems) => {
        setFormData(prev => ({
            ...prev,
            items: newRfqItems
        }));
    };

    return (
        <div className="w-full h-full space-y-6">
            {/* Basic Information */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
                <div className="flex flex-col space-y-1.5">
                    <h3 className="font-semibold leading-none tracking-tight">Basic Information</h3>
                </div>
                <div className="pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <label htmlFor="rfqNumber">RFQ Number</label>
                            <input
                                id="rfqNumber"
                                value={formData.rfqNumber}
                                readOnly
                                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
                            />
                        </div>
                        <div>
                            <label htmlFor="rfqDate">RFQ Date</label>
                            <input
                                id="rfqDate"
                                type="date"
                                value={utils.formatDate(formData.rfqDate, "YYYY-MM-DD")}
                                onChange={(e) => setFormData((prev) => ({ ...prev, rfqDate: e.target.value }))}
                                className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50
                                                                    ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="dueDate">Due Date</label>
                            <input
                                id="dueDate"
                                type="date"
                                value={utils.formatDate(formData.dueDate, "YYYY-MM-DD")}
                                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                                className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50
                                                                    ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description">Description</label>
                        <input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50
                                                            ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="salesLeadRef">Sales Lead Reference</label>
                            <input
                                id="salesLeadRef"
                                value={formData.slNumber}
                                readOnly
                                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
                            />
                        </div>
                        <div>
                            <label htmlFor="accountName">Account Name</label>
                            <input
                                id="accountName"
                                value={formData.accountId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, accountId: e.target.value }))}
                                className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50
                                                                    ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="terms">Payment Terms</label>
                        <input
                            id="terms"
                            value={formData.paymentTerms}
                            onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                            className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50
                                                            ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="notes">Notes</label>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                            className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50
                                                            ${errors?.endUser ? "border-red-500" : "border-gray-200"}`}
                        />
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col space-y-1.5 pb-6">
                    <h3 className="font-bold leading-none tracking-tight">Items</h3>
                    <p className="text-sm text-gray-500">List of items included in this RFQ</p>
                </div>
                <div className="space-y-4">
                    <div className="rounded-md border border-gray-200">
                        <div className="relative w-full overflow-overlay">
                            <table className="min-w-full border-collapse text-left text-sm">
                                <thead className="border-b border-gray-200">
                                    <tr className="border-b border-gray-200 transition-colors hover:bg-gray-50">
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
                                <tbody className="divide-y divide-gray-200">
                                    {rfqItems?.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-100 transition-all duration-200">
                                            <td className="text-sm p-2 align-middle" style={{ position: 'relative', overflow: 'visible' }}>
                                                <div className="relative" ref={el => { dropdownRefs.current[item.id] = el; }} style={{ overflow: 'visible' }}>
                                                    <input
                                                        type="text"
                                                        value={item.name || ""}
                                                        onChange={(e) => {
                                                            onItemChange(item.id, "name", e.target.value);
                                                            setRfqItems((prevItems) => prevItems.map((itm) =>
                                                                itm.id === item.id ? { ...itm, showDropdown: true, searchQuery: e.target.value } : itm
                                                            ));
                                                        }}
                                                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                                                        onFocus={() => setRfqItems((prevItems) => prevItems.map((itm) =>
                                                            itm.id === item.id ? { ...itm, showDropdown: true } : itm
                                                        ))}
                                                        autoComplete="off"
                                                    />
                                                    {item.showDropdown && (
                                                        <div style={{ position: 'absolute', left: 0, bottom: '100%', zIndex: 20, width: 'max-content', minWidth: '100%', maxWidth: '400px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'visible' }}>
                                                            <ul className="max-h-40 overflow-y-auto" style={{ margin: 0, padding: 0 }}>
                                                                {(itemsList || [])
                                                                    .filter(i =>
                                                                        (i.name || i.description || "").toLowerCase().includes((item.searchQuery || item.name || "").toLowerCase()) &&
                                                                        !rfqItems.some(tr => tr.item_id === i.id)
                                                                    )
                                                                    .map((itm) => (
                                                                    <li
                                                                        key={itm.id}
                                                                        onClick={() => {
                                                                            console.log("Selected item: ", itm);
                                                                            setRfqItems((prevItems) => prevItems.map((it) =>
                                                                                it === item ? {
                                                                                    ...it,
                                                                                    id: itm.id, // set id to selected item's id
                                                                                    item_id: itm.id, // also store as item_id for backend
                                                                                    name: itm.name,
                                                                                    brand: itm.brand || "",
                                                                                    partNumber: itm.partNumber || "",
                                                                                    leadTime: itm.leadTime || "",
                                                                                    unit: itm.unit || "",
                                                                                    model: itm.model || "",
                                                                                    description: itm.description || "",
                                                                                    quantity: it.quantity || 1,
                                                                                    price: itm.price || 0,
                                                                                    showDropdown: false,
                                                                                    searchQuery: ""
                                                                                } : it
                                                                            ));
                                                                        }}
                                                                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm" style={{ listStyle: 'none' }}>
                                                                        {itm.name || itm.description}
                                                                    </li>
                                                                ))}
                                                                {(itemsList || []).filter(i => (i.name || i.description || "").toLowerCase().includes((item.searchQuery || item.name || "").toLowerCase())).length === 0 && (
                                                                    <li className="px-3 py-2 text-gray-500 text-sm" style={{ listStyle: 'none' }}>No results found</li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-sm p-2 align-middle">
                                                <input
                                                    type="text"
                                                    value={item.brand || ""}
                                                    readOnly
                                                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                                                />
                                            </td>
                                            <td className="text-sm p-2 align-middle">
                                                <input
                                                    type="text"
                                                    value={item.description || ""}
                                                    readOnly
                                                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                                                />
                                            </td>
                                            <td className="text-sm p-2 align-middle">
                                                <input
                                                    type="text"
                                                    value={item.partNumber || ""}
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
                                                    onChange={e => {
                                                        const value = Math.max(1, Number(e.target.value));
                                                        onItemChange(item.id, "quantity", value);
                                                    }}
                                                />
                                            </td>
                                            <td className="text-sm p-2 align-middle">
                                                <input
                                                    type="text"
                                                    value={item.unit || ""}
                                                    readOnly
                                                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                                                />
                                            </td>
                                            <td className="text-sm p-2 align-middle">
                                                <input
                                                    type="text"
                                                    value={item.price || ""}
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
                                                    value={`Php ${item.price * item.quantity || ""}`}
                                                    readOnly
                                                    className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                                                />
                                            </td>
                                            <td className="text-sm p-2 align-middle">
                                                <button
                                                    type="button"
                                                    className="text-red-600 hover:text-red-800 text-sm"
                                                    onClick={() => onRemoveItem(item.id)}>
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
                            onClick={onAddItem}>
                            <LuPlus className="mr-2" /> Add Item
                        </button>
                    </div>
                    <div className="flex justify-end space-y-2">
                        <div className="w-64">
                            <div className="flex justify-between py-2">
                                <span className="font-medium">Subtotal:</span>
                                <span>{formData.subTotal}</span>
                            </div>
                            <div className="flex justify-between py-2 border-t">
                                <span className="font-medium">VAT (5%):</span>
                                <span>{formData.vat}</span>
                            </div>
                            <div className="flex justify-between py-2 border-t font-bold">
                                <span>Grand Total:</span>
                                <span>{formData.grandTotal}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
