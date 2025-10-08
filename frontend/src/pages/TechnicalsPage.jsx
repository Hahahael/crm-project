//src/pages/TechnicalsPage
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    LuBell,
    LuCircleAlert,
    LuCircleCheck,
    LuClipboard,
    LuFileText,
    LuSearch,
    LuX,
} from "react-icons/lu";
import TechnicalsTable from "../components/TechnicalsTable";
import TechnicalDetails from "../components/TechnicalDetails";
import TechnicalForm from "../components/TechnicalForm";
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";

export default function TechnicalsPage() {
    const timeoutRef = useRef();
    const location = useLocation();
    const salesLead = location.state?.salesLead;
    const navigate = useNavigate();

    const [technicalRecos, setTechnicalRecos] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedTR, setSelectedTR] = useState(null);
    const [editingTR, setEditingTR] = useState(salesLead || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [newAssignedTechnicalRecos, setNewAssignedTechnicalRecos] = useState([]);
    const [statusSummary, setStatusSummary] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

    console.log("editingTR:", editingTR);

    const fetchAllData = async () => {
        try {
            const technicalRecosRes = await apiBackendFetch("/api/technicals");
            if (!technicalRecosRes.ok) throw new Error("Failed to fetch Technical Recommendations");

            const technicalRecosData = await technicalRecosRes.json();
            setTechnicalRecos(technicalRecosData);
            console.log("Fetched technical recommendations:", technicalRecosData);

            // Fetch status summary
            // const summaryRes = await apiBackendFetch("/api/technicals/summary/status");
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
            console.error("Error retrieving technical recommendations:", err);
            setError("Failed to fetch technical recommendations.");
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

    const fetchNewAssignedTechnicalRecos = async () => {
        if (!currentUser) return;
        try {
            const res = await apiBackendFetch(`/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("Technical Recommendation")}`);

            if (res.ok) {
                const data = await res.json();
                console.log("New assigned technical recommendations:", data);
                setNewAssignedTechnicalRecos(data);
            }
            console.log("New Assigned Technical Recommendations:", newAssignedTechnicalRecos);
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
        fetchNewAssignedTechnicalRecos();
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

    if (loading) return <LoadingModal message="Loading Technical Recommendations..." subtext="Please wait while we fetch your data." />;
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    const filtered = technicalRecos.filter(
        (wo) => wo.woNumber?.toLowerCase().includes(search.toLowerCase()) || (wo.accountName || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = async (formData, mode) => {
        console.log("Saving technical recommendation:", formData, "Mode:", mode);
        try {
            console.log(formData.id);
            const response = await apiBackendFetch(`/api/technicals/${formData.id}`, {
                method: "PUT",
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error("Failed to save technical recommendation");
            const savedTechnicalReco = await response.json();
            
            // Create a new workflow stage for this sales lead
            await apiBackendFetch("/api/workflowstages", {
                method: "POST",
                body: JSON.stringify({
                    wo_id: savedTechnicalReco.woId,
                    stage_name: "Technical Recommendation",
                    status: savedTechnicalReco.status || "Pending",
                    assigned_to: savedTechnicalReco.assignee,
                }),
            });

            // Fetch all workflow stages and log them
            const stagesRes = await apiBackendFetch("/api/workflow-stages");
            if (stagesRes.ok) {
                const allStages = await stagesRes.json();
                console.log("All workflow stages:", allStages);
            }

            setSuccessMessage("Technical Recommendation saved successfully!"); // ✅ trigger success message
            await fetchAllData();
            setSelectedTR(savedTechnicalReco);
            setEditingTR(null);
        } catch (err) {
            console.error("Error saving technical recommendation:", err);
            setError("Failed to save technical recommendation");
        }
    };

    
    const handleSubmitForApproval = async (formData) => {
        try {
            // Set status to Submitted
            const submitData = { ...formData, status: "Submitted" };
            const response = await apiBackendFetch(`/api/technicals/${formData.id}`, {
                method: "PUT",
                body: JSON.stringify(submitData),
            });
            if (!response.ok) throw new Error("Failed to submit technical recommendation for approval");
            const savedTechnicalReco = await response.json();
            
            // Create workflow stage for new technical recommendation
            await apiBackendFetch("/api/workflow-stages", {
                method: "POST",
                body: JSON.stringify({
                    wo_id: savedTechnicalReco.woId,
                    stage_name: "Technical Recommendation",
                    status: "Submitted",
                    assigned_to: savedTechnicalReco.assignee,
                }),
            });

            setSuccessMessage("Technical Recommendation submitted for approval!");
            setSelectedTR(null);
            setEditingTR(null);
            await fetchAllData();
            await fetchNewAssignedTechnicalRecos();
        } catch (err) {
            console.error("Error submitting for approval:", err);
            setError("Failed to submit technical recommendation for approval");
        }
    }

    const fetchAssignedTR = async (trId) => {
        if (!currentUser) return;
        try {
            const res = await apiBackendFetch(`/api/technicals/${trId}`);

            if (res.ok) {
                const data = await res.json();
                setSelectedTR(data);
                setEditingTR(null);
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
            {!selectedTR && !editingTR && (
                <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold">Technical Recommendations Management</h1>
                            <h2 className="text-md text-gray-700">View and manage all technical recommendations</h2>
                        </div>
                    </div>

                    {/* Banner Notifications */}
                    {currentUser && newAssignedTechnicalRecos.length > 1 && (
                        <div className="flex border-purple-200 border-2 rounded-xl p-4 mb-6 bg-purple-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                                    <LuBell className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-purple-600" />
                                        <p className="text-sm font-semibold text-purple-800">
                                            {`You have ${newAssignedTechnicalRecos.length} new technical recommendation${
                                                newAssignedTechnicalRecos.length > 1 ? "s" : ""
                                            } assigned to you`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-900">{newAssignedTechnicalRecos.map((tr) => tr.trNumber).join(", ")}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => fetchAssignedTR(newAssignedTechnicalRecos[0].id)}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer">
                                            View First Technical Recommendation
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
                    {currentUser && newAssignedTechnicalRecos.length === 1 && (
                        <div className="flex border-purple-200 border-2 rounded-xl p-4 mb-6 bg-purple-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                                    <LuBell className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-purple-600" />
                                        <p className="text-sm font-semibold text-purple-800">New Technical Recommendation</p>
                                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-purple-100 text-purple-800 border-purple-200">
                                            TR
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {newAssignedTechnicalRecos[0].trNumber} - {newAssignedTechnicalRecos[0].title}
                                        </p>
                                        <p className="text-sm text-gray-600">Account: {newAssignedTechnicalRecos[0].accountName}</p>
                                        <p className="text-sm text-gray-600">Contact: {newAssignedTechnicalRecos[0].contactPerson}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => {
                                                fetchAssignedTR(newAssignedTechnicalRecos[0].id);
                                            }}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuFileText className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Total Recommendations</p>
                            <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
                            <p className="text-xs text-gray-500">All technical recommendations</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuClipboard className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Draft</p>
                            <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
                            <p className="text-xs text-gray-500">Recommendations in draft status</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuCircleCheck className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">Approved</p>
                            <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
                            <p className="text-xs text-gray-500">Approved recommendations</p>
                        </div>
                        <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
                            <LuCircleAlert className="absolute top-6 right-6 text-gray-600" />
                            <p className="text-sm mb-1 mr-4">High Priority</p>
                            <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
                            <p className="text-xs text-gray-500">High and critical priority items</p>
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

                        <TechnicalsTable
                            technicals={filtered}
                            onView={async (technicalReco) => {
                                // Always fetch the latest details from backend to avoid stale state
                                try {
                                    const res = await apiBackendFetch(`/api/technicals/${technicalReco.id}`);
                                    if (res.ok) {
                                        const fullTR = await res.json();
                                        setSelectedTR(fullTR);
                                        setEditingTR(null);
                                    } else {
                                        setSelectedTR(technicalReco); // fallback to passed object
                                        setEditingTR(null);
                                    }
                                } catch (err) {
                                    setSelectedTR(technicalReco);
                                    setEditingTR(null);
                                }
                            }}
                            onEdit={(technicalReco) => {
                                setEditingTR(technicalReco);
                                setSelectedTR(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Details Drawer */}
            <div
                className={`absolute overflow-auto top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
                    selectedTR && !editingTR ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}>
                {selectedTR && !editingTR && (
                    <TechnicalDetails
                        technicalReco={selectedTR}
                        currentUser={currentUser}
                        onBack={() => setSelectedTR(null)}
                        onEdit={() => setEditingTR(selectedTR)}
                        onSave={(updatedTR) => {
                            setSelectedTR(updatedTR);
                            // Optionally, update the technicalRecos array as well:
                            setTechnicalRecos((prev) => prev.map((tr) => (tr.id === updatedTR.id ? updatedTR : tr)));
                            fetchNewAssignedTechnicalRecos(); // <-- refresh from backend
                        }}
                        onSubmit={handleSubmitForApproval}
                    />
                )}
            </div>

            {/* Form Drawer */}
            <div
                className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
                    editingTR ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                }`}>
                {editingTR && (
                    <TechnicalForm
                        technicalReco={editingTR}
                        mode={editingTR?.id ? "edit" : "create"}
                        onSave={(formData, mode) => handleSave(formData, mode)}
                        onBack={() => {
                            fetchNewAssignedTechnicalRecos();
                            setEditingTR(null);
                        }}
                        onSubmitForApproval={handleSubmitForApproval}
                    />
                )}
            </div>
        </div>
    );
}
