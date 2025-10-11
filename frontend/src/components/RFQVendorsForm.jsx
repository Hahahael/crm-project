import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import VendorSelectionModal from "./VendorSelectionModal";
import VendorEditModal from "./VendorEditModal";
import {
    LuActivity,
    LuCalendar,
    LuCalendarClock,
    LuClock,
    LuCoins,
    LuEllipsis,
    LuPhone,
    LuPlane,
    LuPlus,
    LuSend,
    LuSquarePen,
    LuTrash,
    LuUser,
} from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import { getVendorStatus } from "../helper/utils";

const TRANSITION_MS = 150;

export default function RFQVendorsForm({ rfq, setFormData, onVendorAction, onSendRFQ }) {
    const formData = rfq || {};
    console.log("RFQVendorsForm render", { rfq, formData });
    const vendorDisplayName = (v) => v?.name || v?.vendor?.Name || v?.vendor?.Name || "-";
    const vendorContactPerson = (v) => v?.contactPerson || v?.vendor?.details?.[0]?.Name || v?.vendor?.details?.[0]?.EmailAddress || "-";
    const vendorPhone = (v) => v?.phone || v?.vendor?.PhoneNumber || "-";
    // Modal state and selection logic
    const [modalOpen, setModalOpen] = useState(false);
    const [modalSelection, setModalSelection] = useState();
    const [allVendors, setAllVendors] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const buttonRefs = useRef({});
    const menuRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    useEffect(() => {
        async function fetchAllVendors() {
            try {
                // Prefer MSSQL inventory vendors (enriched) when available
                const mssqlRes = await apiBackendFetch("/api/mssql/inventory/vendors?limit=1000");
                if (mssqlRes && mssqlRes.ok) {
                    const mssqlData = await mssqlRes.json();
                    // mssql route returns { count, rows }
                    const rows = Array.isArray(mssqlData.rows) ? mssqlData.rows : [];
                    const normalized = rows.map((v) => ({
                        id: v.Id,
                        vendorId: v.Id,
                        name: v.Name || v.Code || "",
                        contactPerson: v.details?.[0]?.Name || "",
                        phone: v.PhoneNumber || "",
                        email: v.details?.[0]?.EmailAddress || "",
                        address: v.Address || "",
                        // Keep original MSSQL row available as `vendor` for components that expect it
                        vendor: v,
                    }));
                    setAllVendors(normalized);
                    return;
                }

                // Fallback to local vendors endpoint if MSSQL isn't reachable or returns non-ok
                const allVendorsRes = await apiBackendFetch("/api/rfqs/vendors");
                if (!allVendorsRes || !allVendorsRes.ok) throw new Error("Failed to fetch RFQ Vendors");
                const data = await allVendorsRes.json();
                // Ensure local vendors have an `id` and minimal shape
                const localNormalized = (Array.isArray(data) ? data : []).map(v => ({
                    id: v.id ?? v.Id ?? null,
                    vendorId: v.id ?? v.Id ?? null,
                    name: v.name || v.Name || "",
                    contactPerson: v.contactPerson || v.contact_person || "",
                    phone: v.phone || v.PhoneNumber || "",
                    email: v.email || "",
                    address: v.address || "",
                    vendor: v,
                }));
                setAllVendors(localNormalized);
            } catch (err) {
                console.error("Failed to fetch all vendors", err);
                setAllVendors([]);
            }
        }
        fetchAllVendors();
    }, []);

    // Compute menu position
    const computePosition = (btn) => {
        const rect = btn.getBoundingClientRect();
        return {
            top: rect.bottom + window.scrollY + 2,
            left: rect.right + window.scrollX,
        };
    };

    const openFor = (userId) => {
        const btn = buttonRefs.current[userId];
        if (!btn) return;
        setMenuPosition(computePosition(btn));
        setOpenMenuId(userId);
        setIsMounted(true);
        requestAnimationFrame(() => setIsVisible(true));
    };

    const startClose = () => {
        setIsVisible(false);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => {
            setIsMounted(false);
            setOpenMenuId(null);
        }, TRANSITION_MS + 40);
    };

    const toggleMenu = (userId) => {
        if (openMenuId === userId) {
            startClose();
        } else if (isMounted) {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }
            setMenuPosition(computePosition(buttonRefs.current[userId]));
            setOpenMenuId(userId);
            setIsVisible(true);
        } else {
            openFor(userId);
        }
    };

    // Available vendors for selection (could be passed as prop or fetched)
    // For demo, use all vendors not already added

    const handleAddVendorClick = () => {
        setModalSelection(formData.vendors || []);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleSelectVendor = (vendors) => {
        setModalSelection(vendors);
    };

    const handleAddVendors = (vendors) => {
        // Find vendor objects from allVendors by matching id in vendorObj
        const addedVendors = allVendors.filter((v) => vendors.some((obj) => obj.id === v.id));
        // Only add vendors that are not already selected, and remove those not in modal selection
        const prevIds = formData.vendors.map((v) => v.id);
        const modalIds = vendors.map((v) => v.id);
        const newSelection = [
            ...formData.vendors.filter(v => modalIds.includes(v.id)), // keep only those still selected
            ...addedVendors.filter(v => !prevIds.includes(v.id)).map(v => ({
                ...v,
                vendorId: v.id, // backend vendor id reference
                paymentTerms: "",
                validUntil: "",
                items: (formData.items || []).map(item => ({ ...item, price: null, leadTime: "" })), // add items from rfq with null price and empty leadTime
                notes: ""
            }))
        ];
        if (onVendorAction) {
            // If none selected, remove all
            if (modalIds.length === 0) {
                formData.vendors.forEach((vendor) => onVendorAction(vendor.id, "delete"));
            } else {
                addedVendors.forEach((vendor) => {
                    if (!prevIds.includes(vendor.id)) {
                        onVendorAction(vendor.id, "add", vendor);
                    }
                });
                formData.vendors.forEach((vendor) => {
                    if (!modalIds.includes(vendor.id)) {
                        onVendorAction(vendor.id, "delete");
                    }
                });
            }
        }
        setFormData((prev) => ({ ...prev, vendors: newSelection }));
        setModalOpen(false);
    };

    // Remove vendor handler
    const handleDelete = (vendorId) => {
        setFormData((prev) => ({
            ...prev,
            vendors: prev.vendors.filter((v) => v.id !== vendorId),
        }));
        if (onVendorAction) onVendorAction(vendorId, "delete");
        startClose();
    };

    const handleEditQuotation = (vendor) => {
        setEditingVendor(vendor);
        setShowVendorModal(true);
        setIsMounted(false);
        setOpenMenuId(null); // Hide context menu
    };

    // Ensure vendor items are updated and reflected in formData
    const handleVendorSave = (updatedVendor) => {
        setFormData(prev => {
            const updatedVendors = (prev.vendors || []).map(v => v.id === updatedVendor.id ? updatedVendor : v);
            return { ...prev, vendors: updatedVendors };
        });
        setShowVendorModal(false);
    };

    // In RFQVendorsForm, add a handler to update vendor items after editing
    // Outside click handler
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!openMenuId) return;
            const btn = buttonRefs.current[openMenuId];
            if (btn?.contains(e.target)) return;
            if (menuRef.current?.contains(e.target)) return;
            startClose();
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenuId]);

    return (
        <div>
            {modalOpen && (
                <VendorSelectionModal
                    open={modalOpen}
                    onClose={handleCloseModal}
                    allVendors={allVendors}
                    selectedVendors={modalSelection}
                    onSelectVendor={handleSelectVendor}
                    onAddVendors={handleAddVendors}
                />
            )}
            {showVendorModal && (
                <VendorEditModal
                    open={showVendorModal}
                    vendor={editingVendor}
                    items={editingVendor?.items || rfq.items}
                    onClose={() => setShowVendorModal(false)}
                    onSave={handleVendorSave}
                />
            )}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-medium">Vendor Quotations</h3>
                    <p className="text-sm text-muted-foreground">Manage vendors and their quotations for this RFQ</p>
                </div>
                <button
                    type="button"
                    className="bg-gray-900 text-white rounded-md px-4 py-2 flex items-center shadow-xs hover:bg-gray-600 transition-all duration-200 cursor-pointer"
                    onClick={handleAddVendorClick}>
                    <LuPlus className="mr-2" /> Add Vendor
                </button>
            </div>
            <div className="grid gap-4">
                {formData.vendors.map((vendor, id) => (
                    <div
                        key={id}
                        className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow relative">
                        <div className="flex flex-col space-y-1.5 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold tracking-tight text-lg">{vendorDisplayName(vendor)}</h3>
                                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                        <LuUser className="h-4 w-4 text-gray-500" />
                                        <div className="flex items-center space-x-1 mr-4 text-gray-500">
                                            <span>{vendorContactPerson(vendor)}</span>
                                        </div>
                                        <LuPhone className="h-4 w-4 text-gray-500" />
                                        <div className="flex items-center space-x-1 text-gray-500">
                                            <span>{vendorPhone(vendor)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div
                                        className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                                            getVendorStatus(vendor.quotes) === "Quoted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                        }`}>
                                        {getVendorStatus(vendor.quotes)}
                                    </div>
                                    <button
                                        ref={(el) => (buttonRefs.current[vendor.id] = el)}
                                        type="button"
                                        onClick={() => toggleMenu(vendor.id)}
                                        className="h-8 rounded-md px-3 text-xs hover:bg-gray-100 transition-all cursor-pointer">
                                        <LuEllipsis className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 pt-0">
                            {getVendorStatus(vendor.quotes) === "Quoted" ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <LuCoins className="h-5 w-5 text-gray-500 mr-2" />
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium">Php {vendor.totalAmount}</p>
                                            <p className="text-xs text-muted-foreground">Total Amount</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <LuCalendar className="h-5 w-5 text-gray-500 mr-2" />
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium">{vendor.quoteDate}</p>
                                            <p className="text-xs text-muted-foreground">Quote Date</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <LuClock className="h-5 w-5 text-gray-500 mr-2" />
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium">{vendor.validUntil}</p>
                                            <p className="text-xs text-muted-foreground">Valid Until</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <LuCalendarClock className="h-5 w-5 text-gray-500 mr-2" />
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium">{vendor.paymentTerms}</p>
                                            <p className="text-xs text-muted-foreground">Payment Terms</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <LuClock className="h-5 w-5 text-yellow-800" />
                                        <span className="text-sm text-yellow-800">Waiting for quotation from vendor</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md px-3 py-2 text-xs flex items-center hover:bg-gray-100 transition-all text-black cursor-pointer shadow-sm bg-white border border-gray-200"
                                        onClick={() => onSendRFQ(id)}>
                                        <LuSend className="h-4 w-4 text-black mr-1" />
                                        Send RFQ
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Context menu */}
            {isMounted &&
                createPortal(
                    (() => {
                        const vendor = formData.vendors.find((v) => v.id === openMenuId);
                        const sendLabel = vendor?.status === "Quoted" ? "Resend RFQ" : "Send RFQ";
                        return (
                            <div
                                ref={menuRef}
                                className="absolute z-50 w-40 rounded-md border border-gray-200 bg-white shadow-lg"
                                style={{
                                    top: menuPosition.top,
                                    left: menuPosition.left,
                                    transform: isVisible ? "translateX(-100%) translateY(0)" : "translateX(-100%) translateY(-6px)",
                                    opacity: isVisible ? 1 : 0,
                                    transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
                                }}>
                                <ul className="flex flex-col text-sm text-gray-700 py-1">
                                    <li
                                        className="cursor-pointer px-2 mx-1 py-1.5 hover:bg-gray-100 flex transition-all duration-200 rounded-sm"
                                        >
                                        <LuSend className="my-auto mr-2" /> {sendLabel}
                                    </li>
                                    <li
                                        className="cursor-pointer px-2 mx-1 py-1.5 hover:bg-gray-100 flex transition-all duration-200 rounded-sm"
                                        onClick={() => handleEditQuotation(vendor)}>
                                        <LuSquarePen className="my-auto mr-2" /> Edit Quotation
                                    </li>
                                    <li
                                        className="cursor-pointer px-2 mx-1 py-1.5 text-red-600 hover:bg-gray-100 flex transition-all duration-200 rounded-sm"
                                        onClick={() => handleDelete(openMenuId)}>
                                        <LuTrash className="my-auto mr-2" /> Remove Vendor
                                    </li>
                                </ul>
                            </div>
                        );
                    })(),
                    document.body
                )}
        </div>
    );
}
