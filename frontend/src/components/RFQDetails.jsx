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
import utils from "../helper/utils";

const RFQDetails = ({
  rfq,
  currentUser,
  onBack,
  onEdit,
  onPrint,
  onSubmit,
}) => {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
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
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="whitespace-pre-wrap">{value || "-"}</p>
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
    // eslint-disable-next-line
  }, [rfq?.id, isAssignedToMe]);

  // Vendor summary stats (derive status from quotes)
  const totalVendors = vendors.length;

  const vendorDisplayName = (v) => {
    return v?.details?.Name || v?.name || v?.vendor?.Name || "-";
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

  return (
    <div className="container mx-auto p-6 overflow-auto">
      {/* Header */}
      <div className="py-4 flex items-center justify-between">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 rounded p-2 font-medium border border-gray-200 hover:bg-gray-100 transition-all duration-150 flex align-middle"
          >
            <LuArrowLeft className="my-auto text-lg" />
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">
              Multi-Vendor RFQ {rfq.trNumber}
            </h1>
            <h2 className="text-md text-gray-500">
              {rfq.description} • Created on{" "}
              {utils.formatDate(rfq.createdAt, "DD/MM/YYYY")} by{" "}
              {rfq.assigneeUsername}
            </h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => onEdit(rfq, "canvass")}
          >
            <LuChartBar className="mr-2" /> View Canvass Sheet
          </button>
          <button
            onClick={() => onEdit(rfq, "details")}
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white ${rfq.stageStatus === "Submitted" || rfq.stageStatus === "Approved" ? "hidden" : "inline-flex"}`}
          >
            <LuPencil className="mr-2" />
            Manage RFQ
          </button>
          <button
            onClick={() => onSubmit(rfq)}
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-green-500 hover:bg-green-600 text-white ${rfq.stageStatus === "Submitted" || rfq.stageStatus === "Approved" ? "hidden" : "inline-flex"}`}
          >
            <LuFileCheck className="mr-2" />
            Submit for Approval
          </button>
        </div>
      </div>

      <div className="space-y-6 pb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <Detail label="Account:" value={rfq.accountName} />
                <Detail
                  label="RFQ Date:"
                  value={utils.formatDate(rfq.createdAt, "DD/MM/YYYY")}
                />
                <Detail
                  label="Due Date:"
                  value={utils.formatDate(rfq.dueDate, "DD/MM/YYYY")}
                />
                <Detail
                  label="Done Date:"
                  value={utils.formatDate(rfq.doneDate, "DD/MM/YYYY")}
                />
                <Detail
                  label="Terms:"
                  value={utils.formatDate(rfq.terms, "DD/MM/YYYY")}
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
                Best Quote
              </h3>
            </div>
            <div className="pt-0">
              <div className="grid grid-cols-1 gap-4">
                <VendorDetail label="Vendor:" value={rfq.trNumber} />
                <VendorDetail label="Amount:" value={rfq.slNumber} />
                <VendorDetail
                  label="Savings:"
                  value={utils.formatDate(rfq.createdAt, "DD/MM/YYYY")}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col space-y-1.5 pb-6">
              <h3 className="font-bold leading-none tracking-tight">Actions</h3>
            </div>
            <div className="pt-0">
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => onEdit(rfq, "vendors")}
                  className={`flex items-center justify-center whitespace-nowrap rounded-md text-xs font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white ${rfq.stageStatus === "Submitted" || rfq.stageStatus === "Approved" ? "hidden" : "inline-flex"}`}
                >
                  <LuPencil className="h-4 w-4 mr-2" />
                  Manage Vendors
                </button>
                <button
                  onClick={() => onEdit(rfq, "canvass")}
                  className="flex items-center justify-center whitespace-nowrap rounded-md text-xs font-light shadow h-9 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white"
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
                          {item.details.Description}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.details.BRAND_ID}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.details.Code}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.quantity}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.details.SK_UOM}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          {item.leadTime || "-"}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          ₱ {utils.formatNumber(item.unitPrice) || "-"}
                        </td>
                        <td className="text-sm p-2 align-middle">
                          ₱{" "}
                          {utils.formatNumber(item.unitPrice * item.quantity) ||
                            "-"}
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
                  <span>₱ {utils.formatNumber(rfq.subtotal) || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-t">
                  <span className="font-medium">VAT (5%):</span>
                  <span>₱ {utils.formatNumber(rfq.vat) || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-t font-bold">
                  <span>Grand Total:</span>
                  <span>₱ {utils.formatNumber(rfq.grandTotal) || "-"}</span>
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
                          ₱ {utils.formatNumber(getVendorTotal(vendor))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Quote Date:{" "}
                          {utils.formatDate(vendor.quoteDate, "DD/MM/YYYY") ||
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
    </div>
  );
};

export default RFQDetails;
