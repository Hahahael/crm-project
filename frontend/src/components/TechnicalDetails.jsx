import { LuArrowLeft, LuDownload, LuEye, LuFile, LuFileCheck, LuPencil, LuPrinter, LuX } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiBackendFetch } from "../services/api.js";
import utils from "../helper/utils";
import SalesLeadDetails from "./SalesLeadDetails.jsx";
import WorkOrderDetails from "./WorkOrderDetails.jsx";
import RFQDetails from "./RFQDetails.jsx";
import { useUser } from "../contexts/UserContext.jsx";

const TechnicalDetails = ({
  technicalReco,
  onBack,
  onEdit,
  onSave,
  onPrint,
  onSubmit,
  source = "technicalDetails",
  hideTabs = false,
}) => {
  const { currentUser } = useUser();
  console.log("TechnicalDetails - technicalReco:", technicalReco, technicalReco.products);
  console.log("📎 Attachments data:", technicalReco.attachments);
  console.log("📎 Attachments array:", utils.toArray(technicalReco.attachments));
  
  const isAssignedToMe =
    currentUser && technicalReco.assignee === currentUser.id;

  // File size formatter
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if file is previewable
  const isPreviewable = (fileType) => {
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/json'
    ];
    return previewableTypes.includes(fileType?.toLowerCase());
  };

  // Preview file handler
  const previewFileHandler = async (attachmentId, filename, fileType) => {
    console.log('🔍 Preview clicked:', { attachmentId, filename, fileType });
    try {
      const trId = technicalReco.id;
      console.log('📋 TR ID:', trId);
      
      if (!trId) {
        alert('Technical Recommendation ID not found');
        return;
      }

      console.log('🎯 Checking if previewable:', fileType, '→', isPreviewable(fileType));
      if (!isPreviewable(fileType)) {
        console.log('❌ File not previewable, downloading instead');
        // If not previewable, download instead
        downloadAttachment(attachmentId, filename);
        return;
      }

      console.log('📥 Fetching file from API...');
      const response = await apiBackendFetch(`/api/technicals/${trId}/attachments/${attachmentId}/download`);
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }

      console.log('✅ File fetched successfully, creating blob...');
      // Create blob URL for preview
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      console.log('🎨 Blob URL created:', url);
      
      // Set preview state with animation
      console.log('🔄 Setting preview state...');
      setPreviewFile({ id: attachmentId, name: filename, type: fileType });
      setPreviewUrl(url);
      setShowPreview(true);
      // Trigger fade-in animation after a brief delay
      setTimeout(() => setIsAnimating(true), 10);
      console.log('✅ Preview state set successfully');
      
    } catch (error) {
      console.error('Preview error:', error);
      alert(`Failed to preview ${filename}: ${error.message}`);
    }
  };

  // Download attachment handler
  const downloadAttachment = async (attachmentId, filename) => {
    try {
      const trId = technicalReco.id;
      if (!trId) {
        alert('Technical Recommendation ID not found');
        return;
      }

      const response = await apiBackendFetch(`/api/technicals/${trId}/attachments/${attachmentId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download ${filename}: ${error.message}`);
    }
  };

  // Close preview handler with fade-out animation
  const closePreview = () => {
    // Start fade-out animation
    setIsAnimating(false);
    
    // Wait for animation to complete before hiding modal
    setTimeout(() => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
      setPreviewFile(null);
      setPreviewUrl(null);
      setShowPreview(false);
    }, 200); // Match the CSS transition duration
  };
  // const isCreator = currentUser && technicalReco.createdBy === currentUser.id;

  // Tabs: TR (Technical), SL (Sales Lead), WO (Work Order)
  const [activeTab, setActiveTab] = useState("TR");
  const [slDetails, setSlDetails] = useState(null);
  const [woDetails, setWoDetails] = useState(null);
  const [slLoading, setSlLoading] = useState(false);
  const [woLoading, setWoLoading] = useState(false);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [rfqLoading, setRfqLoading] = useState(false);

  // File preview state
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const renderStatusBadge = (status) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = String(status).toLowerCase();
    switch (s) {
      case "draft":
        return "bg-green-100 text-green-800";
      case "open":
      case "pending":
      case "in progress":
      case "in-progress":
      case "active":
      case "started":
        return "bg-blue-50 text-blue-800";
      case "completed":
      case "done":
      case "submitted":
      case "approved":
        return "bg-green-50 text-green-800";
      case "cancelled":
      case "canceled":
        return "bg-red-50 text-red-800";
      default:
        return "bg-gray-50 text-gray-800";
    }
  };

  const renderPriorityBadge = (priority) => {
    console.log(
      "Rendering priority badge for priority:",
      String(priority).toLowerCase(),
    );
    if (!priority) return "bg-gray-50 text-gray-600";
    const s = String(priority).toLowerCase();
    switch (s) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-amber-50 text-amber-700";
      case "high":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  console.log("Technical Recommendation Details:", technicalReco);
  function Detail({ label, value }) {
    return (
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="whitespace-pre-wrap">{value || "-"}</p>
      </div>
    );
  }
  const didSetActuals = useRef(false);

  useEffect(() => {
    if (
      !didSetActuals.current &&
      isAssignedToMe &&
      !technicalReco.actualDate &&
      !technicalReco.actualFromTime
    ) {
      didSetActuals.current = true; // ✅ Prevent future calls
      const now = new Date();
      const actualDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const actualFromTime = now.toTimeString().slice(0, 8); // HH:MM:SS

      apiBackendFetch(`/api/technicals/${technicalReco.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...technicalReco,
          actualDate,
          actualFromTime,
        }),
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((updatedTechnicalReco) => {
          if (onSave) onSave(updatedTechnicalReco);
        });
    }
    // eslint-disable-next-line
  }, [technicalReco?.id, isAssignedToMe]);

  // Lazy-load related Sales Lead when SL tab is selected
  useEffect(() => {
    async function fetchSL() {
      try {
        setSlLoading(true);
        const slId = technicalReco?.slId ?? technicalReco?.sl_id ?? null;
        if (!slId) {
          setSlDetails(null);
          return;
        }
        const res = await apiBackendFetch(`/api/salesleads/${slId}`);
        if (!res?.ok) throw new Error("Failed to fetch sales lead");
        const sl = await res.json();
        setSlDetails(sl);
      } catch (e) {
        console.error("Failed to load related Sales Lead:", e);
        setSlDetails(null);
      } finally {
        setSlLoading(false);
      }
    }
    if (!hideTabs && activeTab === "SL" && !slDetails) fetchSL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, technicalReco?.slId, technicalReco?.sl_id, hideTabs]);

  // Lazy-load related Work Order when WO tab is selected
  useEffect(() => {
    async function fetchWO() {
      try {
        setWoLoading(true);
        const woId = technicalReco?.woId ?? technicalReco?.wo_id ?? null;
        if (!woId) {
          setWoDetails(null);
          return;
        }
        const res = await apiBackendFetch(`/api/workorders/${woId}`);
        if (!res?.ok) throw new Error("Failed to fetch work order");
        const wo = await res.json();
        setWoDetails(wo);
      } catch (e) {
        console.error("Failed to load related Work Order:", e);
        setWoDetails(null);
      } finally {
        setWoLoading(false);
      }
    }
    if (!hideTabs && activeTab === "WO" && !woDetails) fetchWO();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, technicalReco?.woId, technicalReco?.wo_id, hideTabs]);

  return (
    <div className="container mx-auto p-6 overflow-auto">
      {/* Header */}
      <div className="py-4 flex items-center justify-between">
        <div>
          {source === "technicalDetails" && (<button
            onClick={onBack}
            className={`flex items-center mb-2 text-gray-500 hover:text-gray-700 cursor-pointer ${(source === 'technicalDetails' && !hideTabs) ? '' : 'hidden'}`}
          >
            <LuArrowLeft className="h-4 w-4 mr-1" />
            Back to Technical Recommendations
          </button>)}
          <div className="flex items-center gap-3">
            <h1 className={`font-bold ${source === 'technicalDetails' ? 'text-2xl ' : 'text-lg'}`}>{technicalReco.trNumber}</h1>
            <div
              className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${renderStatusBadge(technicalReco.stageStatus)}`}
            >
              {technicalReco.stageStatus}
            </div>
            <div
              className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${renderPriorityBadge(technicalReco.priority)}`}
            >
              {technicalReco.priority}
            </div>
          </div>
          <p className="text-gray-500">{technicalReco.title}</p>
        </div>
        <div className="flex gap-2">
          {/* <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white"
                        // onClick={} // Add handler for move to RFQ
                    >
                        Move to RFQ
                    </button>
                    <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                        // onClick={} // Add handler for move to Quotation
                    >
                        Move to Quotation
                    </button> */}
          <button
            onClick={onPrint}
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white ${technicalReco.stageStatus === "Approved" || technicalReco.stageStatus === "Submitted" ? "hidden pointer-events-none" : "inline-flex"}`}
          >
            <LuPrinter className="h-4 w-4 mr-2" />
            Print
          </button>
          <button
            onClick={() => onEdit(technicalReco)}
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white ${technicalReco.stageStatus === "Approved" || technicalReco.assignee !== currentUser.id ? "hidden pointer-events-none" : "inline-flex"}`}
          >
            <LuPencil className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={() => onSubmit(technicalReco)}
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-green-500 hover:bg-green-600 text-white ${technicalReco.stageStatus === "Approved" || technicalReco.stageStatus === "Submitted" || technicalReco.assignee !== currentUser.id ? "hidden pointer-events-none" : "inline-flex"}`}
          >
            <LuFileCheck className="h-4 w-4 mr-2" />
            Submit for Approval
          </button>
        </div>
      </div>

      {/* Tabs */}
      {!hideTabs && (
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex gap-2" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab("TR")}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "TR" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              Technical
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("SL")}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "SL" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              Sales Lead
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("WO")}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "WO" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              Work Order
            </button>
            <button
              type="button"
              onClick={async () => {
                setActiveTab("RFQ");
                if (rfqDetails || rfqLoading) return;
                try {
                  setRfqLoading(true);
                  // find RFQ by sl_id or wo_id
                  const res = await apiBackendFetch(`/api/rfqs`);
                  if (!res?.ok) throw new Error("Failed to fetch RFQs");
                  const rows = await res.json();
                  const slId = technicalReco?.slId ?? technicalReco?.sl_id;
                  const woId = technicalReco?.woId ?? technicalReco?.wo_id;
                  const match = (rows || []).find(
                    (r) => (r.slId ?? r.sl_id) === slId || (r.woId ?? r.wo_id) === woId,
                  );
                  setRfqDetails(match || null);
                } finally {
                  setRfqLoading(false);
                }
              }}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "RFQ" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              RFQ
            </button>
          </nav>
        </div>
      )}

      {hideTabs || activeTab === "TR" ? (
        <div className="space-y-6 pb-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Technical Recommendation
            </h3>
            <p className="text-sm text-gray-500">{technicalReco.title}</p>
          </div>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Detail label="TR Number" value={technicalReco.trNumber} />
              <Detail
                label="Sales Lead Reference"
                value={technicalReco.slNumber}
              />
              <Detail
                label="Created Date"
                value={utils.formatDate(technicalReco.createdAt, "MM/DD/YYYY")}
              />
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Customer Information
            </h3>
            <p className="text-sm text-gray-500">
              Customer details for this recommendation
            </p>
          </div>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Detail label="Customer Name" value={technicalReco.account?.kristem?.Name} />
              <Detail
                label="Contact Person"
                value={technicalReco.contactPerson}
              />
              <Detail
                label="Contact Email"
                value={technicalReco.contactEmail}
              />
              <Detail
                label="Contact Phone"
                value={technicalReco.contactNumber}
              />
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Technical Details
            </h3>
            <p className="text-sm text-gray-500">System and solution details</p>
          </div>
          <div className="p-6 pt-0 space-y-6">
            <Detail
              label="Current System"
              value={technicalReco.currentSystem}
            />
            <Detail
              label="Current System Issues"
              value={technicalReco.currentSystemIssues}
            />
            <Detail
              label="Proposed Solution"
              value={technicalReco.proposedSolution}
            />
            <Detail
              label="Technical Justification"
              value={technicalReco.technicalJustification}
            />
          </div>
        </div>

        {/* Product Recommendations */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Product Recommendations
            </h3>
            <p className="text-sm text-gray-500">
              Recommended products and pricing
            </p>
          </div>
          <div className="p-6 pt-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-medium text-gray-500">
                    Product Name
                  </th>
                  <th className="text-left font-medium text-gray-500">
                    Part Number
                  </th>
                  <th className="text-left font-medium text-gray-500">
                    Description
                  </th>
                  <th className="text-left font-medium text-gray-500">
                    Brand
                  </th>
                  <th className="text-left font-medium text-gray-500">
                    Unit of Measure
                  </th>
                </tr>
              </thead>
              <tbody>
                {technicalReco.products?.map((product, idx) => {
                  const productId = product.id || idx;
                  return (
                    <tr key={productId}>
                      <td className="p-2">{product.productName || product.product_name || '-'}</td>
                      <td className="p-2">{product.correctedPartNo || product.corrected_part_no || '-'}</td>
                      <td className="p-2">{product.description || '-'}</td>
                      <td className="p-2">{product.brand || '-'}</td>
                      <td className="p-2">{product.unitOm || product.unit_om || '-'}</td>
                    </tr>
                  );
                })}
                {(!technicalReco.products || technicalReco.products.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">
                      No products added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Requirements */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Additional Requirements
            </h3>
            <p className="text-sm text-gray-500">
              Installation, training, and maintenance
            </p>
          </div>
          <div className="p-6 pt-0 space-y-6">
            <Detail
              label="Installation Requirements"
              value={technicalReco.installationRequirements}
            />
            <Detail
              label="Training Requirements"
              value={technicalReco.trainingRequirements}
            />
            <Detail
              label="Maintenance Requirements"
              value={technicalReco.maintenanceRequirements}
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Attachments
            </h3>
            <p className="text-sm text-gray-500">
              Related files and documents ({utils.toArray(technicalReco.attachments).length} files)
            </p>
          </div>
          <div className="p-6 pt-0">
            {utils.toArray(technicalReco.attachments).length > 0 ? (
              <div className="space-y-3">
                {utils.toArray(technicalReco.attachments).map((file, idx) => {
                  console.log('📄 Processing file:', file);
                  const fileName = file.FileName || file.name || 'Unknown File';
                  const fileType = file.FileType || file.type || 'Unknown Type';
                  const fileId = file.Id || file.id;
                  const canPreview = isPreviewable(fileType);
                  console.log(`📄 File details: ${fileName} (${fileType}) - ID: ${fileId} - Previewable: ${canPreview}`);
                  
                  return (
                    <div key={fileId || idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all">
                      <div 
                        className={`flex items-center space-x-4 flex-1 ${canPreview ? '' : ''}`}
                        onClick={() => canPreview && previewFileHandler(fileId, fileName, fileType)}
                      >
                        <div className="relative">
                          <LuFile className="h-8 w-8 text-gray-400" />
                          {canPreview && (
                            <LuEye className="h-4 w-4 text-blue-500 absolute -top-1 -right-1 bg-white rounded-full p-0.5" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${canPreview ? 'text-blue-600 hover:text-blue-800 cursor-pointer' : 'text-gray-900'}`}>
                            {fileName}
                            {canPreview && <span className="text-xs text-blue-500 ml-2">(Click to preview)</span>}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{fileType}</span>
                            <span>•</span>
                            <span>{formatFileSize(file.FileSize || file.size)}</span>
                            {(file.UploadDate || file.uploadDate) && (
                              <>
                                <span>•</span>
                                <span>{new Date(file.UploadDate || file.uploadDate).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {canPreview && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('🔘 Preview button clicked directly');
                              previewFileHandler(fileId, fileName, fileType);
                            }}
                            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300 transition-colors cursor-pointer"
                          >
                            <LuEye className="h-4 w-4 mr-2" />
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => downloadAttachment(fileId, fileName)}
                          className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                        >
                          <LuDownload className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <LuFile className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No attachments found</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">Notes</h3>
          </div>
          <div className="p-6 pt-0">
            <Detail label="Notes" value={technicalReco.additionalNotes} />
          </div>
        </div>

        {/* Approval Information */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Approval Information
            </h3>
          </div>
          <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Detail label="Approved By" value={technicalReco.approvedBy} />
            <Detail label="Approved Date" value={technicalReco.approvedDate} />
          </div>
        </div>
      </div>
      ) : activeTab === "SL" ? (
        <div className="space-y-6 pb-6">
          {slLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading sales lead…</div>
          ) : slDetails ? (
            <SalesLeadDetails
              salesLead={slDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("TR")}
              onEdit={() => alert("Please edit this Sales Lead from the Sales Leads page.")}
              onSubmit={() => {}}
              hideRelatedTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related sales lead found.</div>
          )}
        </div>
      ) : activeTab === "RFQ" ? (
        <div className="space-y-6 pb-6">
          {rfqLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading RFQ…</div>
          ) : rfqDetails ? (
            <RFQDetails
              rfq={rfqDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("TR")}
              onEdit={() => {}}
              onPrint={() => {}}
              onSubmit={() => {}}
              hideTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related RFQ found.</div>
          )}
        </div>
      ) : (
        <div className="space-y-6 pb-6">
          {woLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading work order…</div>
          ) : woDetails ? (
            <WorkOrderDetails
              workOrder={woDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("TR")}
              onEdit={() => alert("Please edit this Work Order from the Work Orders page.")}
              onWorkOrderUpdated={(updated) => setWoDetails(updated)}
              toSalesLead={() => {}}
              hideTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related work order found.</div>
          )}
        </div>
      )}

      {/* File Preview Modal */}
      {showPreview && previewFile && previewUrl && createPortal(
        <div 
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[50] transition-opacity duration-200 ease-out ${
            isAnimating ? 'opacity-100' : 'opacity-0'
          }`} 
          onClick={closePreview}
        >
          <div 
            className={`bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col transform transition-all duration-200 ease-out ${
              isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{previewFile.name}</h3>
                <p className="text-sm text-gray-500">{previewFile.type}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadAttachment(previewFile.id, previewFile.name)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <LuDownload className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={closePreview}
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              {previewFile.type?.startsWith('image/') ? (
                // Image Preview
                <div className="flex justify-center">
                  <img 
                    src={previewUrl} 
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              ) : previewFile.type === 'application/pdf' ? (
                // PDF Preview
                <div className="w-full h-[70vh]">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0 rounded-lg"
                    title={previewFile.name}
                  />
                </div>
              ) : previewFile.type?.startsWith('text/') || previewFile.type === 'application/json' ? (
                // Text Preview
                <div className="bg-gray-50 rounded-lg p-4 max-h-[70vh] overflow-auto">
                  <iframe
                    src={previewUrl}
                    className="w-full h-96 border-0"
                    title={previewFile.name}
                  />
                </div>
              ) : (
                // Fallback for unsupported types
                <div className="text-center py-8">
                  <LuFile className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Preview not available for this file type</p>
                  <button
                    onClick={() => downloadAttachment(previewFile.id, previewFile.name)}
                    className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  >
                    <LuDownload className="h-4 w-4 mr-2" />
                    Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TechnicalDetails;
