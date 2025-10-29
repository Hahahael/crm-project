//src/pages/RFQsPage
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LuBell,
  LuCircleAlert,
  LuClipboard,
  LuFileText,
  LuMessageCircle,
  LuSearch,
  LuSend,
  LuX,
} from "react-icons/lu";
import RFQsTable from "../components/RFQsTable";
import RFQDetails from "../components/RFQDetails";
import RFQForm from "../components/RFQFormWrapper";
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";
import RFQCanvassSheet from "../components/RFQCanvassSheet";

export default function RFQsPage() {
  const timeoutRef = useRef();

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
  const [activeCardFilter, setActiveCardFilter] = useState("all"); // all | draft | sent | responded | completed

  const fetchAllData = async () => {
    try {
      const RFQsRes = await apiBackendFetch("/api/rfqs");
      if (!RFQsRes.ok)
        throw new Error("Failed to fetch Technical Recommendations");

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

  const fetchNewAssignedRFQs = useCallback(async () => {
    console.log("fetchNewRFQs called");
    if (!currentUser) return;
    try {
      const res = await apiBackendFetch(
        `/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("RFQ")}`,
      );

      if (res.ok) {
        const data = await res.json();
        setNewAssignedRFQs(data);
      }
    } catch (err) {
      console.error("Failed to fetch assigned RFQs", err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCurrentUser();
    fetchAllData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNewAssignedRFQs();
    }
  }, [currentUser, fetchNewAssignedRFQs]);

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
        message="Loading Requests for Quotation..."
        subtext="Please wait while we fetch your data."
      />
    );
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  // Filter by card selection
  const statusMatchesActiveFilter = (rfq) => {
    if (activeCardFilter === "all") return true;
    
    const status = (rfq.status || "").toLowerCase();
    switch (activeCardFilter) {
      case "draft":
        return status === "draft" || status === "pending";
      case "sent":
        return status === "sent" || status === "submitted";
      case "responded":
        return status === "responded" || status === "quoted";
      case "completed":
        return status === "completed" || status === "approved";
      default:
        return true;
    }
  };

  const term = (search || "").toLowerCase();
  const filtered = RFQs.filter((rfq) => {
    const rfqNum = (rfq.rfqNumber || rfq.rfq_number || "").toLowerCase();
    const accName = (
      rfq.account?.account_name || rfq.accountName || rfq.account_name || ""
    ).toLowerCase();
    const matchesSearch = rfqNum.includes(term) || accName.includes(term);
    const matchesFilter = statusMatchesActiveFilter(rfq);
    
    return matchesSearch && matchesFilter;
  });

  const handleSave = async (formData, mode) => {
    console.log("Saving RFQ:", formData, "Mode:", mode);
    try {
      const rfqRes = await apiBackendFetch(`/api/rfqs/${formData.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      if (!rfqRes.ok) throw new Error("Failed to save RFQ");

      const rfqData = await rfqRes.json();
      console.log("Saved RFQ data:", rfqData);
      const rfqWOId = rfqData?.wo_id ?? rfqData?.woId ?? null;

      // Create a new workflow stage for this sales lead
      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id: rfqWOId,
          stage_name: "RFQ",
          status: "In Progress",
          assigned_to: currentUser?.id ?? null,
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
      setSelectedRFQ(null);
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
          wo_id: savedRFQ?.wo_id ?? savedRFQ?.woId ?? formData?.wo_id ?? formData?.woId ?? null,
          stage_name: "RFQ",
          status: "Submitted",
          assigned_to: savedRFQ?.assignee ?? formData?.assignee ?? null,
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
  };

  const fetchEditingRFQById = async (rfqId) => {
    if (!currentUser) return;
    try {
      const res = await apiBackendFetch(`/api/rfqs/${rfqId}`);

      if (res.ok) {
        const data = await res.json();
        console.log(
          "fetchEditingRFQById: received rfq, items:",
          data.items,
          "type:",
          typeof data.items,
        );
        setSelectedRFQ(data);
        setEditingRFQ(data);
        console.log("Data", data);
      }
    } catch (err) {
      console.error("Failed to fetch assigned RFQ", err);
    }
  };

  // removed unused saveRFQById to satisfy linter

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
      {!selectedRFQ && !editingRFQ && (
        <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">
                Requests for Quotation Management
              </h1>
              <h2 className="text-md text-gray-700">
                View and manage all requests for quotation
              </h2>
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
                    <p className="text-sm text-gray-900">
                      {newAssignedRFQs.map((rfq) => rfq.rfqNumber).join(", ")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => fetchRFQById(newAssignedRFQs[0].id)}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      View First RFQ
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
          {currentUser && newAssignedRFQs.length === 1 && (
            <div className="flex border-amber-200 border-2 rounded-xl p-4 mb-6 bg-amber-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
              <div className="flex space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <LuBell className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <LuCircleAlert className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">
                      New RFQ
                    </p>
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-amber-100 text-amber-800 border-amber-200">
                      RFQ
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {newAssignedRFQs[0].rfqNumber} - Quotation Request
                    </p>
                    <p className="text-sm text-gray-600">
                      Vendors:{" "}
                      {newAssignedRFQs[0].vendors?.length || "Loading..."}
                    </p>
                    <p className="text-sm text-gray-600">
                      Items: {newAssignedRFQs[0].items?.length || "Loading..."}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        fetchRFQById(newAssignedRFQs[0].id);
                      }}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      Open Request for Quotation
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
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "all" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuFileText className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Total RFQs</p>
              <h2 className="text-2xl font-bold">{RFQs.length}</h2>
              <p className="text-xs text-gray-500">
                All requests for quotation
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("draft")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "draft" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuClipboard className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Draft</p>
              <h2 className="text-2xl font-bold">
                {RFQs.filter(rfq => {
                  const status = (rfq.status || "").toLowerCase();
                  return status === "draft" || status === "pending";
                }).length}
              </h2>
              <p className="text-xs text-gray-500">RFQs in draft status</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("sent")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "sent" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuSend className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Sent</p>
              <h2 className="text-2xl font-bold">
                {RFQs.filter(rfq => {
                  const status = (rfq.status || "").toLowerCase();
                  return status === "sent" || status === "submitted";
                }).length}
              </h2>
              <p className="text-xs text-gray-500">RFQs sent to vendors</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("responded")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "responded" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuMessageCircle className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Responded</p>
              <h2 className="text-2xl font-bold">
                {RFQs.filter(rfq => {
                  const status = (rfq.status || "").toLowerCase();
                  return status === "responded" || status === "quoted";
                }).length}
              </h2>
              <p className="text-xs text-gray-500">
                RFQs with vendor responses
              </p>
            </button>
            <button
              type="button"
              onClick={() => setActiveCardFilter("completed")}
              className={`text-left relative flex flex-col rounded-xl shadow-sm border p-6 transition ${activeCardFilter === "completed" ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200 hover:bg-gray-50 cursor-pointer"}`}
            >
              <LuCircleAlert className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Completed</p>
              <h2 className="text-2xl font-bold">
                {RFQs.filter(rfq => {
                  const status = (rfq.status || "").toLowerCase();
                  return status === "completed" || status === "approved";
                }).length}
              </h2>
              <p className="text-xs text-gray-500">Completed RFQs</p>
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
                  placeholder="Search RFQs..."
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
          selectedRFQ && !editingRFQ
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
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
              setRFQs((prev) =>
                prev.map((tr) => (tr.id === updatedRFQ.id ? updatedRFQ : tr)),
              );
              fetchNewAssignedRFQs(); // <-- refresh from backend
            }}
            onSubmit={(selectedRFQ) => {
              handleSubmitForApproval(selectedRFQ);
            }}
          />
        )}
      </div>

      {/* Form Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          editingRFQ && editingRFQ.id
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {editingRFQ && editingRFQ.id && (
          <>
            {console.log(
              "Rendering RFQForm with editingRFQ (items):",
              editingRFQ.items,
            )}
            <RFQForm
              rfq={{
                ...editingRFQ,
                items: Array.isArray(editingRFQ.items) ? editingRFQ.items : [],
              }}
              tab={selectedTab}
              mode={editingRFQ?.id ? "edit" : "create"}
              onSave={(formData, mode) => handleSave(formData, mode)}
              onBack={() => setEditingRFQ(null)}
              isApproved={editingRFQ.stageStatus === "Approved"}
            />
          </>
        )}
      </div>
    </div>
  );
}
