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
      const response = await apiBackendFetch(
        formData.id ? `/api/salesleads/${formData.id}` : "/api/salesleads",
        {
          method: formData.id ? "PUT" : "POST",
          body: JSON.stringify(formData),
        },
      );
      if (!response.ok) throw new Error("Failed to save sales lead");
      const savedSalesLead = await response.json();

      // File workflow stage as Submitted
      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id:
            savedSalesLead?.wo_id ?? savedSalesLead?.woId ?? formData?.wo_id ?? formData?.woId ?? null,
          stage_name: "Sales Lead",
          status: "Submitted",
          assigned_to: savedSalesLead?.assignee ?? formData?.assignee ?? null,
        }),
      });

      apiBackendFetch(`/api/salesleads/${formData.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          stageStatus: "Submitted",
          actualToTime: new Date().toTimeString().slice(0, 8),
        }),
        headers: { "Content-Type": "application/json" },
      });

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
        // setLoading(true);
        try {
          const res = await apiBackendFetch(`/api/salesleads/${salesLeadId}`);
          if (!res.ok) throw new Error("Failed to fetch sales lead");
          const salesLead = await res.json();
          setEditingSL(salesLead);
        } catch (err) {
          setError("Failed to fetch sales lead");
        } finally {
          // setLoading(false);
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
    highUrgency: 0,
  });
  const [latestStages, setLatestStages] = useState([]); // latest stage per workorder
  const [activeCardFilter, setActiveCardFilter] = useState("all"); // all | salesLeadStage | technicalStage | rfqStage | highUrgency

  const fetchAllData = async () => {
    try {
      const salesLeadsRes = await apiBackendFetch("/api/salesleads");
      if (!salesLeadsRes.ok) throw new Error("Failed to fetch Sales Leads");

      const salesLeadsData = await salesLeadsRes.json();
      setSalesLeads(
        Array.isArray(salesLeadsData) ? salesLeadsData : [salesLeadsData],
      );

      // Compute High Urgency locally from salesLeads
      const highUrgencyCount = (Array.isArray(salesLeadsData)
        ? salesLeadsData
        : [salesLeadsData]
      ).filter((sl) =>
        String(sl?.urgency || "").toLowerCase().includes("high"),
      ).length;

      // Fetch latest summary per workorder and map to cards
      try {
        const latestRes = await apiBackendFetch(
          "/api/workflow-stages/summary/latest",
        );
        if (latestRes.ok) {
          const latest = await latestRes.json();
          setLatestStages(Array.isArray(latest) ? latest : []);
          const pick = (row) =>
            String(row?.stage_name || row?.stageName || "").toLowerCase();
          const total = Array.isArray(latest) ? latest.length : 0;
          const salesLeadStage = latest.filter(
            (r) => pick(r) === "sales lead",
          ).length;
          const technicalStage = latest.filter(
            (r) => pick(r) === "technical recommendation",
          ).length;
          const rfqNaefQuotation = latest.filter((r) => {
            const s = pick(r);
            return s === "rfq" || s === "naef" || s === "quotations";
          }).length;

          setStatusSummary({
            total,
            pending: salesLeadStage,
            inProgress: technicalStage,
            completed: rfqNaefQuotation,
            highUrgency: highUrgencyCount,
          });
        } else {
          setStatusSummary((prev) => ({ ...prev, highUrgency: highUrgencyCount }));
        }
      } catch (e) {
        setStatusSummary((prev) => ({ ...prev, highUrgency: highUrgencyCount }));
      }

      console.log("Fetched sales leads:", salesLeadsData);

      setTimeout(() => setLoading(false));
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
    if (!currentUser) return;
    try {
      const res = await apiBackendFetch(
        `/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("Sales Lead")}`,
      );

      if (res.ok) {
        const data = await res.json();
        console.log("New assigned sales leads:", data);
        setNewAssignedSalesLeads(data);
      }
    } catch (err) {
      console.error("Failed to fetch assigned sales leads", err);
    }
  }, [currentUser]);

  // Fetch a single sales lead and set as selected (details view)
  const fetchSelectedSL = useCallback(async (id) => {
    if (!id) return;

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && id.id ? id.id : id;

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/salesleads/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch sales lead");
      const sl = await res.json();
      console.log("Fetched selected sales lead:", sl);
      setSelectedSL(sl);
      setEditingSL(null);
    } catch (err) {
      console.error("Error fetching selected sales lead", err);
      setError("Failed to load sales lead");
    } finally {
      // setLoading(false);
    }
  }, []);

  // Fetch a single sales lead and set into editing drawer
  const fetchEditingSL = useCallback(async (id) => {
    if (!id) return;

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && id.id ? id.id : id;

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/salesleads/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch sales lead for edit");
      const sl = await res.json();
      setEditingSL(sl);
      setSelectedSL(null);
    } catch (err) {
      console.error("Error fetching editing sales lead", err);
      setError("Failed to load sales lead for editing");
    } finally {
      // setLoading(false);
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

    if (error) {
      return (
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      );
    }

  const term = (search || "").toLowerCase();

  const latestStageByWoId = (woId) => {
    const row = (latestStages || []).find(
      (r) => (r.wo_id ?? r.woId) === (woId ?? null),
    );
    if (!row) return null;
    const s = String(row?.stage_name || row?.stageName || "").toLowerCase();
    return s;
  };

  const stageMatchesActiveFilter = (sl) => {
    if (activeCardFilter === "all") return true;
    if (activeCardFilter === "highUrgency") {
      return String(sl?.urgency || "").toLowerCase().includes("high");
    }
    const woId = sl?.woId ?? sl?.wo_id ?? sl?.id ?? null;
    const s = latestStageByWoId(woId);
    if (!s) return false;
    switch (activeCardFilter) {
      case "salesLeadStage":
        return s === "sales lead";
      case "technicalStage":
        return s === "technical recommendation";
      case "rfqStage": {
        return s === "rfq" || s === "naef" || s === "quotations" || s === "quotation";
      }
      default:
        return true;
    }
  };

  const filtered = salesLeads.filter((sl) => {
    const slNum = (sl.slNumber || sl.sl_number || "").toLowerCase();
    const accName = (
      sl.account?.account_name || sl.accountName || sl.account_name || ""
    ).toLowerCase();
    const matchesText = slNum.includes(term) || accName.includes(term);
    return matchesText && stageMatchesActiveFilter(sl);
  });

  const handleSave = async (formData, mode) => {
    console.log("Trying to save!");
    try {
      console.log(formData);
      const payload =
        mode === "edit"
          ? formData
          : {
              ...formData,
              woId: formData.woId || formData.id || null,
              assignee: currentUser?.id,
            };
      const response = await apiBackendFetch(
        mode === "edit" ? `/api/salesleads/${formData.id}` : "/api/salesleads",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw new Error("Failed to save saleslead");
      const savedSalesLead = await response.json();

      // Create a new workflow stage for this sales lead
      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id:
            savedSalesLead?.wo_id ?? savedSalesLead?.woId ?? formData?.wo_id ?? formData?.woId ?? null,
          stage_name: "Sales Lead",
          status: savedSalesLead?.status || "In Progress",
          assigned_to: savedSalesLead?.assignee ?? formData?.assignee ?? null,
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
      fetchSelectedSL(savedSalesLead.id);
    } catch (err) {
      console.error("Error saving saleslead:", err);
      setError("Failed to save sales lead");
    }
  };

  const addWorkFlowStage = async (
    woId,
    stageName,
    assignedTo,
    mode = "create",
  ) => {
    console.log(
      `Adding workflow stage: WO ID ${woId}, Stage: ${stageName}, Assigned To: ${assignedTo}, Mode: ${mode}`,
    );
    try {
      const response = await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id: woId,
          stage_name: stageName,
          status: mode === "create" ? "Pending" : "In Progress",
          assigned_to: assignedTo,
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
      {!selectedSL && !editingSL && (
        <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">Sales Lead Management</h1>
              <h2 className="text-md text-gray-700">
                View and manage all sales leads
              </h2>
            </div>
          </div>

          {/* Banner Notifications */}
          {/* {currentUser && newAssignedSalesLeads.length > 1 && (
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
                    <p className="text-sm text-gray-900">
                      {newAssignedSalesLeads
                        .map((sl) => sl.slNumber)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setSelectedSL(newAssignedSalesLeads[0])}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                    >
                      View First Sales Lead
                    </button>
                  </div>
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center font-medium transition-colors hover:bg-gray-100 h-8 rounded-md px-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={() => {
                }}
              >
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
                    <p className="text-sm font-semibold text-blue-800">
                      New Sales Lead
                    </p>
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-orange-100 text-orange-800 border-orange-200">
                      LEAD
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {newAssignedSalesLeads[0].slNumber} -{" "}
                      {newAssignedSalesLeads[0].workDescription}
                    </p>
                    <p className="text-sm text-gray-600">
                      Account: {newAssignedSalesLeads[0].accountName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Contact: {newAssignedSalesLeads[0].contactPerson}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setEditingSL({});
                        setSelectedSL(null);
                      }}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                    >
                      Open Sales Lead
                    </button>
                  </div>
                </div>
              </div>
              <button
                className="inline-flex items-center justify-center font-medium transition-colors hover:bg-gray-100 h-8 rounded-md px-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={() => {}}
              >
                <LuX className="h-4 w-4" />
              </button>
            </div>
          )} */}

          {/* Status center */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setActiveCardFilter("all")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "all" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuChartColumn className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Total Leads</p>
              <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
              <p className="text-xs text-gray-500">
                Active sales leads in system
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("salesLeadStage")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "salesLeadStage" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuFileText className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Sales Lead Stage</p>
              <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
              <p className="text-xs text-gray-500">
                Leads in initial stage
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("technicalStage")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "technicalStage" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuClipboardCheck className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Technical Stage</p>
              <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
              <p className="text-xs text-gray-500">
                Leads in technical review
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("rfqStage")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "rfqStage" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuChartLine className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">RFQ / NAEF / Quotation</p>
              <h2 className="text-2xl font-bold">{statusSummary.highUrgency}</h2>
              <p className="text-xs text-gray-500">
                Leads in advanced stages
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("highUrgency")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "highUrgency" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuClock className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-5">High Urgency</p>
              <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
              <p className="text-xs text-gray-500">
                Leads requiring immediate attention
              </p>
            </button>
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
                fetchSelectedSL(salesLead);
              }}
              onEdit={(salesLead) => {
                fetchEditingSL(salesLead.id);
              }}
            />
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <div
        className={`absolute overflow-auto top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          selectedSL && !editingSL
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {selectedSL && !editingSL && (
          <SalesLeadDetails
            salesLead={selectedSL}
            currentUser={currentUser}
            onBack={() => setSelectedSL(null)}
            onEdit={() => fetchEditingSL(selectedSL.id)}
            onSubmit={(passedSL) => {
              handleSubmitForApproval(passedSL);
            }}
            onSalesLeadUpdated={(updatedSalesLead) => {
              if (!updatedSalesLead) return;
              // Update selected and list locally to avoid repeated network refetches
              setSelectedSL(updatedSalesLead);
              setSalesLeads((prev) => {
                if (Array.isArray(prev))
                  return prev.map((sl) =>
                    sl.id === updatedSalesLead.id ? updatedSalesLead : sl,
                  );
                console.warn("setSalesLeads expected array but got", prev);
                return [updatedSalesLead];
              });
              fetchNewAssignedSalesLeads();
            }}
          />
        )}
      </div>

      {/* Form Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          editingSL ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
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
