import { LuArrowLeft, LuFileCheck, LuPencil, LuPrinter } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { apiBackendFetch } from "../services/api.js";
import utils from "../helper/utils";
import SalesLeadDetails from "./SalesLeadDetails.jsx";
import WorkOrderDetails from "./WorkOrderDetails.jsx";

const TechnicalDetails = ({
  technicalReco,
  currentUser,
  onBack,
  onEdit,
  onSave,
  onPrint,
  onSubmit,
  source = "technicalDetails"
}) => {
  console.log("TechnicalDetails - technicalReco:", technicalReco);
  const isAssignedToMe =
    currentUser && technicalReco.assignee === currentUser.id;
  // const isCreator = currentUser && technicalReco.createdBy === currentUser.id;

  // Tabs: TR (Technical), SL (Sales Lead), WO (Work Order)
  const [activeTab, setActiveTab] = useState("TR");
  const [slDetails, setSlDetails] = useState(null);
  const [woDetails, setWoDetails] = useState(null);
  const [slLoading, setSlLoading] = useState(false);
  const [woLoading, setWoLoading] = useState(false);

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

  // Lazy-load related Sales Lead when tab is selected
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
    if (activeTab === "SL" && !slDetails) fetchSL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, technicalReco?.slId, technicalReco?.sl_id]);

  // Lazy-load related Work Order when tab is selected
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
    if (activeTab === "WO" && !woDetails) fetchWO();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, technicalReco?.woId, technicalReco?.wo_id]);

  return (
    <div className="container mx-auto p-6 overflow-auto">
      {/* Header */}
      <div className="py-4 flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className={`flex items-center mb-2 text-gray-500 hover:text-gray-700 cursor-pointer ${source === 'technicalDetails' ? '' : 'hidden'}`}
          >
            <LuArrowLeft className="h-4 w-4 mr-1" />
            Back to Technical Recommendations
          </button>
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
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white ${technicalReco.stageStatus === "Approved" || technicalReco.stageStatus === "Submitted" ? "hidden pointer-events-none" : "inline-flex"}`}
          >
            <LuPencil className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={() => onSubmit(technicalReco)}
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-green-500 hover:bg-green-600 text-white ${technicalReco.stageStatus === "Approved" || technicalReco.stageStatus === "Submitted" ? "hidden pointer-events-none" : "inline-flex"}`}
          >
            <LuFileCheck className="h-4 w-4 mr-2" />
            Submit for Approval
          </button>
        </div>
      </div>

      {/* Tabs */}
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
        </nav>
      </div>

      {activeTab === "SL" ? (
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
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related sales lead found.</div>
          )}
        </div>
      ) : activeTab === "WO" ? (
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
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related work order found.</div>
          )}
        </div>
      ) : (
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
                  <th className="text-left font-medium text-gray-500">Model</th>
                  <th className="text-left font-medium text-gray-500">
                    Description
                  </th>
                  <th className="text-right font-medium text-gray-500">
                    Quantity
                  </th>
                  <th className="text-right font-medium text-gray-500">
                    Unit Price
                  </th>
                  <th className="text-right font-medium text-gray-500">
                    Total Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {technicalReco.items?.map((prod, idx) => {
                  const price =
                    prod.unitPrice ??
                    prod.Price_Details ??
                    prod.LocalPrice ??
                    prod.LocalPrice_Detail ??
                    prod.Price ??
                    prod.SourcePrice ??
                    prod.SourcePrice_Detail ??
                    0;
                  const total = prod.quantity * price;

                  return (
                    <tr key={idx}>
                      <td className="p-2">{prod.Description}</td>
                      <td className="p-2">{prod.Code}</td>
                      <td className="p-2">{prod.Description}</td>
                      <td className="p-2 text-right">{prod.quantity}</td>
                      <td className="p-2 text-right">
                        ₱ {price.toLocaleString()}
                      </td>
                      <td className="p-2 text-right">
                        ₱ {total.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={5} className="p-2 text-right font-bold">
                    Total
                  </td>
                  <td className="p-2 text-right font-bold">
                    ₱{" "}
                    {(technicalReco.items || [])
                      .reduce((sum, i) => {
                        const price =
                          i.unitPrice ??
                          i.Price_Details ??
                          i.LocalPrice ??
                          i.LocalPrice_Detail ??
                          i.Price ??
                          i.SourcePrice ??
                          i.SourcePrice_Detail ??
                          0;
                        const qty = i.quantity ?? 0;
                        return sum + qty * price;
                      }, 0)
                      .toLocaleString()}
                  </td>
                </tr>
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
            <p className="text-sm text-gray-500">Related files and documents</p>
          </div>
          <div className="p-6 pt-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-medium text-gray-500">
                    File Name
                  </th>
                  <th className="text-left font-medium text-gray-500">Type</th>
                  <th className="text-left font-medium text-gray-500">Size</th>
                  <th className="text-left font-medium text-gray-500">
                    Uploaded By
                  </th>
                  <th className="text-left font-medium text-gray-500">
                    Upload Date
                  </th>
                  <th className="text-right font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {utils.toArray(technicalReco.attachments).map((file, idx) => (
                  <tr key={idx}>
                    <td className="p-2">{file.name}</td>
                    <td className="p-2">{file.type}</td>
                    <td className="p-2">{file.size}</td>
                    <td className="p-2">{file.uploadedBy}</td>
                    <td className="p-2">{file.uploadDate}</td>
                    <td className="p-2 text-right">
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 w-9">
                        {/* Download icon here */}
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      )}
    </div>
  );
};

export default TechnicalDetails;
