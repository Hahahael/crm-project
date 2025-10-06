//src/pages/ApprovalsPage
import { useState, useEffect } from "react";
import { LuSearch } from "react-icons/lu";
import ApprovalsTable from "../components/ApprovalsTable";
import SalesLeadDetails from "../components/SalesLeadDetails";
import TechnicalDetails from "../components/TechnicalDetails";
import RFQDetails from "../components/RFQDetails";
import WorkOrderDetails from "../components/WorkOrderDetails";
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
    const [modalData, setModalData] = useState({ assignee: "", dueDate: "", fromTime: "", toTime: "", remarks: "" });
    const [submitting, setSubmitting] = useState(false);

    const fetchApprovals = async () => {
        try {
            const approvalsRes = await apiBackendFetch("/api/workflow-stages/latest-submitted");
            if (!approvalsRes.ok) throw new Error("Failed to fetch approvals");
            const approvalsData = await approvalsRes.json();
            console.log("Fetched approvals:", approvalsData);
            setApprovals(approvalsData);
        } catch (err) {
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
            console.error("Failed to fetch all approvals");
        }
    }

    
    const fetchDetails = async () => {
        console.log("fetchDetails called with selectedApproval:", selectedApproval, "actionApproval:", actionApproval);
        let endpoint = "";
        let moduleId = selectedApproval?.moduleId || actionApproval?.moduleId || null;
        let stageName = selectedApproval?.stageName || actionApproval?.stageName || null;
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
    };

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
    }, [selectedApproval]);

    // Fetch details when actionApproval changes
    useEffect(() => {
        if (!actionApproval) {
            setDetailsData(null);
            return;
        }
        fetchDetails();
    }, [actionApproval]);

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
            const { assignee, dueDate, fromTime, toTime, remarks, nextStage } = form;
            let nextModuleType = null;
            let endpoint = "";
            let payload = {
                woId: actionApproval.woId,
                accountId: actionApproval.accountId,
                contactPerson: detailsData?.contactPerson || detailsData?.immediateSupport || '',
                contactNumber: detailsData?.contactNumber || '',
                contactEmail: detailsData?.contactEmail || detailsData?.emailAddress || '',
                issues: detailsData?.issuesWithExisting || detailsData?.currentSystemIssues || '',
                current: detailsData?.existingSpecifications || detailsData?.currentSystem || '',
                priority: detailsData?.priority || '',
                items: detailsData?.items || [],
                assignee,
                dueDate,
                fromTime,
                toTime,
            };
            let accountId;
            const currentType = actionApproval.stageName || actionApproval.module;
            if (modalType === "approve") {
                if (currentType === "Sales Lead" || currentType === "sales_lead" || currentType === "Technical Recommendation" || currentType === "technical_recommendation") {
                    nextModuleType = nextStage;
                } else if (currentType === "RFQ" || currentType === "rfq") {
                    // Fetch work order details to check isNew
                    let woIsNew = false;
                    if (actionApproval.woId) {
                        try {
                            const woRes = await apiBackendFetch(`/api/workorders/${actionApproval.woId}`);
                            if (woRes.ok) {
                                const woData = await woRes.json();
                                woIsNew = !!woData.isNewAccount;
                                accountId = woData.accountId
                            }
                        } catch {}
                    }
                    nextModuleType = woIsNew ? "NAEF" : "Quotations";
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
                        endpoint = `/api/accounts/${accountId}`;
                        payload = { 
                            isNaef: true,
                            stageStatus: "Draft",
                            dueDate: form.dueDate,
                            woId: actionApproval.woId,
                            assignee };
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
                            woId: actionApproval.woId,
                            stageName: currentType,
                            status: "Approved",
                            assignedTo: assignee,
                            notified: false,
                            remarks,
                            nextStage: nextModuleType
                        })
                    });

                    console.log("Creating next module at", endpoint, "with payload", payload);

                    // Create skeletal record for next module
                    const nextModuleRes = await apiBackendFetch(endpoint, {
                        method: nextModuleType === "NAEF" ? "PUT" : "POST",
                        body: JSON.stringify(payload)
                    });
                    let nextModuleData = null;
                    if (nextModuleRes.ok) {
                        nextModuleData = await nextModuleRes.json();
                    }
                    console.log("Next module created with details", nextModuleData);
                    // Create workflow stage for next module (Draft)
                }
            } else {
                // Rejection: only create workflow stage for current stage
                await apiBackendFetch("/api/workflow-stages", {
                    method: "POST",
                    body: JSON.stringify({
                        woId: actionApproval.woId,
                        stageName: currentType,
                        status: "Rejected",
                        assignedTo: assignee,
                        notified: false,
                        remarks,
                        nextStage: null
                    })
                });
            }

            setModalOpen(false);
            setActionApproval(null);
            setModalType(null);
            setModalData({ assignee: "", dueDate: "", fromTime: "", toTime: "", remarks: "" });
            await fetchApprovals();
        } catch (err) {
            setError("Failed to submit approval/rejection");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-4">Loading Approvals...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

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
                    />
                );
            case "Technical Recommendation":
            case "technical_recommendation":
                return (
                    <TechnicalDetails
                        technical={detailsData}
                        onBack={() => setSelectedApproval(null)}
                    />
                );
            case "RFQ":
            case "rfq":
                return (
                    <RFQDetails
                        rfq={detailsData}
                        onBack={() => setSelectedApproval(null)}
                    />
                );
            case "Work Order":
            case "workorder":
                return (
                    <WorkOrderDetails
                        workOrder={detailsData}
                        onBack={() => setSelectedApproval(null)}
                    />
                );
            case "Account":
            case "account":
            case "NAEF":
                return (
                    <UserDetails
                        user={detailsData}
                        onBack={() => setSelectedApproval(null)}
                    />
                );
            default:
                return <div className="p-4">No details available for this module.</div>;
        }
    };

    return (
        <div className="p-6 relative">
            <h1 className="text-2xl font-bold mb-4">Approvals</h1>
            {/* Users Table */}
            {!selectedApproval && (
                <div className="transition-all duration-300 h-full w-full p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold">Approvals</h1>
                            <h2 className="text-md text-gray-700">Review and approve transactions across all modules</h2>
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
                        </div>
                    </div>
                    <ApprovalsTable
                        approvals={approvals}
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
                style={{ pointerEvents: selectedApproval ? "auto" : "none" }}>
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                    onClick={() => setSelectedApproval(null)}>
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
                    onClose={() => { setModalOpen(false); setActionApproval(null); }}
                    onSubmit={handleModalSubmit}
                />
            )}
        </div>
    );
};

export default ApprovalsPage;
