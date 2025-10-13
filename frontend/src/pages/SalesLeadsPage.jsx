/* eslint-disable no-unused-vars */
//src/pages/SalesLeadsPage
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    LuBell,
    LuChartColumn,
    LuChartLine,
    LuCheck,
    LuCircleAlert,
    LuClipboardCheck,
    LuClipboardList,
    LuClock,
    LuFileText,
    LuPlus,
    LuSearch,
    LuX,
} from "react-icons/lu";
import SalesLeadsTable from "../components/SalesLeadsTable";
import SalesLeadDetails from "../components/SalesLeadDetails";
import SalesLeadForm from "../components/SalesLeadForm";
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";

export default function SalesLeadsPage() {
    // Handler for submit/approval (called by SalesLeadForm)
    const handleSubmitForApproval = async (formData) => {
        try {
            // Save/update the sales lead
            const response = await apiBackendFetch(formData.id ? `/api/salesleads/${formData.id}` : "/api/salesleads", {
                method: formData.id ? "PUT" : "POST",
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error("Failed to save sales lead");
            const savedSalesLead = await response.json();

            // File workflow stage as Submitted
            await apiBackendFetch("/api/workflow-stages", {
                method: "POST",
                body: JSON.stringify({
                    wo_id: savedSalesLead.woId,
                    stage_name: "Sales Lead",
                    status: "Submitted",
                    assigned_to: savedSalesLead.assignee,
                }),
            });

            apiBackendFetch(`/api/salesleads/${formData.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    ...formData,
                    actualToTime: new Date().toTimeString().slice(0, 8),
                }),
                headers: { "Content-Type": "application/json" },
            })

            setSuccessMessage("Sales Lead submitted for approval!");
            await fetchAllData();
            setSelectedSL(null);
            setEditingSL(null);
        } catch (err) {
            console.error("Error submitting sales lead:", err);
            setError("Failed to submit sales lead");
        }
    };
    const timeoutRef = useRef();
    const location = useLocation();
    const navigate = useNavigate();
    const salesLeadId = location.state?.salesLeadId;

    const [salesLeads, setSalesLeads] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedSL, setSelectedSL] = useState(null);
    const [editingSL, setEditingSL] = useState(null);
    // Fetch the sales lead by ID if provided in navigation state
    useEffect(() => {
        if (salesLeadId) {
            (async () => {
                setLoading(true);
                try {
                    const res = await apiBackendFetch(`/api/salesleads/${salesLeadId}`);
                    if (!res.ok) throw new Error("Failed to fetch sales lead");
                    const salesLead = await res.json();
                    setEditingSL(salesLead);
                } catch (err) {
                    setError("Failed to fetch sales lead");
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [salesLeadId]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [newAssignedSalesLeads, setNewAssignedSalesLeads] = useState([]);
    const [statusSummary, setStatusSummary] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

    const fetchAllData = async () => {
        try {
            const salesLeadsRes = await apiBackendFetch("/api/salesleads");
            if (!salesLeadsRes.ok) throw new Error("Failed to fetch Sales Leads");

            const salesLeadsData = await salesLeadsRes.json();
            setSalesLeads(salesLeadsData);

            // Fetch status summary
            const summaryRes = await apiBackendFetch("/api/salesleads/summary/status");
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setStatusSummary({
                    total: Number(summaryData.total) || 0,
                    pending: Number(summaryData.pending) || 0,
                    inProgress: Number(summaryData.inProgress) || 0,
                    completed: Number(summaryData.completed) || 0,
                });
            }

            console.log("Fetched sales leads:", salesLeadsData);

            setTimeout(() => setLoading(false), 500);
        } catch (err) {
            console.error("Error retrieving salesleads:", err);
            setError("Failed to fetch sales leads.");
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

    const fetchNewAssignedSalesLeads = useCallback(async () => {
        try {
            if (!currentUser) return;
            const res = await apiBackendFetch(`/api/salesleads/${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                setNewAssignedSalesLeads(data);
            }
        } catch (err) {
            console.error("Failed to fetch assigned salesleads", err);
        }
    }, [currentUser]);

    // Fetch a single sales lead and set as selected (details view)
    const fetchSelectedSL = useCallback(async (id) => {
        if (!id) return;
        try {
            setLoading(true);
            const res = await apiBackendFetch(`/api/salesleads/${id}`);
            if (!res.ok) throw new Error('Failed to fetch sales lead');
            const sl = await res.json();
            setSelectedSL(sl);
            setEditingSL(null);
        } catch (err) {
            console.error('Error fetching selected sales lead', err);
            setError('Failed to load sales lead');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch a single sales lead and set into editing drawer
    const fetchEditingSL = useCallback(async (id) => {
        if (!id) return;
        try {
            setLoading(true);
            const res = await apiBackendFetch(`/api/salesleads/${id}`);
            if (!res.ok) throw new Error('Failed to fetch sales lead for edit');
            const sl = await res.json();
            setEditingSL(sl);
            setSelectedSL(null);
        } catch (err) {
            console.error('Error fetching editing sales lead', err);
            setError('Failed to load sales lead for editing');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUser();
        fetchAllData();
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchNewAssignedSalesLeads();
        }
    }, [currentUser, fetchNewAssignedSalesLeads]);

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
                message="Loading Sales Leads..."
                subtext="Please wait while we fetch your data."
            />
        );
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    const filtered = salesLeads.filter(
        (wo) => wo.woNumber?.toLowerCase().includes(search.toLowerCase()) || (wo.accountName || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = async (formData, mode) => {
        console.log("Trying to save!");
        try {
            console.log(formData);
            const payload = mode === "edit" ? formData : { ...formData, woId: formData.woId || formData.id || null, assignee: currentUser?.id };
            const response = await apiBackendFetch(mode === "edit" ? `/api/salesleads/${formData.id}` : "/api/salesleads", {
                method: mode === "edit" ? "PUT" : "POST",
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to save saleslead");
            const savedSalesLead = await response.json();
            
            // Create a new workflow stage for this sales lead
            await apiBackendFetch("/api/workflow-stages", {
                method: "POST",
                body: JSON.stringify({
                    wo_id: savedSalesLead.woId,
                    stage_name: "Sales Lead",
                    status: savedSalesLead.status || "Pending",
                    assigned_to: savedSalesLead.assignee,
                }),
            });

            // Fetch all workflow stages and log them
            const stagesRes = await apiBackendFetch("/api/workflow-stages");
            if (stagesRes.ok) {
                const allStages = await stagesRes.json();
                console.log("All workflow stages:", allStages);
            }

            setSuccessMessage("Sales Lead saved successfully!");
            await fetchAllData();
            setSelectedSL(savedSalesLead);
            setEditingSL(null);
        } catch (err) {
            console.error("Error saving saleslead:", err);
            setError("Failed to save sales lead");
        }
    };

    const addWorkFlowStage = async (woId, stageName, assignedTo, mode = "create") => {
        console.log(`Adding workflow stage: WO ID ${woId}, Stage: ${stageName}, Assigned To: ${assignedTo}, Mode: ${mode}`);
        try {
            const response = await apiBackendFetch("/api/workflow-stages", {
                method: "POST",
                body: JSON.stringify({
                    woId,
                    stageName,
                    status: mode === "create" ? "Pending" : "In Progress",
                    assignedTo,
                }),
            });
            if (!response.ok) throw new Error("Failed to add workflow stage");
            const newStage = await response.json();
            console.log("New workflow stage added:", newStage);
            return newStage;
        } catch (err) {
            console.error("Error adding workflow stage:", err);
            setError("Failed to add workflow stage");
            return null;
        }
    };

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
            {!selectedSL && !editingSL && (
                <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold">Sales Lead Management</h1>
                            <h2 className="text-md text-gray-700">View and manage all sales leads</h2>
                        </div>
                    </div>

                    {/* Banner Notifications */}
                    {currentUser && newAssignedSalesLeads.length > 1 && (
                        <div className="flex border-blue-200 border-2 rounded-xl p-4 mb-6 bg-blue-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                    <LuBell className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-blue-600" />
                                        <p className="text-sm font-semibold text-blue-800">
                                            {`You have ${newAssignedSalesLeads.length} new sales lead${
                                                newAssignedSalesLeads.length > 1 ? "s" : ""
                                            } assigned to you`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-900">{newAssignedSalesLeads.map((sl) => sl.slNumber).join(", ")}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setSelectedSL(newAssignedSalesLeads[0])}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
                                            View First Sales Lead
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
                    {currentUser && newAssignedSalesLeads.length === 1 && (
                        <div className="flex border-blue-200 border-2 rounded-xl p-4 mb-6 bg-blue-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                    <LuBell className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-blue-600" />
                                        <p className="text-sm font-semibold text-blue-800">New Sales Lead</p>
                                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-orange-100 text-orange-800 border-orange-200">
                                            LEAD
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {newAssignedSalesLeads[0].slNumber} - {newAssignedSalesLeads[0].workDescription}
                                        </p>
                                        <p className="text-sm text-gray-600">Account: {newAssignedSalesLeads[0].accountName}</p>
                                        <p className="text-sm text-gray-600">Contact: {newAssignedSalesLeads[0].contactPerson}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => {
                                                setEditingSL({});
                                                setSelectedSL(null);
                                            }}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
                                            Open Sales Lead
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
                            <LuChartColumn className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Total Leads</p>
                            <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
                            <p className="text-xs text-gray-500">All salesleads in the system</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuFileText className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Sales Lead Stage</p>
                            <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
                            <p className="text-xs text-gray-500">Workorders waiting to be started</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuClipboardCheck className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Technical Stage</p>
                            <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
                            <p className="text-xs text-gray-500">Workorders currently active</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuChartLine className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">RFQ / NAEF / Quotation</p>
                            <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
                            <p className="text-xs text-gray-500">Successfully completed salesleads</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuClock className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-5">High Urgency</p>
                            <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
                            <p className="text-xs text-gray-500">Successfully completed salesleads</p>
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

                        <SalesLeadsTable
                            salesLeads={filtered}
                            onView={(salesLead) => {
                                setSelectedSL(salesLead);
                                setEditingSL(null);
                            }}
                            onEdit={(salesLead) => {
                                setEditingSL(salesLead);
                                setSelectedSL(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Details Drawer */}
            <div
                className={`absolute overflow-auto top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
                    selectedSL && !editingSL ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}>
                {selectedSL && !editingSL && (
                    <SalesLeadDetails
                        salesLead={selectedSL}
                        currentUser={currentUser}
                        onBack={() => setSelectedSL(null)}
                        onEdit={() => setEditingSL(selectedSL)}
                        onSubmit={(passedSL) => {handleSubmitForApproval(passedSL)}}
                        onSalesLeadUpdated={(updatedSalesLead) => {
                            fetchSelectedSL(updatedSalesLead);
                            fetchAllData();
                            fetchNewAssignedSalesLeads(); // <-- refresh from backend
                        }}
                    />
                )}
            </div>

            {/* Form Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
                    editingSL ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}>
                {editingSL && (
                    <SalesLeadForm
                        salesLead={editingSL}
                        mode={editingSL?.id ? "edit" : "create"}
                        onSave={(formData, mode) => handleSave(formData, mode)}
                        onSubmit={(formData) => handleSubmitForApproval(formData)}
                        onBack={() => setEditingSL(null)}
                    />
                )}
            </div>
        </div>
    );
}
