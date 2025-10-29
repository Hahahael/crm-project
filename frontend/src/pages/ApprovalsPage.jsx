//src/pages/ApprovalsPage
import { useState, useEffect, useCallback, useRef } from "react";
import { LuSearch } from "react-icons/lu";
import ApprovalsTable from "../components/ApprovalsTable";
import SalesLeadDetails from "../components/SalesLeadDetails";
import TechnicalDetails from "../components/TechnicalDetails";
import RFQDetails from "../components/RFQDetails";
import RFQCanvassSheet from "../components/RFQCanvassSheet";
import WorkOrderDetails from "../components/WorkOrderDetails";
import AccountDetails from "../components/AccountDetails";
import UserDetails from "../components/UserDetails";
import ApprovalActionModal from "../components/ApprovalActionModal";
import { apiBackendFetch } from "../services/api";

const ApprovalsPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApproval, setSelectedApproval] = useState(null); // for viewing details
  const [actionApproval, setActionApproval] = useState(null); // for modal actions
  const [detailsData, setDetailsData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'approve' or 'reject'
  const [_modalData, setModalData] = useState({
    assignee: "",
    dueDate: "",
    fromTime: "",
    toTime: "",
    remarks: "",
  });
  const [moduleFilter, setModuleFilter] = useState("all"); // all | account | naef | others
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const timeoutRef = useRef();

  const fetchApprovals = async () => {
    try {
      const approvalsRes = await apiBackendFetch(
        "/api/workflow-stages/latest-submitted",
      );
      if (!approvalsRes.ok) throw new Error("Failed to fetch approvals");
      const approvalsData = await approvalsRes.json();
      console.log("Fetched approvals:", approvalsData);
      setApprovals(approvalsData);
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
      setError("Failed to fetch approvals");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllApprovals = async () => {
    try {
      const approvalsRes = await apiBackendFetch("/api/workflow-stages/");
      if (!approvalsRes.ok) throw new Error("Failed to fetch all approvals");
      const approvalsData = await approvalsRes.json();
      console.log("Fetched all approvals:", approvalsData);
    } catch (err) {
      console.error("Failed to fetch all approvals:", err);
    }
  };

  const fetchDetails = useCallback(async () => {
    console.log(
      "fetchDetails called with selectedApproval:",
      selectedApproval,
      "actionApproval:",
      actionApproval,
    );
    let endpoint = "";
    let moduleId =
      selectedApproval?.moduleId || actionApproval?.moduleId || null;
    let stageName =
      selectedApproval?.stageName || actionApproval?.stageName || null;
    console.log("Determined moduleId:", moduleId);
    switch (stageName) {
      case "Sales Lead":
      case "sales_lead":
        endpoint = `/api/salesleads/${moduleId}`;
        break;
      case "Technical Recommendation":
      case "technical_recommendation":
        endpoint = `/api/technicals/${moduleId}`;
        break;
      case "RFQ":
      case "rfq":
        endpoint = `/api/rfqs/${moduleId}`;
        break;
      case "Work Order":
      case "workorder":
        endpoint = `/api/workorders/${moduleId}`;
        break;
      case "Account":
      case "account":
      case "NAEF":
        endpoint = `/api/accounts/${moduleId}`;
        break;
      default:
        endpoint = null;
    }
    if (!endpoint) {
      setDetailsData(null);
      return;
    }
    try {
      const res = await apiBackendFetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch details");
      const data = await res.json();
      console.log("Fetched details for", endpoint, ":", data);
      setDetailsData(data);
    } catch {
      setDetailsData(null);
    }
  }, [selectedApproval, actionApproval]);

  useEffect(() => {
    fetchAllApprovals();
    fetchApprovals();
  }, []);

  // Fetch details when selectedApproval changes
  useEffect(() => {
    if (!selectedApproval) {
      setDetailsData(null);
      return;
    }
    fetchDetails();
  }, [selectedApproval, fetchDetails]);

  // Fetch details when actionApproval changes
  useEffect(() => {
    if (!actionApproval) {
      setDetailsData(null);
      return;
    }
    fetchDetails();
  }, [actionApproval, fetchDetails]);

  // Success message timeout
  useEffect(() => {
    if (successMessage) {
      // clear any existing timeout first
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    }
  }, [successMessage]);

  // Modal open handler
  const handleAction = (row, type) => {
    console.log("handleAction called with row:", row, "type:", type);
    fetchDetails();
    setActionApproval(row);
    setModalType(type);
    setModalOpen(true);
  };

  // Modal submit handler
  const handleModalSubmit = async (form) => {
    if (!actionApproval) return;
    console.log("Submitting modal with data:", form);
    console.log("Submitting modal with approval:", actionApproval);
    console.log("Submitting modal with details:", detailsData);
    setSubmitting(true);
    try {
      let { assignee, dueDate, fromTime, toTime, remarks, nextStage } = form;
      let nextModuleType = null;
      let endpoint = "";
      let payload = {
        woId: actionApproval.woId,
        accountId: actionApproval.accountId,
        contactPerson:
          detailsData?.contactPerson || detailsData?.immediateSupport || "",
        contactNumber: detailsData?.contactNumber || "",
        contactEmail:
          detailsData?.contactEmail || detailsData?.emailAddress || "",
        issues:
          detailsData?.issuesWithExisting ||
          detailsData?.currentSystemIssues ||
          "",
        current:
          detailsData?.existingSpecifications ||
          detailsData?.currentSystem ||
          "",
        priority: detailsData?.priority || "",
        items: detailsData?.items || [],
        assignee,
        dueDate,
        fromTime,
        toTime,
      };
      let accountId;
      const currentType = actionApproval.stageName || actionApproval.module;
      if (modalType === "approve") {
        if (
          currentType === "Sales Lead" ||
          currentType === "sales_lead"
        ) {
          nextModuleType = nextStage;
        } else if (currentType === "Technical Recommendation" || currentType === "technical_recommendation") {
          // For TR approval, just proceed to the provided next stage
          nextModuleType = nextStage;
        } else if (currentType === "RFQ" || currentType === "rfq") {
          // Fetch work order details to check isNew
          let woIsNew = false;
          console.log("Fetching work order to determine isNewAccount for RFQ approval");
          if (actionApproval.woId) {
            try {
              const woRes = await apiBackendFetch(
                `/api/workorders/${actionApproval.woId}`,
              );
              console.log("Fetched work order for RFQ approval, response:", woRes);
              if (woRes.ok) {
                const woData = await woRes.json();
                console.log("Fetched work order for RFQ approval:", woData);
                woIsNew = !!woData.isNewAccount || woData.is_new_account;
                accountId = woData.accountId || woData.account_id;
              }
            } catch {
              // ignore
            }
          }
          nextModuleType = woIsNew ? "NAEF" : "Quotations";
        } else if (currentType === "NAEF" || currentType === "naef") {
          nextModuleType = "Quotations";
        } else {
          nextModuleType = currentType;
        }
        // Map nextModuleType to endpoint
        switch (nextModuleType) {
          case "Technical Recommendation":
          case "technical_recommendation":
            endpoint = "/api/technicals";
            break;
          case "RFQ":
          case "rfq":
            endpoint = "/api/rfqs";
            break;
          case "NAEF":
          case "naef":
            endpoint = `/api/accounts/approval/${accountId}`;
            payload = {
              isNaef: true,
              stageStatus: "Draft",
              dueDate: form.dueDate,
              woId: actionApproval.woId,
              assignee,
            };
            break;
          case "Quotations":
          case "quotations":
            endpoint = "/api/quotations";
            break;
          case "Sales Lead":
          case "sales_lead":
            endpoint = "/api/salesleads";
            break;
          case "Work Order":
          case "workorder":
            endpoint = "/api/workorders";
            break;
          default:
            endpoint = null;
        }
        if (endpoint) {
          // Create workflow stage for current stage (Approved)
          await apiBackendFetch("/api/workflow-stages", {
            method: "POST",
            body: JSON.stringify({
              wo_id: actionApproval?.wo_id ?? actionApproval?.woId ?? null,
              stage_name: currentType,
              status: "Approved",
              assigned_to: assignee,
              notified: false,
              remarks,
              next_stage: nextModuleType,
            }),
          });

          console.log(
            "Creating next module at",
            endpoint,
            "with payload",
            payload,
          );

          // Create skeletal record for next module
          const nextModuleRes = await apiBackendFetch(endpoint, {
            method: nextModuleType === "NAEF" ? "PUT" : "POST",
            body: JSON.stringify(payload),
          });
          console.log("Next module creation response:", nextModuleRes);
          let nextModuleData = null;
          if (nextModuleRes.ok) {
            nextModuleData = await nextModuleRes.json();
          }
          console.log("Next module created with details", nextModuleData);
          // Create workflow stage for next module (Draft)
        }
      } else {
        // Rejection: only create workflow stage for current stage
        assignee = detailsData?.assignee;
        await apiBackendFetch("/api/workflow-stages", {
          method: "POST",
          body: JSON.stringify({
            wo_id: actionApproval?.wo_id ?? actionApproval?.woId ?? null,
            stage_name: currentType,
            status: "Rejected",
            assigned_to: assignee,
            notified: false,
            remarks,
            next_stage: null,
          }),
        });
      }

      setModalOpen(false);
      setActionApproval(null);
      setModalType(null);
      setModalData({
        assignee: "",
        dueDate: "",
        fromTime: "",
        toTime: "",
        remarks: "",
      });
      
      // Show success message
      const actionText = modalType === "approve" ? "approval" : "rejection";
      setSuccessMessage(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} sent successfully!`);
      
      // Refresh approvals list
      setRefreshing(true);
      await fetchApprovals();
      setRefreshing(false);
    } catch (err) {
      console.error("Failed to submit approval/rejection:", err);
      setError("Failed to submit approval/rejection");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Approvals...</p>
        </div>
      </div>
    );
  }
  
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

  // Render details component based on stage/module
  const renderDetails = () => {
    if (!selectedApproval || !detailsData) return null;
    switch (selectedApproval.stageName || selectedApproval.module) {
      case "Sales Lead":
      case "sales_lead":
        return (
          <SalesLeadDetails
            salesLead={detailsData}
            onBack={() => setSelectedApproval(null)}
            source="approval"
          />
        );
      case "Technical Recommendation":
      case "technical_recommendation":
      case "technical recommendation":
        return (
          <TechnicalDetails
            technicalReco={detailsData}
            onBack={() => setSelectedApproval(null)}
            source="approval"
          />
        );
      case "RFQ":
      case "rfq":
        return (
        <div>
          <RFQDetails
            rfq={detailsData}
            hideTabs={true}
            onBack={() => setSelectedApproval(null)}
            source="approval"
          />
          <RFQCanvassSheet
            rfq={detailsData}
            formItems={detailsData?.items}
            formVendors={detailsData?.vendors}
            mode="view"
            source="quotations"
          />
        </div>
        );
      case "Work Order":
      case "workorder":
      case "work order":
        return (
          <WorkOrderDetails
            workOrder={detailsData}
            onBack={() => setSelectedApproval(null)}
            source="approval"
          />
        );
      case "Account":
      case "account":
      case "NAEF":
      case "naef":
        return (
          <AccountDetails
            account={detailsData}
            currentUser={null}
            workWeeks={[]}
            onBack={() => setSelectedApproval(null)}
            onEdit={() => {}}
            onAccountUpdated={() => {}}
            onPrint={() => {}}
            onSubmit={() => {}}
            source="approval"
          />
        );
      default:
        return <div className="p-4">No details available for this module.</div>;
    }
  };

  // Apply simple module filter
  const visibleApprovals = approvals.filter((row) => {
    const stage = (row.stageName || row.stage_name || row.module || "").toString();
    const isAccount = stage === "Account" || stage === "account" || row.module === "account";
    const isNaef = stage === "NAEF" || stage === "naef";
    if (moduleFilter === "account") return isAccount && !isNaef;
    if (moduleFilter === "naef") return isNaef;
    if (moduleFilter === "others") return !isAccount && !isNaef;
    return true;
  });

  return (
    <div className="p-6 relative">
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

      {/* Users Table */}
      {!selectedApproval && (
        <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Approvals</h1>
                {refreshing && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
              </div>
              <h2 className="text-md text-gray-700">
                Review and approve transactions across all modules
              </h2>
            </div>
          </div>

          {/* Search + Create */}
          <div className="flex items-center mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors pl-10"
                  placeholder="Search users..."
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`h-9 px-3 rounded-md text-sm border ${moduleFilter === "all" ? "bg-gray-800 text-white" : "bg-white"}`}
                  onClick={() => setModuleFilter("all")}
                >
                  All
                </button>
                <button
                  className={`h-9 px-3 rounded-md text-sm border ${moduleFilter === "account" ? "bg-gray-800 text-white" : "bg-white"}`}
                  onClick={() => setModuleFilter("account")}
                >
                  Account
                </button>
                <button
                  className={`h-9 px-3 rounded-md text-sm border ${moduleFilter === "naef" ? "bg-gray-800 text-white" : "bg-white"}`}
                  onClick={() => setModuleFilter("naef")}
                >
                  NAEF
                </button>
                <button
                  className={`h-9 px-3 rounded-md text-sm border ${moduleFilter === "others" ? "bg-gray-800 text-white" : "bg-white"}`}
                  onClick={() => setModuleFilter("others")}
                >
                  Others
                </button>
              </div>
            </div>
          </div>
          <ApprovalsTable
            approvals={visibleApprovals}
            onView={setSelectedApproval}
            onEdit={() => {}}
            onApprove={(row) => handleAction(row, "approve")}
            onReject={(row) => handleAction(row, "reject")}
          />
        </div>
      )}

      {/* Details Drawer */}
      <div
        className={`h-full w-full bg-white shadow-xl z-50 p-6 overflow-y-auto transition-all duration-300
                    ${selectedApproval ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
        style={{ pointerEvents: selectedApproval ? "auto" : "none" }}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
          onClick={() => setSelectedApproval(null)}
        >
          Close
        </button>
        {selectedApproval && renderDetails()}
      </div>

      {/* Approval/Rejection Modal */}
      {modalOpen && (
        <ApprovalActionModal
          isOpen={modalOpen}
          type={modalType}
          approval={actionApproval}
          onClose={() => {
            setModalOpen(false);
            setActionApproval(null);
          }}
          onSubmit={handleModalSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
};

export default ApprovalsPage;
