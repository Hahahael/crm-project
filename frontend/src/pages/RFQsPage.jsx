//src/pages/RFQsPage
import { useState, useEffect, useRef, use } from "react";
import { useLocation } from "react-router-dom";
import { LuBell, LuCircleAlert, LuClipboard, LuFileText, LuMessageCircle, LuSearch, LuSend, LuX } from "react-icons/lu";
import RFQsTable from "../components/RFQsTable";
import RFQDetails from "../components/RFQDetails";
import RFQForm from "../components/RFQFormWrapper";
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";

export default function RFQsPage() {
    const timeoutRef = useRef();
    const location = useLocation();

    const [RFQs, setRFQs] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedRFQ, setSelectedRFQ] = useState(null);
    const [editingRFQ, setEditingRFQ] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedTab, setSelectedTab] = useState("details");
    const [newAssignedRFQs, setNewAssignedRFQs] = useState([]);
    const [statusSummary, setStatusSummary] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

    const fetchAllData = async () => {
        try {
            const RFQsRes = await apiBackendFetch("/api/rfqs");
            if (!RFQsRes.ok) throw new Error("Failed to fetch Technical Recommendations");

            const RFQsData = await RFQsRes.json();
            setRFQs(RFQsData);

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
            console.error("Error retrieving RFQs:", err);
            setError("Failed to fetch RFQs.");
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

    const fetchNewAssignedRFQs = async () => {
        console.log("fetchNewRFQs called");
        if (!currentUser) return;
        try {
            const res = await apiBackendFetch(`/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("RFQ")}`);

            if (res.ok) {
                const data = await res.json();
                setNewAssignedRFQs(data);
            }
        } catch (err) {
            console.error("Failed to fetch assigned workorders", err);
        }
    };

    useEffect(() => {
        fetchCurrentUser();
        fetchAllData();
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchNewAssignedRFQs();
        }
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
                message="Loading Work Orders..."
                subtext="Please wait while we fetch your data."
            />
        );
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    const filtered = RFQs.filter(
        (wo) => wo.woNumber?.toLowerCase().includes(search.toLowerCase()) || (wo.accountName || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = async (formData, mode) => {
        console.log("Saving RFQ:", formData, "Mode:", mode);
        try {
            const rfqRes = await apiBackendFetch(`/api/rfqs/${formData.id}`, {
                method: "PUT",
                body: JSON.stringify(formData)
            });
            if (!rfqRes.ok) throw new Error("Failed to save RFQ");

            // const rfqItemsRes = await apiBackendFetch(`/api/rfqs/${formData.id}/items`, {
            //     method: "PUT",
            //     body: JSON.stringify(formData.items)
            // });
            // if (!rfqItemsRes.ok) throw new Error("Failed to save RFQ Items");

            // const rfqVendorsRes = await apiBackendFetch(`/api/rfqs/${formData.id}/vendors`, {
            //     method: "PUT",
            //     body: JSON.stringify(formData.vendors)
            // });
            // if (!rfqVendorsRes.ok) throw new Error("Failed to save RFQ Vendors andQ Quotations");

            const rfqData = await rfqRes.json();
            console.log("Saved RFQ data:", rfqData);
            const rfqWOId = rfqData.woId;
            
            // Create a new workflow stage for this sales lead
            await apiBackendFetch("/api/workflow-stages", {
                method: "POST",
                body: JSON.stringify({
                    woId: rfqWOId,
                    stageName: "RFQ",
                    status: "In Progress",
                    assignedTo: currentUser.id,
                }),
            });
            
            const stagesRes = await apiBackendFetch("/api/workflow-stages");
            if (stagesRes.ok) {
                const allStages = await stagesRes.json();
                console.log("All workflow stages:", allStages);
            }

            setSuccessMessage("RFQ saved successfully!"); // ✅ trigger success message
            await fetchAllData();
            await fetchNewAssignedRFQs();
            setSelectedRFQ(fetchRFQById(rfqData.id));
            setEditingRFQ(null);
        } catch (err) {
            console.error("Error saving RFQ:", err);
            setError("Failed to save RFQ");
        }
    };

    const handleSubmitForApproval = async (formData) => {
        try {
            // Set status to Submitted
            const submitData = { ...formData, status: "Submitted" };
            const response = await apiBackendFetch(`/api/rfqs/${formData.id}`, {
                method: "PUT",
                body: JSON.stringify(submitData),
            });
            if (!response.ok) throw new Error("Failed to submit RFQ for approval");
            const savedRFQ = await response.json();

            // Create workflow stage for new RFQ
            await apiBackendFetch("/api/workflow-stages", {
                method: "POST",
                body: JSON.stringify({
                    wo_id: savedRFQ.id,
                    stage_name: "RFQ",
                    status: "Submitted",
                    assigned_to: savedRFQ.assignee,
                }),
            });

            setSuccessMessage("RFQ submitted for approval!");
            setSelectedRFQ(null);
            setEditingRFQ(null);
            await fetchAllData();
            await fetchNewAssignedRFQs();
        } catch (err) {
            console.error("Error submitting for approval:", err);
            setError("Failed to submit technical recommendation for approval");
        }
    }

    const fetchNewRFQs = async () => {
        console.log("fetchNewRFQs called");
        if (!currentUser) return;
        try {
            const res = await apiBackendFetch(`/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("RFQ")}`);

            if (res.ok) {
                const data = await res.json();
                setNewAssignedRFQs(data);
            }
        } catch (err) {
            console.error("Failed to fetch assigned RFQs", err);
        }
    };

    const fetchRFQById = async (rfqId) => {
        if (!currentUser) return;
        try {
            const res = await apiBackendFetch(`/api/rfqs/${rfqId}`);

            if (res.ok) {
                const data = await res.json();
                setSelectedRFQ(data);
                setEditingRFQ(null);
            }
        } catch (err) {
            console.error("Failed to fetch assigned RFQ", err);
        }
    }

    const fetchEditingRFQById = async (rfqId) => {
        if (!currentUser) return;
        try {
            const res = await apiBackendFetch(`/api/rfqs/${rfqId}`);

            if (res.ok) {
                const data = await res.json();
                setSelectedRFQ(data);
                setEditingRFQ(data);
                console.log("Data", data);
            }
        } catch (err) {
            console.error("Failed to fetch assigned RFQ", err);
        }
    }

    const saveRFQById = async (formData) => {
        try {
            const res = await apiBackendFetch(`/api/rfqs/${formData.id}`, {
                method: "PUT",
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedRFQ(data);
                setEditingRFQ(data);
            }
        } catch (err) {
            console.error("Failed to fetch assigned RFQ", err);
        }
    }

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
            {!selectedRFQ && !editingRFQ && (
                <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold">Requests for Quotation Management</h1>
                            <h2 className="text-md text-gray-700">View and manage all requests for quotation</h2>
                        </div>
                    </div>

                    {/* Banner Notifications */}
                    {currentUser && newAssignedRFQs.length > 1 && (
                        <div className="flex border-amber-200 border-2 rounded-xl p-4 mb-6 bg-amber-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                    <LuBell className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-amber-600" />
                                        <p className="text-sm font-semibold text-amber-800">
                                            {`You have ${newAssignedRFQs.length} new RFQ${newAssignedRFQs.length > 1 ? "s" : ""} assigned to you`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-900">{newAssignedRFQs.map((rfq) => rfq.rfqNumber).join(", ")}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => fetchRFQById(newAssignedRFQs[0].id)}
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
                    {currentUser && newAssignedRFQs.length === 1 && (
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
                                            {newAssignedRFQs[0].rfqNumber} - {newAssignedRFQs[0].workDescription}
                                        </p>
                                        <p className="text-sm text-gray-600">Account: {newAssignedRFQs[0].accountName}</p>
                                        <p className="text-sm text-gray-600">Contact: {newAssignedRFQs[0].contactPerson}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => {
                                                fetchRFQById(newAssignedRFQs[0].id);
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
                            <p className="text-sm mb-1 mr-4">Total RFQs</p>
                            <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
                            <p className="text-xs text-gray-500">All requests for quotation</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuClipboard className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Draft</p>
                            <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
                            <p className="text-xs text-gray-500">RFQs in draft status</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuSend className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Sent</p>
                            <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
                            <p className="text-xs text-gray-500">RFQs sent to vendors</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuMessageCircle className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Responded</p>
                            <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
                            <p className="text-xs text-gray-500">RFQs with vendor responses</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuCircleAlert className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Completed</p>
                            <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
                            <p className="text-xs text-gray-500">Completed RFQs</p>
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

                        <RFQsTable
                            rfqs={filtered}
                            onView={(rfq) => {
                                fetchRFQById(rfq.id);
                            }}
                            onEdit={(rfq, tab) => {
                                setSelectedTab(tab || "details");
                                fetchEditingRFQById(rfq.id);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Details Drawer */}
            <div
                className={`absolute overflow-auto top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
                    selectedRFQ && !editingRFQ ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}>
                {selectedRFQ && !editingRFQ && (
                    <RFQDetails
                        rfq={selectedRFQ}
                        currentUser={currentUser}
                        onBack={() => setSelectedRFQ(null)}
                        onEdit={(rfq, tab) => {
                            setSelectedTab(tab || "details");
                            fetchEditingRFQById(rfq.id);
                        }}
                        onSave={(updatedRFQ) => {
                            setSelectedRFQ(updatedRFQ);
                            // Optionally, update the RFQs array as well:
                            setRFQs((prev) => prev.map((tr) => (tr.id === updatedRFQ.id ? updatedRFQ : tr)));
                            fetchNewRFQs(); // <-- refresh from backend
                        }}
                        onSubmit={(selectedRFQ) => {handleSubmitForApproval(selectedRFQ)}}
                    />
                )}
            </div>

            {/* Form Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
                    editingRFQ && editingRFQ.id ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}>
                {editingRFQ && editingRFQ.id && (
                    <RFQForm
                        rfq={editingRFQ}
                        tab={selectedTab}
                        mode={editingRFQ?.id ? "edit" : "create"}
                        onSave={(formData, mode) => handleSave(formData, mode)}
                        onBack={() => setEditingRFQ(null)}
                    />
                )}
            </div>
        </div>
    );
}
