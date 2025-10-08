//src/pages/QuotationsPage
import { useState, useEffect, useRef } from "react";
import { LuBell, LuCircleAlert, LuClipboard, LuFileText, LuMessageCircle, LuSearch, LuSend, LuX } from "react-icons/lu";
import QuotationsTable from "../components/QuotationsTable";
import TechnicalDetails from "../components/TechnicalDetails";
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";
import RFQCanvassSheet from "../components/RFQCanvassSheet";

export default function QuotationsPage() {
    const timeoutRef = useRef();

    const [quotations, setQuotations] = useState([]);
    const [mssqlQuotations, setMssqlQuotations] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    // kept for future UI tabs (prefixed with _ to avoid unused-var lint)
    const [_selectedTab, _setSelectedTab] = useState("details");
    const [newAssignedQuotations, setNewAssignedQuotations] = useState([]);
    const [selectedTR, setSelectedTR] = useState(null);
    const [selectedRFQ, setSelectedRFQ] = useState(null);
    const [statusSummary, _setStatusSummary] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

    const fetchAllData = async () => {
        try {
            const quotationsRes = await apiBackendFetch("/api/quotations");
            if (!quotationsRes.ok) throw new Error("Failed to fetch Quotations");

            const quotationsData = await quotationsRes.json();
            setQuotations(quotationsData);
            console.log("Fetched Quotations (Postgres):", quotationsData);

            // Fetch MSSQL quotations and merge (best-effort)
            await fetchMssqlQuotations();

            // Fetch status summary
            // const summaryRes = await apiBackendFetch("/api/rfqs/summary/status");
            // if (summaryRes.ok) {
            //     const summaryData = await summaryRes.json();
            //     setStatusSummary({
            //         total: Number(summaryData.total) || 0,
            //         pending: Number(summaryData.pending) || 0,
            //         inProgress: Number(summaryData.inProgress) || 0,
            //         completed: Number(summaryData.completed) || 0,
            //     });
            // }
            setTimeout(() => setLoading(false), 500);
        } catch (err) {
            console.error("Error retrieving Quotations:", err);
            setError("Failed to fetch Quotations.");
        }
    };

    const fetchMssqlQuotations = async () => {
        try {
            const res = await apiBackendFetch('/api/mssql/quotations');
            if (!res.ok) {
                console.warn('Failed to fetch MSSQL quotations', res.status);
                return;
            }
            const data = await res.json();
            setMssqlQuotations(data);
            // Merge MSSQL results into the main quotations list (append)
            if (Array.isArray(data) && data.length > 0) {
                setQuotations((prev) => [...prev, ...data]);
            }
            console.log('Fetched MSSQL quotations:', data);
        } catch (err) {
            console.error('Error fetching MSSQL quotations:', err);
        }
    };

    const fetchCurrentUser = async () => {
        try {
            const res = await apiBackendFetch("/auth/me");
            if (res.ok) {
                const data = await res.json();
                setCurrentUser(data.user);
            }
        } catch (err) {
            console.error("Failed to fetch current user", err);
        }
    };

    const fetchNewAssignedQuotations = async () => {
        if (!currentUser) return;
        try {
            const res = await apiBackendFetch(`/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("Quotation")}`);

            if (res.ok) {
                const data = await res.json();
                setNewAssignedQuotations(data);
            }
        } catch (err) {
            console.error("Failed to fetch assigned Quotations", err);
        }
    };

    const getTRAndRFQ = async (quotation) => {
        try {
            console.log("Fetching TR and RFQ for quotation:", quotation);
            const trId = quotation.trId || null;
            const rfqId = quotation.rfqId || null;

            if (trId) {
                const trRes = await apiBackendFetch(`/api/technicals/${trId}`);
                if (trRes.ok) {
                    const trData = await trRes.json();
                    setSelectedTR(trData);
                    console.log("Fetched TR data:", trData);
                }
            }

            if (rfqId) {
                const rfqRes = await apiBackendFetch(`/api/rfqs/${rfqId}`);
                if (rfqRes.ok) {
                    const rfqData = await rfqRes.json();
                    setSelectedRFQ(rfqData);
                    console.log("rfqData:", rfqData)
                    console.log("Fetched RFQ data:", rfqData);
                }
            }
            setTimeout(() => setLoading(false), 500);
        } catch (err) {
            console.error("Error fetching TR and RFQ:", err);
        }
    }

    // Build MSSQL payload from our frontend quotation object
    // Prefers RFQ data when available, falls back to TR when not.
    // Maps RFQ/TR line items into MSSQL quotation_details using best-effort field mapping.
    const buildMssqlPayload = (q) => {
        // Source: prefer rfq, fallback to tr
        const src = q.rfq || q.tr || q;

        // Try to find a customer id from several possible locations
        const customerId = q.accountId || q.account_id || q.account?.id || q.accountId || q.workorder?.account_id || q.wo_id || null;
        const code = q.refNumber || (q.rfq && q.rfq.rfqNumber) || q.rfq?.rfq_number || q.Code || q.QuotationNo || null;
        const totalQty = q.totalQty || q.TotalQty || src?.totalQty || src?.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
        const validityDate = q.validityDate || q.ValidityDate || q.dueDate || src?.dueDate || null;
        const dateModified = new Date().toISOString();
        const notes = q.notes || q.title || q.description || src?.notes || null;

        const quotation = {
            Code: code,
            Customer_Id: customerId ? Number(customerId) : null,
            TotalQty: Number(totalQty) || 0,
            ValidityDate: validityDate ? validityDate : null,
            DateModified: dateModified,
            Notes: notes,
        };

        // Map line items -> quotation_details
        const items = Array.isArray(src?.items) ? src.items : [];
        const details = items.map((item) => {
            const qty = Number(item.quantity) || 0;
            // unitPrice may come from selected vendor quote (rfqsRoutes sets item.unitPrice when a selected quote exists)
            const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : (item.price != null ? Number(item.price) : null);
            const amount = unitPrice != null ? qty * unitPrice : null;

            // Stock_Id: best-effort mapping. If frontend item has an inventory item id (item.itemId) use it.
            // NOTE: If your MSSQL stock IDs differ from app item IDs, you should replace this mapping with a proper lookup.
            const stockId = item.itemId != null ? Number(item.itemId) : null;

            const detail = {
                Qty: qty || null,
                Unit_Price: unitPrice != null ? unitPrice : null,
                Amount: amount != null ? amount : null,
                Stock_Id: stockId,
                // Quotation_Id will be set server-side after inserting the parent quotation
            };

            // Filter out keys with null/undefined so backend whitelist logic can decide what's allowed
            Object.keys(detail).forEach(k => {
                if (detail[k] === null || detail[k] === undefined) delete detail[k];
            });

            return detail;
        }).filter(d => Object.keys(d).length > 0);

        return { quotation, details };
    };

    const sendQuotationToMssql = async (quotation) => {
        if (!quotation) return;
        setLoading(true);
        try {
            const payload = buildMssqlPayload(quotation);
            console.log('Sending MSSQL payload:', payload);
            // Use quick endpoint for demo/testing that inserts quotation + details
            const res = await apiBackendFetch('/api/mssql/quotations/quick', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (!res || !res.ok) {
                const text = res ? await res.text() : 'No response';
                throw new Error(text || 'Failed to POST to MSSQL');
            }
            const data = await res.json();
            console.log('MSSQL insert result:', data);
            setSuccessMessage('Quotation sent to MSSQL successfully');
        } catch (err) {
            console.error('Failed to send to MSSQL:', err);
            setError('Failed to send quotation to MSSQL.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchNewAssignedQuotations();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    useEffect(() => {
        if (successMessage) {
            // clear any existing timeout first
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
                setSuccessMessage("");
            }, 5000);
        }
    }, [successMessage]);

    if (loading)
        return (
            <LoadingModal
                message="Loading Quotations..."
                subtext="Please wait while we fetch your data."
            />
        );
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    const filtered = quotations.filter(
        (wo) => wo.woNumber?.toLowerCase().includes(search.toLowerCase()) || (wo.accountName || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full h-full overflow-hidden bg-white">
            {/* Toast Notification */}
            <div
                className={`z-50 absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md transition-all duration-500
          ${successMessage ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
                <div className="flex items-center">
                    <span className="flex-1">{successMessage || "\u00A0"}</span>
                    {successMessage && (
                        <button
                            className="ml-4 text-white hover:text-gray-300 font-bold text-lg focus:outline-none cursor-pointer transition-all duration-150"
                            onClick={() => setSuccessMessage("")}
                            aria-label="Close notification"
                            type="button">
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Sales Leads Table */}
            {!selectedQuotation && (
                <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold">Quotations Management</h1>
                                    {mssqlQuotations && mssqlQuotations.length > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded bg-sky-100 text-sky-800">
                                            MSSQL: {mssqlQuotations.length}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-md text-gray-700">View and manage all quotations</h2>
                            </div>
                    </div>

                    {/* Banner Notifications */}
                    {currentUser && newAssignedQuotations.length > 1 && (
                        <div className="flex border-amber-200 border-2 rounded-xl p-4 mb-6 bg-amber-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                    <LuBell className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm font-semibold text-amber-800">
                                            {`You have ${newAssignedQuotations.length} new RFQ${newAssignedQuotations.length > 1 ? "s" : ""} assigned to you`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-900">{newAssignedQuotations.map((rfq) => rfq.rfqNumber).join(", ")}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setSelectedQuotation(newAssignedQuotations[0])}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                                            View First RFQ
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="inline-flex items-center justify-center font-medium transition-colors hover:bg-gray-100 h-8 rounded-md px-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                                onClick={() => {
                                    /* Optionally dismiss banner */
                                }}>
                                <LuX className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    {currentUser && newAssignedQuotations.length === 1 && (
                        <div className="flex border-amber-200 border-2 rounded-xl p-4 mb-6 bg-amber-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                    <LuBell className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm font-semibold text-amber-800">New RFQ</p>
                                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-amber-100 text-amber-800 border-amber-200">
                                            RFQ
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {newAssignedQuotations[0].rfqNumber} - {newAssignedQuotations[0].workDescription}
                                        </p>
                                        <p className="text-sm text-gray-600">Account: {newAssignedQuotations[0].accountName}</p>
                                        <p className="text-sm text-gray-600">Contact: {newAssignedQuotations[0].contactPerson}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => {
                                                setSelectedQuotation(newAssignedQuotations[0]);
                                            }}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                                            Open Technical Recommendation
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="inline-flex items-center justify-center font-medium transition-colors hover:bg-gray-100 h-8 rounded-md px-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                                onClick={() => {
                                    /* Optionally dismiss banner */
                                }}>
                                <LuX className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Status center */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuFileText className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Total Quotations</p>
                            <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
                            <p className="text-xs text-gray-500">All requests for quotation</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuClipboard className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Draft</p>
                            <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
                            <p className="text-xs text-gray-500">Quotations in draft status</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuSend className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Sent</p>
                            <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
                            <p className="text-xs text-gray-500">Quotations sent to vendors</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuMessageCircle className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Responded</p>
                            <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
                            <p className="text-xs text-gray-500">Quotations with vendor responses</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuCircleAlert className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Completed</p>
                            <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
                            <p className="text-xs text-gray-500">Completed Quotations</p>
                        </div>
                    </div>

                    {/* Search + Table */}
                    <div className="flex flex-col p-6 border border-gray-200 rounded-md gap-6">
                        <div className="flex">
                            <div className="relative flex gap-6">
                                <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors pl-10"
                                    placeholder="Search salesleads..."
                                />
                            </div>
                        </div>

                        <QuotationsTable
                            quotations={filtered}
                            onView={(quotation) => {
                                getTRAndRFQ(quotation);
                                setSelectedQuotation(quotation);
                            }}
                            onSend={(q) => sendQuotationToMssql(q)}
                        />
                    </div>
                </div>
            )}

            {/* Details Drawer */}
            <div
                className={`absolute overflow-auto top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
                    selectedQuotation  ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}>
                {selectedQuotation && (
                    <div className="w-full h-full p-6 overflow-auto">
                        <button
                            className="mb-4 inline-flex items-center justify-center font-medium transition-colors hover:bg-gray-100 h-8 rounded-md px-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                            onClick={() => {
                                sendQuotationToMssql(selectedQuotation);
                                setSelectedQuotation(null);
                                setSelectedTR(null);
                                setSelectedRFQ(null);
                            }}>
                            <LuSend className="h-4 w-4 mr-2" />
                                Submit Quotation
                        </button>
                        {selectedTR && (
                            <TechnicalDetails
                                technicalReco={selectedTR}
                                onBack={() => {
                                    setSelectedTR(null);
                                    setSelectedRFQ(null);
                                    setSelectedQuotation(null);
                                }}
                            />
                        )}
                        {selectedRFQ && (
                            <RFQCanvassSheet
                                rfq={selectedRFQ}
                                setFormData={(data) => setSelectedRFQ(data)}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
