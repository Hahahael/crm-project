//src/pages/WorkOrdersPage
import { useState, useEffect } from "react";
import { LuCheck, LuClipboardList, LuClock, LuPlus, LuSearch } from "react-icons/lu";
import WorkOrdersTable from "../components/WorkOrdersTable";
import WorkOrderDetails from "../components/WorkOrderDetails";
import WorkOrderForm from "../components/WorkOrderForm";

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedWO, setSelectedWO] = useState(null);
  const [editingWO, setEditingWO] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // mock fetch (replace with API later)
  useEffect(() => {
    setWorkOrders([
      {
        woId: 1,
        woNumber: "WO-2025-0001",
        workDescription: "Install router",
        assignee: "John Doe",
        department: "IT",
        type: "FSL",
        accountName: "Acme Corp",
        industry: "Telecom",
        mode: "Onsite",
        productBrand: "Cisco",
        contactPerson: "Alice Johnson",
        contactNumber: "09171234567",
        woDate: "2025-09-12",
        dueDate: "2025-09-20",
        fromTime: "09:00",
        toTime: "12:00",
        actualDate: "2025-09-19",
        actualFromTime: "09:30",
        actualToTime: "11:45",
        status: "Pending",
        objective: "Setup new router for HQ",
        instruction: "Install in server room and configure VLANs",
        targetOutput: "Stable router connection for all departments"
      },
      {
        woId: 2,
        woNumber: "WO-2025-0002",
        workDescription: "Server maintenance",
        assignee: "Jane Smith",
        department: "Ops",
        type: "ESL",
        accountName: "Globex Inc",
        industry: "Finance",
        mode: "Remote",
        productBrand: "Dell",
        contactPerson: "Bob Lee",
        contactNumber: "09179876543",
        woDate: "2025-09-15",
        dueDate: "2025-09-18",
        fromTime: "14:00",
        toTime: "17:00",
        actualDate: "",
        actualFromTime: "",
        actualToTime: "",
        status: "In Progress",
        objective: "Perform quarterly maintenance",
        instruction: "Check logs, update OS patches",
        targetOutput: "Servers up-to-date and optimized"
      }
    ]);

    const fetchAllData = async () => {
      try {
        const []
      }
    }
  }, []);

  // Handlers
  const handleView = (order) => {
    setSelectedWO(order);
    setEditingWO(null);
  };

  const handleEdit = (order) => {
    setEditingWO(order || null); // null = new
    setSelectedWO(null);
  };

  const handleBack = () => {
    setSelectedWO(null);
    setEditingWO(null);
  };

  const handleSave = (orderData) => {
    if (orderData.woId) {
      // update existing
      setWorkOrders((prev) =>
        prev.map((wo) => (wo.woId === orderData.woId ? orderData : wo))
      );
    } else {
      // create new
      const newId = workOrders.length + 1;
      const newOrder = {
        ...orderData,
        woId: newId,
        woNumber: `WO-2025-${String(newId).padStart(4, "0")}`,
      };
      setWorkOrders((prev) => [...prev, newOrder]);
    }
    setEditingWO(null);
    setSelectedWO(null);
  };


  const filtered = workOrders.filter(
    (wo) =>
      wo.woNumber.toLowerCase().includes(search.toLowerCase()) ||
      wo.accountName.toLowerCase().includes(search.toLowerCase())
  );

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
          {/* Notifications Container */}
          <div></div>
          {/* Status Center Container */}
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
          {/* Search + Table Container */}
          <div className="flex flex-col p-6 border border-gray-200 rounded-md gap-6">
            <div className="flex">
              <div className="relative flex gap-6">
                  <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"/>
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors pl-10"
                    placeholder="Search workorders..."
                  />
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => handleEdit(null)}
                  className="ml-auto px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 font-medium transition-all duration-150 cursor-pointer text-sm flex shadow-sm"
                >
                  <LuPlus className="my-auto mr-2"/> Create New
                </button>
              </div>
            </div>
            <WorkOrdersTable
              workOrders={filtered}
              onView={handleView}
              onEdit={handleEdit}
            />
          </div>
          

        </div>
      )}
      <div className="xl:max-w-4/5 mx-auto">
        {/* Drawer/Modal for Details */}
        {selectedWO && !editingWO && (
          <WorkOrderDetails
            workOrder={selectedWO}
            onBack={handleBack}
            onEdit={handleEdit}/>
        )}

        {/* Form (Create/Edit) */}
        {editingWO && (
          <WorkOrderForm
            wo={selectedWO}
            onClose={() => {
              setSelectedWO(null);
              setShowForm(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
