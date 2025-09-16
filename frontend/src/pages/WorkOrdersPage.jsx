//src/pages/WorkOrdersPage
import { useState, useEffect } from "react";
import { LuCheck, LuClipboardList, LuClock, LuPlus, LuSearch } from "react-icons/lu";
import WorkOrdersTable from "../components/WorkOrdersTable";
import WorkOrderDetails from "../components/WorkOrderDetails";
import WorkOrderForm from "../components/WorkOrderForm";
import { apiBackendFetch } from "../services/api";

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedWO, setSelectedWO] = useState(null);   // details drawer key
  const [editingWO, setEditingWO] = useState(null);     // form drawer key
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null)

  const fetchAllData = async () => {
    try {
      const workOrdersRes = await apiBackendFetch("/api/workorders");
      console.log(workOrdersRes);

      if (!workOrdersRes.ok)
        throw new Error("Failed to fetch Work Orders");

      const workOrdersData = await workOrdersRes.json();

      console.log((workOrdersData));
      setWorkOrders(workOrdersData);
      setLoading(false);
    } catch (err) {
      console.error("Error retrieving workorders:", err);
      setError("Failed to fetch work orders.");
    }
  }

  // mock fetch (replace with API later)
  useEffect(() => {
    fetchAllData();
  }, []);
  
  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  // search filter (controlled input now)
  const filtered = workOrders.filter(
    (wo) =>
      wo.woNumber?.toLowerCase().includes(search.toLowerCase()) ||
      (wo.accountName || "").toLowerCase().includes(search.toLowerCase())
  );

  // Save handler: edit or create (mirrors UsersPage behavior)
  const handleSave = async (formData, mode) => {
    try {
      console.log(formData)
      const response = await apiBackendFetch(
        mode === "edit" ? `/api/workorders/${formData.id}` : "/api/workorders",
        {
          method: mode === "edit" ? "PUT" : "POST",
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) throw new Error ("Failed to save workorder");

      const savedWorkOrder = await response.json();
      console.log("Saved:", savedWorkOrder);

      await fetchAllData();
      if (mode === "edit") {
        setWorkOrders((prev) => 
          prev.map((wo) => (wo.id === savedWorkOrder.id ? savedWorkOrder : wo))
        );
        setSelectedWO(savedWorkOrder);
      } else {
        setWorkOrders((prev) => [...prev, savedWorkOrder]);
      }

        setEditingWO(null);
    } catch (err) {
      console.error("Error saving workorder:", err);
      setError("Failed to save work order");
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
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

          {/* Status center */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuClipboardList className="absolute top-6 right-6 text-gray-600"/>
              <p className="text-sm mb-1">Total Workorders</p>
              <h2 className="text-2xl font-bold">13</h2>
              <p className="text-xs text-gray-500">All workorders in the system</p>
            </div>
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuClock className="absolute top-6 right-6 text-yellow-600"/>
              <p className="text-sm mb-1">Pending</p>
              <h2 className="text-2xl font-bold">13</h2>
              <p className="text-xs text-gray-500">Workorders waiting to be started</p>
            </div>
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuClock className="absolute top-6 right-6 text-blue-600"/>
              <p className="text-sm mb-1">In Progress</p>
              <h2 className="text-2xl font-bold">13</h2>
              <p className="text-xs text-gray-500">Workorders currently active</p>
            </div>
            <div className="relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6">
              <LuCheck className="absolute top-6 right-6 text-green-600"/>
              <p className="text-sm mb-1">Completed</p>
              <h2 className="text-2xl font-bold">13</h2>
              <p className="text-xs text-gray-500">Successfully completed workorders</p>
            </div>
          </div>

          {/* Search + Table */}
          <div className="flex flex-col p-6 border border-gray-200 rounded-md gap-6">
            <div className="flex">
              <div className="relative flex gap-6">
                <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"/>
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
                  onClick={() => { setEditingWO({}); setSelectedWO(null); }}
                  className="ml-auto px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 font-medium transition-all duration-150 cursor-pointer text-sm flex shadow-sm"
                >
                  <LuPlus className="my-auto mr-2"/> Create New
                </button>
              </div>
            </div>

            <WorkOrdersTable
              workOrders={filtered}
              onView={(workOrder) => {
                setSelectedWO(workOrder);
                setEditingWO(null);
              }}
              onEdit={(workOrder) => {
                setEditingWO(workOrder);
                setSelectedWO(null);
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
            onBack={() => setSelectedWO(null)}
            onEdit={() => setEditingWO(selectedWO)}
          />
        )}
      </div>

      {/* Form Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          editingWO
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {editingWO && (
          <WorkOrderForm
            workOrder={editingWO}
            mode={editingWO?.id ? "edit" : "create"}
            onSave={handleSave}
            onBack={() => setEditingWO(null)}
          />
        )}
      </div>
    </div>
  );
}
