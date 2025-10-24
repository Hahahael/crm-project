//src/pages/WorkOrdersPage
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LuBell,
  LuCheck,
  LuCircleAlert,
  LuClipboardList,
  LuClock,
  LuPlus,
  LuSearch,
  LuX,
} from "react-icons/lu";
import WorkOrdersTable from "../components/WorkOrdersTable";
import WorkOrderDetails from "../components/WorkOrderDetails";
import WorkOrderForm from "../components/WorkOrderForm";
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";
import { toSnake } from "../helper/utils";

export default function WorkOrdersPage() {
  const timeoutRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();

  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedWO, setSelectedWO] = useState(null);
  const [editingWO, setEditingWO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [newAssignedWorkOrders, setNewAssignedWorkOrders] = useState([]);
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const fetchAllData = async () => {
    try {
      const workOrdersRes = await apiBackendFetch("/api/workorders");
      if (!workOrdersRes.ok) throw new Error("Failed to fetch Work Orders");

      const workOrdersData = await workOrdersRes.json();
      console.log("Fetched work orders:", workOrdersData);
      setWorkOrders(workOrdersData);

      // Fetch status summary
      const summaryRes = await apiBackendFetch(
        "/api/workorders/summary/status",
      );
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        console.log("Fetched status summary:", summaryData);
        setStatusSummary({
          total: Number(summaryData.total ?? 0) || 0,
          pending: Number(summaryData.pending ?? summaryData.inPendingFix ?? 0) || 0,
          inProgress: Number(
            summaryData.inProgress ?? summaryData.in_progress ?? 0,
          ) || 0,
          completed: Number(summaryData.completed ?? 0) || 0,
        });
      }

      // Add a minimum delay before hiding loading modal
      setTimeout(() => setLoading(false), 500);
    } catch (err) {
      console.error("Error retrieving workorders:", err);
      setError("Failed to fetch work orders.");
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

  const fetchNewAssignedWorkOrders = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await apiBackendFetch(
        `/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("Work Order")}`,
      );

      if (res.ok) {
        const data = await res.json();
        console.log("New assigned workorders:", data);
        setNewAssignedWorkOrders(data);
  }
    } catch (err) {
      console.error("Failed to fetch assigned workorders", err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCurrentUser();
    fetchAllData();
  }, []);

  // Open create form when navigated from Calendar with a selected date
  useEffect(() => {
    const state = location?.state;
    if (state && state.openCreate) {
      setSelectedWO(null);
      setEditingWO({ wo_date: state.woDate || undefined });
      // Clear the navigation state to avoid reopening on back/refresh
      navigate("/workorders", { replace: true });
    }
  }, [location?.state, navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchNewAssignedWorkOrders();
    }
  }, [currentUser, fetchNewAssignedWorkOrders]);

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

  const filtered = workOrders.filter(
    (wo) =>
      wo.woNumber?.toLowerCase().includes(search.toLowerCase()) ||
      (wo.accountName || "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = async (formData, mode) => {
    console.log("Handle Save called with data:", formData, "Mode:", mode);
    try {
      // If creating a new account, also create the account
      if (formData.is_new_account) {
        const accountResponse = await apiBackendFetch(
          mode === "edit" ? `/api/accounts/${formData.accountId}` : "/api/accounts",
          {
            method: mode === "edit" ? "PUT" : "POST",
            body: JSON.stringify(formData),
          }
        );
        if (!accountResponse.ok) throw new Error("Failed to create/update account");
        const newAccount = await accountResponse.json();
        console.log("Created/Updated new account:", newAccount);
        formData.accountId = newAccount.id;
      }

      console.log("Final formData to be saved:", formData);

      const response = await apiBackendFetch(
        mode === "edit" ? `/api/workorders/${formData.id}` : "/api/workorders",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: JSON.stringify({ ...formData, created_by: currentUser.id }),
        },
      );

      if (!response.ok) throw new Error("Failed to save workorder");

      const savedWorkOrder = await response.json();

      // If creating, also create the initial workflow stage
      if (mode !== "edit") {
        await apiBackendFetch("/api/workflow-stages", {
          method: "POST",
          body: JSON.stringify({
            wo_id: savedWorkOrder?.wo_id ?? savedWorkOrder?.woId ?? savedWorkOrder?.id,
            stage_name: "Work Order",
            status: "In Progress",
            assigned_to: savedWorkOrder?.assignee ?? null,
          }),
        });
      }

      // Fetch all workflow stages and log them
      const stagesRes = await apiBackendFetch("/api/workflow-stages");
      if (stagesRes.ok) {
        const allStages = await stagesRes.json();
        console.log("All workflow stages:", allStages);
      }

      setSuccessMessage("Work order saved successfully!");
      await fetchAllData();
      await fetchSelectedWO(savedWorkOrder.id);
    } catch (err) {
      console.error("Error saving workorder:", err);
      setError("Failed to save work order");
    }
  };

  const handleToSalesLead = async (passedWO) => {
    console.log("Converting WO to Sales Lead:", passedWO);
    try {
      // 1. Create skeletal sales lead
      const res = await apiBackendFetch("/api/salesleads", {
        method: "POST",
        body: JSON.stringify({
          accountId: passedWO.accountId,
          woId: passedWO.id,
          assignee: passedWO.assignee,
          contactPerson: passedWO.contactPerson,
          contactNumber: passedWO.contactNumber,
        }),
      });
      if (!res || !res.ok) throw new Error("Failed to create sales lead");
      const newSalesLead = await res.json();

      // 2. File workflow stage for draft sales lead
      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id: passedWO.id,
          stage_name: "Work Order",
          status: "In Progress",
          assigned_to: currentUser.id,
        }),
      });

      // 2. File workflow stage for draft sales lead
      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id: passedWO.id,
          stage_name: "Sales Lead",
          status: "Draft",
          assigned_to: currentUser.id,
        }),
      });

      // 3. Navigate to sales lead page with new sales lead ID
      navigate("/salesleads", { state: { salesLeadId: newSalesLead.id } });
      setSelectedWO(null);
    } catch (err) {
      console.error("Error creating skeletal sales lead:", err);
    }
  };


  // Fetch a single work order and set as selected (details view)
  const fetchSelectedWO = async (id) => {
    if (!id) return;
    console.log("Fetching selected work order with id:", id);

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && id.id ? id.id : id;

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/workorders/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch work order");
      const wo = await res.json();
      console.log("Fetched selected work order:", wo);
      setSelectedWO(wo);
      setEditingWO(null);
    } catch (err) {
      console.error("Error fetching selected work order", err);
      setError("Failed to load work order");
    } finally {
      // setLoading(false);
    }
  };

  // Fetch a single work order and set into editing drawer
  const fetchEditingWO = async (id) => {
    if (!id) return;

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && id.id ? id.id : id;

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/workorders/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch work order for edit");
      const wo = await res.json();
      setEditingWO(wo);
      setSelectedWO(null);
    } catch (err) {
      console.error("Error fetching editing work order", err);
      setError("Failed to load work order for editing");
    } finally {
      // setLoading(false);
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

      {/* Work Orders Table */}
      {!selectedWO && !editingWO && (
        <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">Work Order Management</h1>
              <h2 className="text-md text-gray-700">
                View and manage all work orders
              </h2>
            </div>
          </div>

          {/* Banner Notifications */}
          {currentUser && newAssignedWorkOrders.length > 1 && (
            <div className="flex border-orange-200 border-2 rounded-xl p-4 mb-6 bg-orange-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
              <div className="flex space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <LuBell className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <LuCircleAlert className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-semibold text-orange-800">
                      {`You have ${newAssignedWorkOrders.length} new work order${newAssignedWorkOrders.length > 1 ? "s" : ""} assigned to you`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900">
                      {newAssignedWorkOrders
                        .map((wo) => wo.woNumber)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setSelectedWO(
                          workOrders.find(
                            (wo) => wo.id === newAssignedWorkOrders[0].woId,
                          ),
                        );
                        addWorkFlowStage(
                          newAssignedWorkOrders[0].id,
                          "Work Order",
                          currentUser.id,
                          "edit",
                        );
                      }}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                    >
                      View First Work Order
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
          {currentUser && newAssignedWorkOrders.length === 1 && (
            <div className="flex border-orange-200 border-2 rounded-xl p-4 mb-6 bg-orange-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
              <div className="flex space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <LuBell className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <LuCircleAlert className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-semibold text-orange-800">
                      New XSL Work Order Received
                    </p>
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-orange-100 text-orange-800 border-orange-200">
                      XSL
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {newAssignedWorkOrders[0].woNumber} -{" "}
                      {newAssignedWorkOrders[0].workDescription}
                    </p>
                    <p className="text-sm text-gray-600">
                      Account: {newAssignedWorkOrders[0].accountName}
                    </p>
                    <p className="text-sm text-gray-600">
                      Contact: {newAssignedWorkOrders[0].contactPerson}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setSelectedWO(
                          workOrders.find(
                            (wo) => wo.id === newAssignedWorkOrders[0].woId,
                          ),
                        );
                        addWorkFlowStage(
                          newAssignedWorkOrders[0].woId,
                          "Work Order",
                          currentUser.id,
                          "edit",
                        );
                      }}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                    >
                      Open Work Order
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuClipboardList className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Total Workorders</p>
              <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
              <p className="text-xs text-gray-500">
                All workorders in the system
              </p>
            </div>
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuClock className="absolute top-6 right-6 text-yellow-600" />
              <p className="text-sm mb-1 mr-4">Pending</p>
              <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
              <p className="text-xs text-gray-500">
                Workorders waiting to be started
              </p>
            </div>
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuClock className="absolute top-6 right-6 text-blue-600" />
              <p className="text-sm mb-1 mr-4">In Progress</p>
              <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
              <p className="text-xs text-gray-500">
                Workorders currently active
              </p>
            </div>
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuCheck className="absolute top-6 right-6 text-green-600" />
              <p className="text-sm mb-1 mr-4">Completed</p>
              <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
              <p className="text-xs text-gray-500">
                Successfully completed workorders
              </p>
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
                  placeholder="Search workorders..."
                />
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => {
                    setEditingWO({});
                    setSelectedWO(null);
                  }}
                  className="ml-auto px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 font-medium transition-all duration-150 cursor-pointer text-sm flex shadow-sm"
                >
                  <LuPlus className="my-auto mr-2" /> Create New
                </button>
              </div>
            </div>

            <WorkOrdersTable
              workOrders={filtered}
              onView={(workOrder) => {
                fetchSelectedWO(workOrder);
              }}
              onEdit={(workOrder) => {
                fetchEditingWO(workOrder);
              }}
            />
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          selectedWO && !editingWO
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {selectedWO && !editingWO && (
          <WorkOrderDetails
            workOrder={selectedWO}
            currentUser={currentUser}
            onBack={() => {
              setSelectedWO(null);
              fetchNewAssignedWorkOrders();
            }}
            onEdit={() => fetchEditingWO(selectedWO)}
            onWorkOrderUpdated={(updatedWO) => {
              fetchSelectedWO(updatedWO);
              // Optionally, update the workOrders array as well:
              setWorkOrders((prev) =>
                prev.map((wo) => (wo.id === updatedWO.id ? updatedWO : wo)),
              );
              fetchNewAssignedWorkOrders(); // <-- refresh from backend
            }}
            toSalesLead={(passedWO) => handleToSalesLead(passedWO)}
          />
        )}
      </div>

      {/* Form Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          editingWO ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        {editingWO && (
          <WorkOrderForm
            workOrder={toSnake(editingWO)}
            mode={editingWO?.id ? "edit" : "create"}
            onSave={handleSave}
            onBack={() => setEditingWO(null)}
          />
        )}
      </div>
    </div>
  );
}
