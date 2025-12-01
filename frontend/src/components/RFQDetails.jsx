import {
  LuArrowLeft,
  LuChartBar,
  LuFileCheck,
  LuMail,
  LuPencil,
  LuPrinter,
  LuUsers,
} from "react-icons/lu";
import { useEffect, useState } from "react";
import { apiBackendFetch } from "../services/api";
import utils, { formatMoney } from "../helper/utils";
import SalesLeadDetails from "./SalesLeadDetails.jsx";
import WorkOrderDetails from "./WorkOrderDetails.jsx";
import TechnicalDetails from "./TechnicalDetails.jsx";
import { useUser } from "../contexts/UserContext.jsx";

const RFQDetails = ({
  rfq,
  onBack,
  onEdit,
  onPrint,
  onSubmit,
  hideTabs = false,
  source = "rfq"
}) => {
  const { currentUser } = useUser();
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [activeTab, setActiveTab] = useState("RFQ"); // RFQ | SL | WO | TR
  const [slDetails, setSlDetails] = useState(null);
  const [woDetails, setWoDetails] = useState(null);
  const [trDetails, setTrDetails] = useState(null);
  const [slLoading, setSlLoading] = useState(false);
  const [woLoading, setWoLoading] = useState(false);
  const [trLoading, setTrLoading] = useState(false);
  const [hasTechnical, setHasTechnical] = useState(false);
  const isAssignedToMe = currentUser && rfq.assignee === currentUser.id;

  function Detail({ label, value }) {
    return (
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="whitespace-pre-wrap">{value || "-"}</p>
      </div>
    );
  }
  function VendorDetail({ label, value }) {
    return (
      <div className="flex justify-between space-x-3">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="whitespace-pre-wrap text-right">{value || "-"}</p>
      </div>
    );
  }

  useEffect(() => {
    async function fetchLatestRFQ() {
      if (!rfq?.id) return;
      try {
        const rfqRes = await apiBackendFetch(`/api/rfqs/${rfq.id}`);
        if (!rfqRes.ok) throw new Error("Failed to fetch RFQ");
        const data = await rfqRes.json();
        console.log("Fetched RFQ details:", data);
        setVendors(data.vendors || []);
        setItems(data.items || []);
      } catch (err) {
        console.error("Failed to fetch RFQ", err);
      }
    }
    fetchLatestRFQ();
  }, [rfq?.id]);

  // Probe if a Technical Recommendation exists via sl_id or wo_id
  useEffect(() => {
    let cancelled = false;
    async function probeTR() {
      // Try to find a TR by sl_id or wo_id
      const res = await apiBackendFetch(`/api/technicals`).catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) setHasTechnical(false);
        return;
      }
      const rows = await res.json().catch(() => []);
      const slId = rfq?.slId ?? rfq?.sl_id;
      const woId = rfq?.woId ?? rfq?.wo_id;
      const match = (rows || []).find(
        (r) => r.slId === slId || r.sl_id === slId || r.woId === woId || r.wo_id === woId,
      );
      if (!cancelled) {
        setHasTechnical(!!match);
        setTrDetails(match || null);
      }
    }
    probeTR();
    return () => {
      cancelled = true;
    };
  }, [rfq?.slId, rfq?.sl_id, rfq?.woId, rfq?.wo_id]);

  useEffect(() => {
    // if (isAssignedToMe && !rfq.actualDate && !rfq.actualFromTime) {
    //     const now = new Date();
    //     const actualDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    //     const actualFromTime = now.toTimeString().slice(0, 8); // HH:MM:SS
    //     apiBackendFetch(`/api/rfqs/${rfq.id}`, {
    //         method: "PUT",
    //         body: JSON.stringify({
    //             ...rfq,
    //             actualDate,
    //             actualFromTime,
    //         }),
    //         headers: { "Content-Type": "application/json" },
    //     })
    //         .then((res) => res.json())
    //             .then(() => {
    //                 // updated
    //             });
    // }
  }, [rfq?.id, isAssignedToMe]);

  // Vendor summary stats (derive status from quotes)
  const totalVendors = vendors.length;

  const vendorDisplayName = (v) => {
    return v?.Name || v?.name || v?.vendor?.Name || "-";
  };

  const vendorContactPerson = (v) => {
    return (
      v?.details?.Name_Detail ||
      v?.vendor?.details?.[0]?.Name ||
      v?.vendor?.details?.[0]?.EmailAddress ||
      "-"
    );
  };

  const checkVendorStatus = (v) => {
    // prefer existing status if explicitly set
    if (v?.status) return v.status;
    const quotes = Array.isArray(v?.quotes) ? v.quotes : [];
    if (quotes.length === 0) return "Pending";

    const hasPrice = (q) => {
      const p =
        q?.unit_price ??
        q?.unitPrice ??
        q?.price ??
        q?.amount ??
        q?.UnitPrice ??
        q?.Unit_Price;
      if (p === null || p === undefined) return false;
      // empty string should be treated as absent
      if (typeof p === "string" && p.trim() === "") return false;
      return true;
    };

    const hasLeadTime = (q) => {
      const lt =
        q?.lead_time ?? q?.leadTime ?? q?.LeadTime ?? q?.lead_time_text;
      if (lt === null || lt === undefined) return false;
      if (typeof lt === "string" && lt.trim() === "") return false;
      return true;
    };

    let completeCount = 0;
    for (const q of quotes) {
      if (hasPrice(q) && hasLeadTime(q)) completeCount++;
    }

    if (completeCount === quotes.length) return "Quoted";
    if (completeCount > 0) return "Incomplete";
    return "Pending";
  };

  const getVendorTotal = (v) => {
    const quotes = Array.isArray(v?.quotes) ? v.quotes : [];
    return quotes.reduce((sum, q) => {
      const qty = Number(q.quantity ?? q.qty ?? q.Qty) || 0;
      const price =
        Number(
          q.unit_price ??
            q.unitPrice ??
            q.price ??
            q.amount ??
            q.Unit_Price ??
            q.UnitPrice,
        ) || 0;
      return sum + qty * price;
    }, 0);
  };

  const quotedVendors = vendors.filter(
    (v) => checkVendorStatus(v) === "Quoted",
  ).length;
  const pendingVendors = vendors.filter(
    (v) => checkVendorStatus(v) === "Pending",
  ).length;
  const incompleteVendors = vendors.filter(
    (v) => checkVendorStatus(v) === "Incomplete",
  ).length;

  // Phone is displayed directly via vendor.phone or via vendor.vendor.PhoneNumber when needed

  // Best quote computation: compare vendor subtotals and pick lowest
  const vendorTotalsList = (vendors || []).map((v) => ({
    vendor: v,
    name: vendorDisplayName(v),
    total: getVendorTotal(v),
  }));
  const sortedVendorsByTotal = vendorTotalsList
    .slice()
    .sort((a, b) => (Number(a.total) || 0) - (Number(b.total) || 0));
  const bestVendorEntry = sortedVendorsByTotal[0] || null;
  const nextBestEntry = sortedVendorsByTotal[1] || null;
  const bestVendorName = bestVendorEntry?.name || "-";
  const bestVendorTotal = Number(bestVendorEntry?.total || 0);
  const savingsVsNext = Math.max(0, Number((nextBestEntry?.total || bestVendorTotal) - bestVendorTotal));

  // Selected vendor computation - use selectedVendorId from rfq
  const selectedVendorId = rfq?.selectedVendorId || rfq?.selected_vendor_id;
  
  // Find the actual selected vendor from the vendors array (not quotations)
  const selectedVendorData = selectedVendorId 
    ? vendors.find(v => String(v.Id || v.vendorId || v.vendor_id) === String(selectedVendorId))
    : null;
  
  // Use vendor name from RFQ's vendor object if available, otherwise from selected vendor data
  // Handle MSSQL vendor fields (Name, VendorName, etc.)
  const selectedVendorName = rfq?.vendor?.Name || rfq?.vendor?.name || rfq?.vendor?.VendorName || 
                             selectedVendorData?.Name || selectedVendorData?.name || "-";
  
  // Get the selected vendor's grand total (from vendor data, not quotations calculation)
  // If grandTotal isn't available, calculate from subtotal + vat
  const selectedVendorGrandTotal = selectedVendorData?.grandTotal || selectedVendorData?.grand_total;
  const selectedVendorSubtotal = Number(selectedVendorData?.subtotal || 0);
  const selectedVendorVat = Number(selectedVendorData?.vat || 0);
  const selectedVendorTotal = selectedVendorGrandTotal 
    ? Number(selectedVendorGrandTotal)
    : selectedVendorSubtotal + selectedVendorVat;
  
  // Calculate savings of selected vendor vs best alternative from quotations
  const otherVendorTotals = vendorTotalsList
    .filter(v => String(v.vendor.id || v.vendor.vendorId || v.vendor.vendor_id) !== String(selectedVendorId))
    .map(v => Number(v.total || 0))
    .filter(total => total > 0);
  
  const bestAlternativeTotal = otherVendorTotals.length > 0 ? Math.min(...otherVendorTotals) : selectedVendorTotal;
  const selectedVendorSavings = selectedVendorTotal > 0 && bestAlternativeTotal > selectedVendorTotal 
    ? bestAlternativeTotal - selectedVendorTotal 
    : 0;
  // Per-vendor savings relative to best (positive numbers mean best saves that amount)
  // Note: compute per-vendor savings if needed elsewhere

  return (
    <div className="container mx-auto p-6 overflow-auto">
      {/* Header */}
      <div className="py-4 flex items-center justify-between">
        <div className="flex items-center mb-6 mr-6">
          {source === "rfq" && (<button
            onClick={onBack}
            className={`mr-4 rounded p-2 font-medium border border-gray-200 hover:bg-gray-100 transition-all duration-150 flex align-middle ${hideTabs ? "hidden" : ""}`}
          >
            <LuArrowLeft className="my-auto text-lg" />
          </button>)}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">
              Multi-Vendor RFQ {rfq.trNumber}
            </h1>
            <h2 className="text-md text-gray-500">
              {rfq.description} • Created on{" "}
              {utils.formatDate(rfq.createdAt, "MM/DD/YYYY")} by{" "}
              {rfq.assigneeUsername}
            </h2>
          </div>
        </div>
        {source === "rfq" && 
          <div className="flex gap-2">
            <button
              className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white ${rfq.assignee !== currentUser.id ? "hidden" : "inline-flex"}`}
              onClick={() => onEdit(rfq, "canvass")}
            >
              <LuChartBar className="mr-2" /> View Canvass Sheet
            </button>
            <button
              onClick={() => onEdit(rfq, "details")}
              className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white ${rfq.stageStatus === "Submitted" || rfq.stageStatus === "Approved" || rfq.assignee !== currentUser.id ? "hidden" : "inline-flex"}`}
            >
              <LuPencil className="mr-2" />
              Manage RFQ
            </button>
            <button
              onClick={() => onSubmit(rfq)}
              className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-green-500 hover:bg-green-600 text-white ${rfq.stageStatus === "Submitted" || rfq.stageStatus === "Approved" || rfq.assignee !== currentUser.id ? "hidden" : "inline-flex"}`}
            >
              <LuFileCheck className="mr-2" />
              Submit for Approval
            </button>
          </div>
        }
      </div>

      {/* Tabs */}
      {!hideTabs && (
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-2" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("RFQ")}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "RFQ" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            RFQ
          </button>
          <button
            type="button"
            onClick={async () => {
              setActiveTab("SL");
              if (slDetails || slLoading) return;
              try {
                setSlLoading(true);
                const slId = rfq?.slId ?? rfq?.sl_id;
                if (!slId) return;
                const res = await apiBackendFetch(`/api/salesleads/${slId}`);
                if (!res?.ok) throw new Error("Failed to fetch sales lead");
                const sl = await res.json();
                setSlDetails(sl);
              } finally {
                setSlLoading(false);
              }
            }}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "SL" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            Sales Lead
          </button>
          <button
            type="button"
            onClick={async () => {
              setActiveTab("WO");
              if (woDetails || woLoading) return;
              try {
                setWoLoading(true);
                const woId = rfq?.woId ?? rfq?.wo_id;
                if (!woId) return;
                const res = await apiBackendFetch(`/api/workorders/${woId}`);
                if (!res?.ok) throw new Error("Failed to fetch work order");
                const wo = await res.json();
                setWoDetails(wo);
              } finally {
                setWoLoading(false);
              }
            }}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "WO" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            Work Order
          </button>
          {hasTechnical && (
            <button
              type="button"
              onClick={async () => {
                setActiveTab("TR");
                if (trDetails || trLoading) return;
                try {
                  setTrLoading(true);
                  const res = await apiBackendFetch(`/api/technicals`);
                  if (!res?.ok) throw new Error("Failed to fetch technicals");
                  const rows = await res.json();
                  const slId = rfq?.slId ?? rfq?.sl_id;
                  const woId = rfq?.woId ?? rfq?.wo_id;
                  const match = (rows || []).find(
                    (r) => r.slId === slId || r.sl_id === slId || r.woId === woId || r.wo_id === woId,
                  );
                  setTrDetails(match || null);
                } finally {
                  setTrLoading(false);
                }
              }}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "TR" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              Technical
            </button>
          )}
        </nav>
      </div>
      )}

      {activeTab === "SL" ? (
        <div className="space-y-6 pb-6">
          {slLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading sales lead…</div>
          ) : slDetails ? (
            <SalesLeadDetails
              salesLead={slDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("RFQ")}
              onEdit={() => alert("Please edit this Sales Lead from the Sales Leads page.")}
              onSubmit={() => {}}
              hideRelatedTabs={true}
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
              onBack={() => setActiveTab("RFQ")}
              onEdit={() => alert("Please edit this Work Order from the Work Orders page.")}
              onWorkOrderUpdated={(updated) => setWoDetails(updated)}
              toSalesLead={() => {}}
              source="rfqDetails"
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related work order found.</div>
          )}
        </div>
      ) : activeTab === "TR" ? (
        <div className="space-y-6 pb-6">
          {trLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading technical recommendation…</div>
          ) : trDetails ? (
            <TechnicalDetails
              technicalReco={trDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("RFQ")}
              onEdit={() => alert("Please edit this Technical Recommendation from the Technicals page.")}
              onSave={() => {}}
              onPrint={() => {}}
              onSubmit={() => {}}
              source="rfqDetails"
              hideTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related technical recommendation found.</div>
          )}
        </div>
      ) : (
        <div className="space-y-6 pb-6">
        <div className={`grid ${source === "rfq" ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-3"} gap-6`}>
          {/* RFQ Information */}
          <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col space-y-1.5 pb-6">
              <h3 className="font-bold leading-none tracking-tight">
                RFQ Information
              </h3>
            </div>
            <div className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                <Detail label="Status:" value={rfq.stageStatus} />
                <Detail label="Account:" value={rfq.account?.kristem?.Name} />
                <Detail
                  label="RFQ Date:"
                  value={utils.formatDate(rfq.createdAt, "MM/DD/YYYY")}
                />
                <Detail
                  label="Due Date:"
                  value={utils.formatDate(rfq.dueDate, "MM/DD/YYYY")}
                />
                <Detail
                  label="Done Date:"
                  value={utils.formatDate(rfq.doneDate, "MM/DD/YYYY")}
                />
                <Detail
                  label="Terms:"
                  value={utils.formatDate(rfq.terms, "MM/DD/YYYY")}
                />
              </div>
            </div>
          </div>

          {/* Vendors */}
          <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex space-y-1.5 pb-6">
              <LuUsers className="mr-2" />
              <h3 className="font-bold leading-none tracking-tight">Vendors</h3>
            </div>
            <div className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                <VendorDetail label="Total Vendors:" value={totalVendors} />
                <VendorDetail label="Quoted:" value={quotedVendors} />
                <VendorDetail label="Pending:" value={pendingVendors} />
                <VendorDetail label="Incomplete:" value={incompleteVendors} />
                {/* Selected: implement if needed */}
              </div>
            </div>
          </div>

          {/* Best Quote */}
          <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col space-y-1.5 pb-6">
              <h3 className="font-bold leading-none tracking-tight">
                {selectedVendorId ? "Selected Vendor" : "Best Quote"}
              </h3>
              {selectedVendorId && (
                <p className="text-sm text-gray-600">
                  Vendor has been selected for this RFQ
                </p>
              )}
            </div>
            <div className="pt-0">
              <div className="grid grid-cols-1 gap-4">
                {selectedVendorId ? (
                  <>
                    <VendorDetail label="Vendor:" value={selectedVendorName} />
                    <VendorDetail label="Amount:" value={formatMoney(selectedVendorTotal)} />
                    <VendorDetail label="Savings:" value={formatMoney(selectedVendorSavings)} />
                    {selectedVendorSavings > 0 && (
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        💰 Saves {formatMoney(selectedVendorSavings)} vs best alternative
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <VendorDetail label="Vendor:" value={bestVendorName} />
                    <VendorDetail label="Amount:" value={formatMoney(bestVendorTotal)} />
                    <VendorDetail label="Savings:" value={formatMoney(savingsVsNext)} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          { source === "rfq" &&
            <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col space-y-1.5 pb-6">
                <h3 className="font-bold leading-none tracking-tight">Actions</h3>
              </div>
              <div className="pt-0">
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => onEdit(rfq, "vendors")}
                    className={`flex items-center justify-center whitespace-nowrap rounded-md text-xs font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white ${rfq.stageStatus === "Submitted" || rfq.stageStatus === "Approved" || rfq.assignee !== currentUser.id ? "hidden" : "inline-flex"}`}
                  >
                    <LuPencil className="h-4 w-4 mr-2" />
                    Manage Vendors
                  </button>
                  <button
                    onClick={() => onEdit(rfq, "canvass")}
                    className={`items-center justify-center whitespace-nowrap rounded-md text-xs font-light shadow h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white ${rfq.assignee !== currentUser.id ? "hidden" : "flex"}`}
                  >
                    <LuChartBar className="h-4 w-4 mr-2" /> View Canvass
                  </button>
                  <button
                    onClick={onPrint}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    <LuPrinter className="mr-2" />
                    Print
                  </button>
                  <button
                    onClick={onPrint}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    <LuMail className="mr-2" />
                    Email
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        {/* Items */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 pb-6">
            <h3 className="font-bold leading-none tracking-tight">Items</h3>
            <p className="text-sm text-gray-500">
              List of items included in this RFQ
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-md border border-gray-200">
              <div className="relative w-full overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="border-b border-gray-200">
                    <tr className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Description
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Brand
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Part No.
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Qty
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Unit
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Lead Time
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Unit Price
                      </th>
                      <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-100 transition-all duration-200"
                      >
                        <td className="text-sm p-2 align-middle">
                          {`${item.details?.Code} ${item.details?.CustomerPartNumberSubCode??""}|${item.details?.Description}`}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.details?.BRAND_ID}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.details?.Code}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.quantity}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.details?.SK_UOM}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.leadTime || "-"}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item?.details?.Price ? formatMoney(item.details.Price) : "-"}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item?.details?.Price ? formatMoney(item.details.Price * item.quantity) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end space-y-2">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="font-medium">Subtotal:</span>
                  <span>{rfq.subtotal ? formatMoney(rfq.subtotal) : "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-t">
                  <span className="font-medium">VAT (5%):</span>
                  <span>{rfq.vat ? formatMoney(rfq.vat) : "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold">
                  <span>Grand Total:</span>
                  <span>{rfq.grandTotal ? formatMoney(rfq.grandTotal) : "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Quotations Summary */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 pb-6">
            <h3 className="font-bold leading-none tracking-tight">
              Vendor Quotations Summary
            </h3>
            <p className="text-sm text-gray-500">
              Overview of all vendor responses
            </p>
          </div>
          <div className="flex flex-col space-y-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex rounded-md border border-gray-200 p-4 justify-between"
              >
                <div className="flex flex-col items-center mb-2">
                  <div>
                    <h4 className="text-md">{vendorDisplayName(vendor)}</h4>
                    <p className="text-sm text-gray-600">
                      {vendorContactPerson(vendor)}
                    </p>
                  </div>
                </div>
                <div className="flex">
                  <div
                    className={`items-center rounded-md my-auto py-1 px-1.5 text-xs font-bold shadow ${checkVendorStatus(vendor) === "Quoted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {checkVendorStatus(vendor)}
                  </div>
                  {checkVendorStatus(vendor) === "Quoted" ? (
                      <div className="flex flex-col items-end ml-4">
                        <div>
                          <p className="font-bold">
                            {formatMoney(getVendorTotal(vendor))}
                          </p>
                        </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Quote Date:{" "}
                          {utils.formatDate(vendor.quoteDate, "MM/DD/YYYY") ||
                            "N/A"}
                        </p>
                      </div>
                      {/* Add more fields as necessary */}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 pb-6">
            <h3 className="font-bold leading-none tracking-tight">
              Additional Notes
            </h3>
          </div>
          <div className="p-6 pt-0 space-y-6">
            <p className="text-sm text-gray-500">{rfq.notes}</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default RFQDetails;
