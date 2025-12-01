//src/pages/TechnicalsPage
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  LuBell,
  LuCircleAlert,
  LuCircleCheck,
  LuClipboard,
  LuFileText,
  LuForward,
  LuSearch,
  LuX,
} from "react-icons/lu";
import TechnicalsTable from "../components/TechnicalsTable";
import TechnicalDetails from "../components/TechnicalDetails";
import TechnicalForm from "../components/TechnicalForm";
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";
import { useUser } from "../contexts/UserContext.jsx";
import utils from "../helper/utils.js";

export default function TechnicalsPage() {
  const { currentUser, loading: userLoading } = useUser();
  const timeoutRef = useRef();
  const location = useLocation();
  const salesLead = location.state?.salesLead;
  // const navigate = useNavigate();

  const [technicalRecos, setTechnicalRecos] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTR, setSelectedTR] = useState(null);
  const [editingTR, setEditingTR] = useState(salesLead || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [newAssignedTechnicalRecos, setNewAssignedTechnicalRecos] = useState(
    [],
  );
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [activeCardFilter, setActiveCardFilter] = useState("all"); // all | draft | submitted | approved | highPriority
  const [statusFilter, setStatusFilter] = useState(''); // dropdown filter for status
  const [priorityFilter, setPriorityFilter] = useState(''); // dropdown filter for priority

  console.log("editingTR:", editingTR);

  const fetchAllData = useCallback (async () => {
    if (userLoading) {
      console.log("User still loading, waiting...");
      return;
    }
    if (!currentUser) {
      console.log("No current user available");
      setLoading(false);
      return;
    }
    
    console.log("Fetching work orders for user:", currentUser);
    try {
      const technicalRecosRes = await apiBackendFetch("/api/technicals");
      if (!technicalRecosRes.ok)
        throw new Error("Failed to fetch Technical Recommendations");

      let technicalRecosData = await technicalRecosRes.json();
      if (!utils.isModuleAdmin(currentUser, "technical-reco")) {
        technicalRecosData = technicalRecosData.filter(technicalReco => technicalReco.assignee === currentUser.id);
      }
      setTechnicalRecos(technicalRecosData);
      console.log("Fetched technical recommendations:", technicalRecosData);
      
      // (optional) compute high priority locally if needed in future

      // Fetch status summary
      const summaryRes = await apiBackendFetch("/api/technicals/summary/status");
      if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          console.log("Fetched technical recommendations status summary:", summaryData);
          setStatusSummary({
              total: Number(summaryData.total) || 0,
              pending: Number(summaryData.pending) || 0,
              inProgress: Number(summaryData.inProgress) || 0,
              completed: Number(summaryData.completed) || 0,
              submitted: Number(summaryData.submitted) || 0,
              approved: Number(summaryData.approved) || 0,

          });
      }
      setTimeout(() => setLoading(false));
    } catch (err) {
      console.error("Error retrieving technical recommendations:", err);
      setError("Failed to fetch technical recommendations.");
    }
  }, [currentUser, userLoading]);

  const fetchNewAssignedTechnicalRecos = async () => {
    if (!currentUser) return;
    try {
      const res = await apiBackendFetch(
        `/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("Technical Recommendation")}`,
      );

      if (res.ok) {
        const data = await res.json();
        console.log("New assigned technical recommendations:", data);
        setNewAssignedTechnicalRecos(data);
      }
      console.log(
        "New Assigned Technical Recommendations:",
        newAssignedTechnicalRecos,
      );
    } catch (err) {
      console.error("Failed to fetch assigned workorders", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle loading state better - don't show loading if user is still loading
  useEffect(() => {
    if (!userLoading && !currentUser) {
      // User finished loading but no user found - redirect to login or show error
      console.log("User finished loading but no user found");
      setLoading(false);
    } else if (!userLoading && currentUser) {
      // User loaded successfully - fetchAllData will handle the rest
      console.log("User loaded successfully:", currentUser.username);
    }
  }, [userLoading, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchNewAssignedTechnicalRecos();
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
        message="Loading Technical Recommendations..."
        subtext="Please wait while we fetch your data."
      />
    );
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  const term = (search || "").toLowerCase();

  const matchesActiveFilter = (tr) => {
    const status = String(tr?.stageStatus || "").toLowerCase();
    const priority = String(tr?.priority || "").toLowerCase();
    switch (activeCardFilter) {
      case "draft":
        return status === "pending" || status === "draft";
      case "submitted":
        return status === "submitted";
      case "approved":
        return status === "approved";
      case "highPriority":
        return priority.includes("high");
      case "all":
      default:
        return true;
    }
  };

  const filtered = technicalRecos.filter((tr) => {
    const trNum = (tr.trNumber || tr.tr_number || "").toLowerCase();
    const accName = (
      tr.account?.account_name || tr.accountName || tr.account_name || ""
    ).toLowerCase();
    const textMatch = trNum.includes(term) || accName.includes(term);
    
    // Status filter
    const matchesStatus = !statusFilter || 
      (tr.stageStatus || '').toLowerCase().includes(statusFilter.toLowerCase());
    
    // Priority filter
    const matchesPriority = !priorityFilter || 
      (tr.priority || '').toLowerCase().includes(priorityFilter.toLowerCase());
    
    return textMatch && matchesActiveFilter(tr) && matchesStatus && matchesPriority;
  });

  const handleSave = async (formData, mode) => {
    console.log("Saving technical recommendation:", formData, "Mode:", mode);
    try {
      console.log(formData.id);
      const response = await apiBackendFetch(`/api/technicals/${formData.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      if (!response.ok)
        throw new Error("Failed to save technical recommendation");
      const savedTechnicalReco = await response.json();

      // Create a new workflow stage for this sales lead
      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id:
            savedTechnicalReco?.wo_id ?? savedTechnicalReco?.woId ?? formData?.wo_id ?? formData?.woId ?? null,
          stage_name: "Technical Recommendation",
          status: "In Progress",
          assigned_to: savedTechnicalReco?.assignee ?? formData?.assignee ?? null,
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
      fetchNewAssignedTechnicalRecos();
      fetchSelectedTR(savedTechnicalReco.id);
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
      if (!response.ok)
        throw new Error(
          "Failed to submit technical recommendation for approval",
        );
      const savedTechnicalReco = await response.json();

      // Create workflow stage for new technical recommendation
      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id:
            savedTechnicalReco?.wo_id ?? savedTechnicalReco?.woId ?? formData?.wo_id ?? formData?.woId ?? null,
          stage_name: "Technical Recommendation",
          status: "Submitted",
          assigned_to: savedTechnicalReco?.assignee ?? formData?.assignee ?? null,
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
  };

  // removed fetchAssignedTR (unused) to satisfy linter

  // Fetch a single sales lead and set as selected (details view)
  const fetchSelectedTR = async (id) => {
    if (!id) return;
    console.log("Fetching selected technical recommendation with id:", id);

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && id.id ? id.id : id;

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/technicals/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch technical recommendation");
      const tr = await res.json();
      console.log("Fetched selected technical recommendation:", tr);
      setSelectedTR(tr);
      setEditingTR(null);
    } catch (err) {
      console.error("Error fetching selected technical recommendation", err);
      setError("Failed to load technical recommendation");
    } finally {
      // setLoading(false);
    }
  };

  // Fetch a single sales lead and set into editing drawer
  const fetchEditingTR = async (id) => {
    if (!id) return;

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && id.id ? id.id : id;

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/technicals/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch technical reco for edit");
      const sl = await res.json();
      setEditingTR(sl);
      setSelectedTR(null);
    } catch (err) {
      console.error("Error fetching editing technical reco", err);
      setError("Failed to load technical reco for editing");
    } finally {
      // setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      {/* Toast Notification */}
      <div
        className={`z-50 absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-md transition-all duration-500
          ${successMessage ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div className="flex items-center">
          <span className="flex-1">{successMessage || "\u00A0"}</span>
          {successMessage && (
            <button
              className="ml-4 text-white hover:text-gray-300 font-bold text-lg focus:outline-none cursor-pointer transition-all duration-150"
              onClick={() => setSuccessMessage("")}
              aria-label="Close notification"
              type="button"
            >
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
              <h1 className="text-2xl font-bold">
                Technical Recommendations Management
              </h1>
              <h2 className="text-md text-gray-700">
                View and manage all technical recommendations
              </h2>
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
                    <p className="text-sm text-gray-900">
                      {newAssignedTechnicalRecos
                        .map((tr) => tr.trNumber)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() =>
                        fetchSelectedTR(newAssignedTechnicalRecos[0].id)
                      }
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      View First Technical Recommendation
                    </button>
                  </div>
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center font-medium transition-colors hover:bg-gray-100 h-8 rounded-md px-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={() => {
                  /* Optionally dismiss banner */
                }}
              >
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
                    <p className="text-sm font-semibold text-purple-800">
                      New Technical Recommendation
                    </p>
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-purple-100 text-purple-800 border-purple-200">
                      TR
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {newAssignedTechnicalRecos[0].trNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Account: {newAssignedTechnicalRecos[0].account?.kristem?.Name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Contact: {newAssignedTechnicalRecos[0].contactPerson}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        fetchSelectedTR(newAssignedTechnicalRecos[0].id);
                      }}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      Open Technical Recommendation
                    </button>
                  </div>
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center font-medium transition-colors hover:bg-gray-100 h-8 rounded-md px-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={() => {
                  /* Optionally dismiss banner */
                }}
              >
                <LuX className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Status center */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setActiveCardFilter("all")}
              className="text-left relative flex flex-col rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 cursor-pointer p-6 transition"
            >
              <LuFileText className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Total Recommendations</p>
              <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
              <p className="text-xs text-gray-500">
                All technical recommendations
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("draft")}
              className="text-left relative flex flex-col rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 cursor-pointer p-6 transition"
            >
              <LuClipboard className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Draft</p>
              <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
              <p className="text-xs text-gray-500">
                Recommendations in draft status
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("submitted")}
              className="text-left relative flex flex-col rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 cursor-pointer p-6 transition"
            >
              <LuForward className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Submitted</p>
              <h2 className="text-2xl font-bold">{statusSummary.submitted}</h2>
              <p className="text-xs text-gray-500">Recommendations submitted for approval</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("approved")}
              className="text-left relative flex flex-col rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 cursor-pointer p-6 transition"
            >
              <LuCircleCheck className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Approved</p>
              <h2 className="text-2xl font-bold">{statusSummary.approved}</h2>
              <p className="text-xs text-gray-500">Approved recommendations</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("highPriority")}
              className="text-left relative flex flex-col rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 cursor-pointer p-6 transition"
            >
              <LuCircleAlert className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">High Priority</p>
              <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
              <p className="text-xs text-gray-500">
                High and critical priority items
              </p>
            </button>
          </div>

          {/* Search + Filters + Table */}
          <div className="flex flex-col p-6 border border-gray-200 rounded-md gap-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar - Stretched */}
              <div className="relative flex-1">
                <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors pl-10"
                  placeholder="Search technical recommendations..."
                />
              </div>
              
              {/* Status Filter */}
              <div className="w-full sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="in progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  {/* <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option> */}
                </select>
              </div>
              
              {/* Priority Filter */}
              <div className="w-full sm:w-48">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                >
                  <option value="">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(statusFilter || priorityFilter || activeCardFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter badges */}
                <div className="flex flex-wrap gap-2">
                  {activeCardFilter !== 'all' && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs border border-purple-200">
                      <span>Card:</span>
                      <span className="font-semibold">{activeCardFilter.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <button
                        type="button"
                        className="ml-1 rounded-full hover:bg-purple-100 px-1.5 cursor-pointer"
                        onClick={() => setActiveCardFilter('all')}
                        aria-label="Clear card filter"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {statusFilter && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs border border-blue-200">
                      <span>Status:</span>
                      <span className="font-semibold">{statusFilter}</span>
                      <button
                        type="button"
                        className="ml-1 rounded-full hover:bg-blue-100 px-1.5 cursor-pointer"
                        onClick={() => setStatusFilter('')}
                        aria-label="Clear status filter"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {priorityFilter && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 text-orange-700 px-3 py-1 text-xs border border-orange-200">
                      <span>Priority:</span>
                      <span className="font-semibold">{priorityFilter}</span>
                      <button
                        type="button"
                        className="ml-1 rounded-full hover:bg-orange-100 px-1.5 cursor-pointer"
                        onClick={() => setPriorityFilter('')}
                        aria-label="Clear priority filter"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Clear All Filters */}
                  {(statusFilter || priorityFilter || activeCardFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setActiveCardFilter('all');
                        setStatusFilter('');
                        setPriorityFilter('');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
                
                <span className="text-gray-500 text-sm">({filtered.length} results)</span>
              </div>
            )}

            <TechnicalsTable
              technicals={filtered}
              onView={(technicalReco) => fetchSelectedTR(technicalReco)}
              onEdit={(technicalReco) => fetchEditingTR(technicalReco)}
            />
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <div
        className={`absolute overflow-auto top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          selectedTR && !editingTR
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {selectedTR && !editingTR && (
          <TechnicalDetails
            technicalReco={selectedTR}
            currentUser={currentUser}
            onBack={() => setSelectedTR(null)}
            onEdit={() => fetchEditingTR(selectedTR)}
            onSave={(updatedTR) => {
              setSelectedTR(updatedTR);
              fetchAllData();
              fetchNewAssignedTechnicalRecos();
            }}
            onSubmit={handleSubmitForApproval}
          />
        )}
      </div>

      {/* Form Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          editingTR ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
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
