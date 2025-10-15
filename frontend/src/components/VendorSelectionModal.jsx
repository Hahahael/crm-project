import React, { useState, useEffect } from "react";
import { LuUser, LuPhone, LuMail, LuSearch, LuX } from "react-icons/lu";

export default function VendorSelectionModal({ open, onClose, allVendors, selectedVendors, onSelectVendor, onAddVendors }) {
    const [search, setSearch] = useState("");
    const [visible, setVisible] = useState(open);
    const [isAnimating, setIsAnimating] = useState(false); // Initialize isAnimating state

    useEffect(() => {
        if (open) {
            setVisible(true);
            setTimeout(() => setIsAnimating(true), 10); // Trigger animation after a short delay
        } else {
            setIsAnimating(false); // triggers fade out
            const timeout = setTimeout(() => setVisible(false), 300); // match with Tailwind duration
            return () => clearTimeout(timeout);
        }
    }, [open]);

    const filteredVendors = allVendors.filter((vendor) => {
        const q = search.toLowerCase();
        const name = (vendor.Name || vendor.name || vendor.Code || "").toString().toLowerCase();
        const contact = (vendor.details?.Name || vendor.contactPerson || "").toString().toLowerCase();
        const email = (vendor.details?.EmailAddress || vendor.email || "").toString().toLowerCase();
        const phone = (vendor.PhoneNumber || vendor.phone || "").toString().toLowerCase();
        return name.includes(q) || contact.includes(q) || email.includes(q) || phone.includes(q);
    });

    const handleToggle = (id) => {
        // id may be vendor.Id or vendor.id
        const matchId = id;
        const isSelected = selectedVendors.some((v) => (v.Id ?? v.id) === matchId);
        if (isSelected) {
            onSelectVendor(selectedVendors.filter((v) => (v.Id ?? v.id) !== matchId));
        } else {
            const found = allVendors.find((v) => (v.Id ?? v.id) === matchId);
            if (found) onSelectVendor([...selectedVendors, found]);
        }
    };

    if (!open && !visible) return null; // Ensure modal is closed when not visible

    // Animation classes
    const overlayClass = `fixed inset-0 z-40 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out ${
        isAnimating ? "opacity-50" : "opacity-0"
    }`;

    const modalClass = `fixed left-1/2 top-1/2 z-50 w-full max-w-4xl max-h-[80vh] overflow-hidden grid translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-white p-6 shadow-xl rounded-lg transition-all duration-300 ease-in-out ${
        isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
    }`;

    return (
        <>
            {/* Overlay with transition and click-outside handler */}
            <div
                className={overlayClass}
                aria-hidden="true"
                onClick={onClose}></div>
            {/* Modal with transition */}
            <div
                role="dialog"
                aria-modal="true"
                className={modalClass}
                onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}>
                    <LuX className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
                <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">Select Vendors</h2>
                    <p className="text-sm text-gray-500">Choose vendors to send this RFQ request. You can select multiple vendors for comparison.</p>
                </div>
                <div className="space-y-4">
                    <div className="relative">
                        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Search allVendors by name, contact person, or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto divide-y divide-gray-200">
                        {filteredVendors.map((vendor, idx) => (
                            <div
                                key={vendor.Id ?? vendor.id ?? idx}
                                className={`p-4 transition-colors cursor-pointer ${
                                    selectedVendors.some((v) => (v.Id ?? v.id) === (vendor.Id ?? vendor.id)) ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"
                                }`}
                                onClick={() => handleToggle(vendor.Id ?? vendor.id)}>
                                <div className="flex items-start space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedVendors.some((v) => (v.Id ?? v.id) === (vendor.Id ?? vendor.id))}
                                        onChange={() => handleToggle(vendor.Id ?? vendor.id)}
                                        className="peer h-4 w-4 shrink-0 rounded-sm border border-gray-400 shadow focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 accent-blue-600"
                                        tabIndex={0}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-gray-900">{vendor.Name || vendor.name || vendor.Code || "-"}</h4>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-500">
                                            <div className="flex items-center space-x-2">
                                                <LuUser className="h-4 w-4" />
                                                <span>{vendor.details?.Name || vendor.contactPerson || "-"}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <LuPhone className="h-4 w-4" />
                                                <span>{vendor.PhoneNumber || vendor.phone || "-"}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <LuMail className="h-4 w-4" />
                                                <span>{vendor.details?.EmailAddress || vendor.email || "-"}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">{vendor.Address || vendor.address || ""}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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
                        onClick={() => onAddVendors(selectedVendors)}>
                        Select {selectedVendors.length} Vendor{selectedVendors.length !== 1 ? "s" : ""}
                    </button>
                </div>
            </div>
        </>
    );
}