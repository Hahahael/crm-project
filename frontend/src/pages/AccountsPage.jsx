import { useEffect, useState, useRef } from "react";
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
import { apiBackendFetch } from "../services/api";
import LoadingModal from "../components/LoadingModal";
import AccountsTable from "../components/AccountsTable";
import AccountDetails from "../components/AccountDetails";
import AccountForm from "../components/AccountForm";
import { useUser } from "../contexts/UserContext.jsx";

export default function AccountsPage() {
  const { currentUser } = useUser();
  const timeoutRef = useRef();
  const location = useLocation();
  const salesLead = location.state?.salesLead;
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editingAccount, setEditingAccount] = useState(salesLead || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [newAssignedAccounts, setNewAssignedAccounts] = useState([]);
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [statusFilter, setStatusFilter] = useState(null); // 'draft' | 'pending_approval' | 'overdue' | null

  console.log("editingAccount:", editingAccount);

  const fetchAllData = async () => {
    console.log("fetchAllData called");
    try {
      const accountsRes = await apiBackendFetch("/api/accounts/naefs");
      if (!accountsRes.ok) throw new Error("Failed to fetch NAEF Accounts");

      console.log("Accounts response:", accountsRes);

      const accountsData = await accountsRes.json();
      setAccounts(accountsData);
      console.log("Fetched accounts:", accountsData);

      // Calculate status summary from accounts data
      const today = new Date();
      const summary = {
        total: accountsData.length,
        pending: 0, // Draft NAEFs
        inProgress: 0, // Pending Approval NAEFs  
        completed: 0 // Overdue NAEFs
      };

      accountsData.forEach(account => {
        const stageStatus = (account.stageStatus || account.stage_status || "").toLowerCase();
        const dueDate = account.dueDate || account.due_date;

        // Draft NAEFs
        if (stageStatus === 'draft') {
          summary.pending++;
        }
        
        // Pending Approval NAEFs (Submitted)
        if (stageStatus === 'submitted') {
          summary.inProgress++;
        }
        
        // Overdue NAEFs (not approved and past due date)
        if (stageStatus !== 'approved' && dueDate && new Date(dueDate) < today) {
          summary.completed++;
        }
      });

      setStatusSummary(summary);
      setTimeout(() => setLoading(false));
    } catch (err) {
      setAccounts([]);
      setTimeout(() => setLoading(false));
      console.error("Error retrieving accounts:", err);
      setError("Failed to fetch accounts.");
    }
  };

  const fetchNewAssignedNAEFs = async () => {
    if (!currentUser) return;
    try {
      const naefsRes = await apiBackendFetch(
        `/api/workflow-stages/assigned/latest/${currentUser.id}/${encodeURIComponent("NAEF")}`,
      );

      if (naefsRes.ok) {
        const data = await naefsRes.json();
        console.log("New assigned accounts:", data);
        setNewAssignedAccounts(data);
        console.log("New Assigned Accounts:", newAssignedAccounts);
      }
    } catch (err) {
      console.error("Failed to fetch assigned workorders", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNewAssignedNAEFs();
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
        message="Loading NAEFs..."
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

  const filtered = accounts
    .filter((a) => {
      // Search filter
      const q = (search || "").toLowerCase();
      const name = (a.kristem?.Name || a.account_name || "").toLowerCase();
      const code = (a.kristem?.Code || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    })
    .filter((a) => {
      // Status filter
      if (!statusFilter) return true;
      
      const stageStatus = (a.stageStatus || a.stage_status || "").toLowerCase();
      const today = new Date();
      const dueDate = a.dueDate || a.due_date;
      
      switch (statusFilter) {
        case 'draft':
          return stageStatus === 'draft';
        case 'pending_approval':
          return stageStatus === 'submitted';
        case 'overdue':
          return stageStatus !== 'approved' && dueDate && new Date(dueDate) < today;
        default:
          return true;
      }
    });

  // Fetch a single account and set as selected (details view)
  const fetchSelectedAccount = async (id) => {
    if (!id) return;

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && (id.kristemAccountId || id.id) ? id.kristemAccountId ?? id.id : id;
    console.log("Fetching selected account with ID:", resolvedId);

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/accounts/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch account");
      const account = await res.json();
      console.log("Fetched selected account:", account);
      setSelectedAccount(account);
      setEditingAccount(null);
    } catch (err) {
      console.error("Error fetching selected account", err);
      setError("Failed to load account");
    } finally {
      // setLoading(false);
    }
  };

  // Fetch a single sales lead and set into editing drawer
  const fetchEditingAccount = async (id) => {
    if (!id) return;

    console.log("fetchEditingAccount called with id:", id);

    // 🧠 handle case when id is actually an object
    const resolvedId = typeof id === "object" && (id.kristemAccountId || id.id || id.accountId) ? id.kristemAccountId ?? id.id ?? id.accountId : id;
    console.log("Fetching selected account with ID:", resolvedId);

    try {
      // setLoading(true);
      const res = await apiBackendFetch(`/api/accounts/${resolvedId}`);
      if (!res.ok) throw new Error("Failed to fetch account for edit");
      const account = await res.json();
      setEditingAccount(account);
      setSelectedAccount(null);
    } catch (err) {
      console.error("Error fetching editing account", err);
      setError("Failed to load account for editing");
    } finally {
      // setLoading(false);
    }
  };

  const handleSave = async (formData, mode) => {
    console.log("Saving account:", formData, "Mode:", mode);
    try {
      console.log(formData.id);
      const submitData = { ...formData, stageStatus: "In Progress" };
      
      let response;
      if (mode === "create") {
        response = await apiBackendFetch("/api/accounts", {
          method: "POST",
          body: JSON.stringify(submitData),
        });
      } else {
        response = await apiBackendFetch(`/api/accounts/${submitData.kristemAccountId}`, {
          method: "PUT",
          body: JSON.stringify(submitData),
        });
      }

      if (!response.ok) throw new Error("Failed to save account");
      const savedAccount = await response.json();

      await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id: savedAccount?.wo_id ?? savedAccount?.woSourceId ?? formData?.wo_id ?? formData?.woSourceId ?? null,
          account_id: savedAccount.id,
          stage_name: "NAEF",
          status: "In Progress",
          assigned_to: savedAccount?.prepared_by ?? savedAccount?.preparedBy ?? formData?.prepared_by ?? formData?.preparedBy ?? null,
        }),
      });

      // Fetch all workflow stages and log them
      const stagesRes = await apiBackendFetch("/api/workflow-stages");
      if (stagesRes.ok) {
        const allStages = await stagesRes.json();
        console.log("All workflow stages:", allStages);
      }

      setSuccessMessage("Account saved successfully!");
      await fetchAllData();
      await fetchNewAssignedNAEFs();
      fetchSelectedAccount(savedAccount);
    } catch (err) {
      console.error("Error saving NAEF Stage:", err);
      setError("Failed to save NAEF Stage");
    }
  };

  const handleSubmitForApproval = async (formData) => {
    try {
      // Set stage_status to Submitted
      const submitData = { ...formData, stageStatus: "Submitted" };
      const response = await apiBackendFetch(`/api/accounts/${formData.kristemAccountId}`, {
        method: "PUT",
        body: JSON.stringify(submitData),
      });
      if (!response.ok)
        throw new Error("Failed to submit account for approval");
      const savedAccount = await response.json();
      console.log("Submitted account for approval:", savedAccount);

      // Create workflow stage for new account
      const result = await apiBackendFetch("/api/workflow-stages", {
        method: "POST",
        body: JSON.stringify({
          wo_id: savedAccount.woSourceId,
          account_id: savedAccount.id,
          stage_name: "NAEF",
          status: "Submitted",
          assigned_to: savedAccount.prepared_by || savedAccount.preparedBy,
        }),
      });

      if (!result.ok) throw new Error("Failed to create workflow stage");

      console.log("Workflow stage created:", result);

      setSuccessMessage("Account submitted for approval!");
      setSelectedAccount(null);
      setEditingAccount(null);
      await fetchAllData();
      await fetchNewAssignedNAEFs();
    } catch (err) {
      console.error("Error submitting for approval:", err);
      setError("Failed to submit NAEF for approval");
    }
  };
  // Placeholder for state and logic
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
      {!selectedAccount && !editingAccount && (
        <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">
                NAEF Management
              </h1>
              <h2 className="text-md text-gray-700">
                View and manage all New Account Enrollment Forms
              </h2>
            </div>
          </div>

          {/* Banner Notifications */}
          {currentUser && newAssignedAccounts.length > 1 && (
            <div className="flex border-purple-200 border-2 rounded-xl p-4 mb-6 bg-purple-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
              <div className="flex space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <LuBell className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <LuCircleAlert className="h-4 w-4 text-purple-600" />
                    <p className="text-sm font-semibold text-purple-800">
                      {`You have ${newAssignedAccounts.length} new NAEF${
                        newAssignedAccounts.length > 1 ? "s" : ""
                      } assigned to you`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900">
                      {newAssignedAccounts.map((acc) => acc?.account?.kristem?.Code).join(", ")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={async () => await fetchEditingAccount(newAssignedAccounts[0])}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      View First NAEF
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
          {currentUser && newAssignedAccounts.length === 1 && (
            <div className="flex border-purple-200 border-2 rounded-xl p-4 mb-6 bg-purple-50 items-start justify-between text-card-foreground shadow-lg animate-pulse">
              <div className="flex space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <LuBell className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <LuCircleAlert className="h-4 w-4 text-purple-600" />
                    <p className="text-sm font-semibold text-purple-800">
                      New NAEF
                    </p>
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 bg-purple-100 text-purple-800 border-purple-200">
                      NAEF
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">
                      {newAssignedAccounts[0]?.account?.kristem?.Code} - {"New Account Setup"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Account: {newAssignedAccounts[0].accountId}
                    </p>
                    <p className="text-sm text-gray-600">
                      Contact: {newAssignedAccounts[0].contactPerson}
                    </p>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        fetchEditingAccount(newAssignedAccounts[0]);
                      }}
                      className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors shadow h-8 rounded-md px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    >
                      Open NAEF
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
            <div 
              className={`relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition ${!statusFilter ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setStatusFilter(null)}
              role="button"
              tabIndex={0}
            >
              <LuFileText className="absolute top-6 right-6 text-gray-600" />
              <p className="text-sm mb-1 mr-4">Total NAEFs</p>
              <h2 className="text-2xl font-bold">{statusSummary.total}</h2>
              <p className="text-xs text-gray-500">
                All account enrollment forms
              </p>
            </div>
            <div 
              className={`relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition ${statusFilter === "draft" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setStatusFilter("draft")}
              role="button"
              tabIndex={0}
            >
              <LuClipboard className="absolute top-6 right-6 text-yellow-600" />
              <p className="text-sm mb-1 mr-4">Draft NAEFs</p>
              <h2 className="text-2xl font-bold">{statusSummary.pending}</h2>
              <p className="text-xs text-gray-500">
                Forms in draft status
              </p>
            </div>
            <div 
              className={`relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition ${statusFilter === "pending_approval" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setStatusFilter("pending_approval")}
              role="button"
              tabIndex={0}
            >
              <LuCircleCheck className="absolute top-6 right-6 text-blue-600" />
              <p className="text-sm mb-1 mr-4">Pending Approval</p>
              <h2 className="text-2xl font-bold">{statusSummary.inProgress}</h2>
              <p className="text-xs text-gray-500">
                Forms awaiting approval
              </p>
            </div>
            <div 
              className={`relative flex flex-col rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition ${statusFilter === "overdue" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setStatusFilter("overdue")}
              role="button"
              tabIndex={0}
            >
              <LuCircleAlert className="absolute top-6 right-6 text-red-600" />
              <p className="text-sm mb-1 mr-4">Overdue NAEFs</p>
              <h2 className="text-2xl font-bold">{statusSummary.completed}</h2>
              <p className="text-xs text-gray-500">
                Forms past due date
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
                  placeholder="Search NAEFs..."
                />
              </div>
            </div>

            {/* Active Filter Display */}
            {statusFilter && (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs border border-blue-200">
                  <span>Filter:</span>
                  <span className="font-semibold">
                    {statusFilter === 'draft' && 'Draft NAEFs'}
                    {statusFilter === 'pending_approval' && 'Pending Approval'}
                    {statusFilter === 'overdue' && 'Overdue NAEFs'}
                  </span>
                  <button
                    type="button"
                    className="ml-1 rounded-full hover:bg-blue-100 px-1.5 cursor-pointer"
                    onClick={() => setStatusFilter(null)}
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <AccountsTable
              accounts={filtered}
              onView={(account) => {
                fetchSelectedAccount(account);
              }}
              onEdit={(account) => {
                fetchEditingAccount(account);
              }}
            />
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <div
        className={`absolute overflow-auto top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          selectedAccount && !editingAccount
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {selectedAccount && !editingAccount && (
          <AccountDetails
            account={selectedAccount}
            currentUser={currentUser}
            onBack={() => setSelectedAccount(null)}
            onEdit={() => fetchEditingAccount(selectedAccount)}
            onSubmit={(formData) => handleSubmitForApproval(formData)}
          />
        )}
      </div>

      {/* Form Drawer */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-white shadow-xl transition-all duration-300 ${
          editingAccount
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        }`}
      >
        {editingAccount && (
          <AccountForm
            account={editingAccount}
            mode={editingAccount?.id ? "edit" : "create"}
            onSave={(formData, mode) => handleSave(formData, mode)}
            onBack={() => {
              fetchNewAssignedNAEFs();
              fetchSelectedAccount(editingAccount);
            }}
          />
        )}
      </div>
    </div>
  );
}
