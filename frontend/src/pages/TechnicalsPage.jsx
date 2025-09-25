//src/pages/TechnicalsPage
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
    LuBell,
    LuChartColumn,
    LuChartLine,
    LuCheck,
    LuCircleAlert,
    LuCircleCheck,
    LuClipboard,
    LuClipboardCheck,
    LuClipboardList,
    LuClock,
    LuFileText,
    LuPlus,
    LuSearch,
    LuX,
} from "react-icons/lu";
import TechnicalsTable from "../components/TechnicalsTable";
import TechnicalDetails from "../components/TechnicalDetails";
import TechnicalForm from "../components/TechnicalForm";
import { apiBackendFetch } from "../services/api";

export default function TechnicalsPage() {
    const timeoutRef = useRef();
    const location = useLocation();
    const woId = location.state?.woId;

    const [technicalRecos, setTechnicalRecos] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedTR, setSelectedTR] = useState(null);
    const [editingTR, setEditingTR] = useState(woId || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const [assignedTechnicalRecos, setAssignedTechnicalRecos] = useState([]);
    const [statusSummary, setStatusSummary] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
    });

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
            setLoading(false);
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

    const fetchAssignedTechnicalRecos = async () => {
        try {
            const res = await apiBackendFetch(`/api/technicals/${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                setAssignedTechnicalRecos(data);
            }
        } catch (err) {
            console.error("Failed to fetch assigned technical recommendations", err);
        }
    };

    useEffect(() => {
        fetchAssignedTechnicalRecos();
        fetchCurrentUser();
        fetchAllData();
    }, []);

    useEffect(() => {
        if (successMessage) {
            // clear any existing timeout first
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
                setSuccessMessage("");
            }, 5000);
        }
    }, [successMessage]);

    const newAssignedTechnicalRecos = currentUser
        ? technicalRecos.filter((wo) => wo.assigneeUsername === currentUser.username && wo.status === "Pending")
        : [];

    if (loading) return <p className="p-4">Loading...</p>;
    if (error) return <p className="p-4 text-red-600">{error}</p>;

    const filtered = technicalRecos.filter(
        (wo) => wo.woNumber?.toLowerCase().includes(search.toLowerCase()) || (wo.accountName || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleSave = async (formData, mode) => {
        console.log("Saving technical recommendation:", formData, "Mode:", mode);
        try {
            console.log(formData.id);
            const response = await apiBackendFetch(mode === "edit" ? `/api/technicals/${formData.id}` : "/api/technicals", {
                method: mode === "edit" ? "PUT" : "POST",
                body:
                    mode === "edit" ? JSON.stringify(formData) : JSON.stringify({ ...formData, woId: formData.id, assignee: currentUser.id }), // include woId for backend processing
            });

            if (!response.ok) throw new Error("Failed to save technical recommendation");
            const savedTechnicalReco = await response.json();
      
            if (mode === "edit") {
              // Fetch the workflow stage for this workorder and stage name
              const wsRes = await apiBackendFetch(
                `/api/workflowstages/workorder/${savedTechnicalReco.woId}`
              );
              if (wsRes.ok) {
                const stages = await wsRes.json();
                // Find the "Technical Recommendation" stage
                const technicalRecoStage = stages.find(
                  s => s.stage_name === "Technical Recommendation"
                );
                if (technicalRecoStage) {
                  await apiBackendFetch(`/api/workflowstages/${technicalRecoStage.woId}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      status: savedTechnicalReco.status || "Pending",
                      assigned_to: savedTechnicalReco.assignee,
                    }),
                  });
                }
              }
            } else {
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
            }
      
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
                    {currentUser && assignedTechnicalRecos.length > 1 && (
                        <div className="flex border-blue-200 border-2 rounded-xl p-4 mb-6 bg-blue-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                    <LuBell className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-blue-600" />
                                        <p className="text-sm font-semibold text-blue-800">
                                            {`You have ${assignedTechnicalRecos.length} new technical recommendation${
                                                assignedTechnicalRecos.length > 1 ? "s" : ""
                                            } assigned to you`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-900">{assignedTechnicalRecos.map((wo) => wo.woNumber).join(", ")}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setSelectedTR(assignedTechnicalRecos[0])}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
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
                    {currentUser && assignedTechnicalRecos.length === 1 && (
                        <div className="flex border-blue-200 border-2 rounded-xl p-4 mb-6 bg-blue-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
                            <div className="flex space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                    <LuBell className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <LuCircleAlert className="h-4 w-4 text-blue-600" />
                                        <p className="text-sm font-semibold text-blue-800">New Technical Recommendation</p>
                                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-orange-100 text-orange-800 border-orange-200">
                                            RECOMMENDATION
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {assignedTechnicalRecos[0].woNumber} - {assignedTechnicalRecos[0].workDescription}
                                        </p>
                                        <p className="text-sm text-gray-600">Account: {assignedTechnicalRecos[0].accountName}</p>
                                        <p className="text-sm text-gray-600">Contact: {assignedTechnicalRecos[0].contactPerson}</p>
                                    </div>
                                    <div className="mt-3">
                                        <button
                                            onClick={() => {
                                                setEditingTR({});
                                                setSelectedTR(null);
                                            }}
                                            className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
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
                            onView={(salesLead) => {
                                setSelectedTR(salesLead);
                                setEditingTR(null);
                            }}
                            onEdit={(salesLead) => {
                                setEditingTR(salesLead);
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
                        salesLead={selectedTR}
                        onBack={() => setSelectedTR(null)}
                        onEdit={() => setEditingTR(selectedTR)}
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
                        salesLead={editingTR}
                        mode={editingTR?.id ? "edit" : "create"}
                        onSave={(formData, mode) => handleSave(formData, mode)}
                        onBack={() => setEditingTR(null)}
                    />
                )}
            </div>
        </div>
    );
}
