//src/components/WorkOrderDetails
import { useEffect, useState } from "react";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { apiBackendFetch } from "../services/api";
import SalesLeadDetails from "./SalesLeadDetails.jsx";
import TechnicalDetails from "./TechnicalDetails.jsx";
import RFQDetails from "./RFQDetails.jsx";
import config from "../config.js";
import utils from "../helper/utils.js";
import { useUser } from "../contexts/UserContext.jsx";

const WorkOrderDetails = ({
  workOrder,
  onBack,
  onEdit,
  onWorkOrderUpdated,
  toSalesLead,
  hideTabs = false,
  source = "workOrder",
}) => {
  const { currentUser } = useUser();
  const isAssignedToMe = currentUser && workOrder.assignee === currentUser.id;
  const isCreator = currentUser && workOrder.createdBy === currentUser.id;
  const [hasSalesLead, setHasSalesLead] = useState(false);
  // Tabs: WO (Work Order), SL (Sales Lead), TR (Technical)
  const [activeTab, setActiveTab] = useState("WO");
  const [slDetails, setSlDetails] = useState(null);
  const [slLoading, setSlLoading] = useState(false);
  const [trDetails, setTrDetails] = useState(null);
  const [trLoading, setTrLoading] = useState(false);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [rfqLoading, setRfqLoading] = useState(false);

  useEffect(() => {
    if (workOrder?.id) {
      apiBackendFetch(`/api/salesleads/exists/workorder/${workOrder.id}`)
        .then((res) => res.json())
        .then((data) => setHasSalesLead(data.exists))
        .catch(() => setHasSalesLead(false));
    }
  }, [workOrder?.id]);

  useEffect(() => {
    if (isAssignedToMe && !workOrder.actualDate && !workOrder.actualFromTime) {
      const now = new Date();
      const actualDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const actualFromTime = now.toTimeString().slice(0, 8); // HH:MM:SS

      apiBackendFetch(`/api/workorders/${workOrder.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...workOrder,
          actualDate,
          actualFromTime,
        }),
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((updatedWO) => {
          if (onWorkOrderUpdated) onWorkOrderUpdated(updatedWO);
        });
    }
    // eslint-disable-next-line
  }, [workOrder?.id, isAssignedToMe]);

  // Lazy-load related Sales Lead when SL tab is selected
  useEffect(() => {
    async function fetchSL() {
      try {
        setSlLoading(true);
        // No endpoint by wo_id: fetch list and find first match
        const res = await apiBackendFetch(`/api/salesleads`);
        if (!res?.ok) throw new Error("Failed to fetch sales leads");
        const rows = await res.json();
        const match = (rows || []).find(
          (r) => (r.woId ?? r.wo_id) === workOrder?.id,
        );
        setSlDetails(match || null);
      } catch (e) {
        console.error("Failed to load related Sales Lead for WO:", e);
        setSlDetails(null);
      } finally {
        setSlLoading(false);
      }
    }
    if (!hideTabs && activeTab === "SL" && !slDetails) fetchSL();
  }, [activeTab, workOrder?.id, slDetails, hideTabs]);

  // Lazy-load related Technical when TR tab is selected
  useEffect(() => {
    async function fetchTR() {
      try {
        setTrLoading(true);
        const res = await apiBackendFetch(`/api/technicals`);
        if (!res?.ok) throw new Error("Failed to fetch technicals");
        const rows = await res.json();
        const match = (rows || []).find(
          (r) => (r.woId ?? r.wo_id) === workOrder?.id,
        );
        setTrDetails(match || null);
      } catch (e) {
        console.error("Failed to load related Technical Recommendation for WO:", e);
        setTrDetails(null);
      } finally {
        setTrLoading(false);
      }
    }
    if (!hideTabs && activeTab === "TR" && !trDetails) fetchTR();
  }, [activeTab, workOrder?.id, trDetails, hideTabs]);

  return (
    <div className="h-full w-full p-6 overflow-y-auto">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        {source === "workOrder" && (<button
          onClick={onBack}
          className={`mr-4 rounded px-2 py-2 font-medium hover:bg-gray-100 transition-all duration-150 flex align-middle border border-gray-200 ${hideTabs ? "hidden" : ""}`}
        >
          <LuArrowLeft className="my-auto text-lg" />
        </button>)}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">
            {workOrder.woNumber || ""} - Field Service Lead
          </h1>
          <h2 className="text-md text-gray-500">
            <span
              className={`rounded-full px-2 py-1 text-xs mr-2 ${
                config.statusBadgeClasses[workOrder.stageStatus] ||
                "bg-yellow-100 text-yellow-700"
              }`}
            >
              {workOrder.stageStatus}
            </span>
            {workOrder.accountName}
          </h2>
        </div>
        <div className={`flex flex-col gap-x-2 gap-y-2 ml-auto lg:flex-row `}>
          {isCreator && !hasSalesLead && (
            <button
              onClick={() => onEdit(workOrder)}
              className="flex border border-gray-200 bg-blue-500 hover:bg-blue-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md align-middle justify-center items-center text-sm text-white"
            >
              <LuPencil className="my-auto mr-2 cursor-pointer" /> Edit
              Workorder
            </button>
          )}
          {isAssignedToMe && !hasSalesLead && (
            <button
              onClick={() => toSalesLead(workOrder)}
              className="flex border border-gray-200 bg-green-500 hover:bg-green-600 transition-all duration-150 cursor-pointer px-4 py-2 rounded-md align-middle justify-center items-center text-sm text-white"
            >
              <LuPencil className="my-auto mr-2 cursor-pointer" /> Create Sales
              Lead
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!hideTabs && (
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex gap-2" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab("WO")}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "WO" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              Work Order
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
              onClick={() => setActiveTab("TR")}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${activeTab === "TR" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              Technical
            </button>
            <button
              type="button"
              onClick={async () => {
                setActiveTab("RFQ");
                if (rfqDetails || rfqLoading) return;
                try {
                  setRfqLoading(true);
                  const res = await apiBackendFetch(`/api/rfqs`);
                  if (!res?.ok) throw new Error("Failed to fetch RFQs");
                  const rows = await res.json();
                  const match = (rows || []).find(
                    (r) => (r.woId ?? r.wo_id) === workOrder?.id,
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

  {hideTabs || activeTab === "WO" ? (
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <div className="flex flex-col gap-y-5">
            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                WO#
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.woNumber || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Work Desc
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.workDescription || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Assignee
              </label>
              <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.assigneeUsername || ""}
              </div>
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Department
              </label>
              <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.account?.department?.Department ?? ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Account
              </label>
              <div className="col-span-5 flex gap-6">
                <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                  {workOrder.account_name ?? workOrder.account?.kristem?.Name ?? ""}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newAcct"
                    checked={workOrder.isNewAccount}
                    disabled
                    className="h-4 w-4 rounded border-gray-400"
                  />
                  <label htmlFor="newAcct" className="text-sm text-gray-600">
                    New
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Industry
              </label>
              <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.account?.industry?.Description ?? workOrder.account?.industry?.Code ?? ""}
              </div>
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Mode
              </label>
              <div className="col-span-2 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.mode || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Product/Brand
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.account?.brand?.Description ?? ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Contact Person
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.contactPerson || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Contact Number
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {workOrder.contactNumber || ""}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-y-5">
            <div className="flex items-center justify-end gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fsl"
                  checked={workOrder.isFsl}
                  disabled
                  className="h-4 w-4 rounded border-gray-400"
                />
                <label htmlFor="fsl" className="text-sm text-gray-600">
                  FSL
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="esl"
                  checked={workOrder.isEsl}
                  disabled
                  className="h-4 w-4 rounded border-gray-400"
                />
                <label htmlFor="esl" className="text-sm text-gray-600">
                  ESL
                </label>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                WO Date
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {utils.formatDate(workOrder.woDate, "MM/DD/YYYY") || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Due Date
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {utils.formatDate(workOrder.dueDate, "MM/DD/YYYY") || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                From Time
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {utils.formatTimeOnly(workOrder.fromTime) || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                To Time
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {utils.formatTimeOnly(workOrder.toTime) || ""}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Actual Date
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {utils.formatDate(workOrder.actualDate, "MM/DD/YYYY") || "-"}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Actual From Time
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {`${utils.formatTimeOnly(workOrder.actualFromTime)}` || "-"}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-x-4">
              <label
                htmlFor="woNumberInput"
                className="text-sm text-right my-auto break-words hyphens-auto"
              >
                Actual To Time
              </label>
              <div className="col-span-5 w-full rounded-md bg-yellow-50 text-md border border-gray-200 px-3 py-3">
                {utils.formatTimeOnly(workOrder.actualToTime) || "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-6 gap-4">
            <label
              className="text-sm text-right my-auto break-words hyphens-auto"
              htmlFor="objective"
            >
              Objective
            </label>
            <div
              className="col-span-5 min-h-[100px] rounded-md border border-gray-200 bg-yellow-50 px-3 py-3 cursor-default"
              readOnly=""
            >
              {workOrder.objective || "-"}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-4">
            <label
              className="text-sm text-right my-auto break-words hyphens-auto"
              htmlFor="instruction"
            >
              Instruction
            </label>
            <div
              className="col-span-5 min-h-[100px] rounded-md border border-gray-200 bg-yellow-50 px-3 py-3 cursor-default"
              readOnly=""
            >
              {workOrder.instruction || "-"}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-4">
            <label
              className="text-sm text-right my-auto break-words hyphens-auto"
              htmlFor="targetOut"
            >
              Target Output
            </label>
            <div
              className="col-span-5 min-h-[100px] rounded-md border border-gray-200 bg-yellow-50 px-3 py-3 cursor-default"
              readOnly=""
            >
              {workOrder.targetOutput || "-"}
            </div>
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
              onBack={() => setActiveTab("WO")}
              onEdit={() => {
                alert("To edit, open the Sales Leads page and select this Sales Lead.");
              }}
              onSubmit={() => {}}
              hideRelatedTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related sales lead found.</div>
          )}
        </div>
      ) : (activeTab === "SL") ? (
        <div className="space-y-6 pb-6">
          {slLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading sales lead…</div>
          ) : slDetails ? (
            <SalesLeadDetails
              salesLead={slDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("WO")}
              onEdit={() => {
                alert("To edit, open the Sales Leads page and select this Sales Lead.");
              }}
              onSubmit={() => {}}
              hideRelatedTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related sales lead found.</div>
          )}
        </div>
      ) : (activeTab === "TR") ? (
        <div className="space-y-6 pb-6">
          {trLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading technical recommendation…</div>
          ) : trDetails ? (
            <TechnicalDetails
              technicalReco={trDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("WO")}
              onEdit={() => alert("Please edit this Technical Recommendation from the Technicals page.")}
              onSave={() => {}}
              onPrint={() => {}}
              onSubmit={() => {}}
              source="workOrderDetails"
              hideTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related technical recommendation found.</div>
          )}
        </div>
      ) : (activeTab === "RFQ") ? (
        <div className="space-y-6 pb-6">
          {rfqLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading RFQ…</div>
          ) : rfqDetails ? (
            <RFQDetails
              rfq={rfqDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("WO")}
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
          {trLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading technical recommendation…</div>
          ) : trDetails ? (
            <TechnicalDetails
              technicalReco={trDetails}
              currentUser={currentUser}
              onBack={() => setActiveTab("WO")}
              onEdit={() => alert("Please edit this Technical Recommendation from the Technicals page.")}
              onSave={() => {}}
              onPrint={() => {}}
              onSubmit={() => {}}
              source="workOrderDetails"
              hideTabs={true}
            />
          ) : (
            <div className="p-6 text-sm text-gray-600">No related technical recommendation found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkOrderDetails;
