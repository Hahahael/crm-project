import { LuArrowLeft, LuPencil, LuPrinter, LuFileCheck } from "react-icons/lu";
import { useEffect } from "react";
import { apiBackendFetch } from "../services/api.js";
import utils from "../helper/utils";
import { useUser } from "../contexts/UserContext.jsx";

const AccountDetails = ({
  account,
  workWeeks,
  onBack,
  onEdit,
  onAccountUpdated,
  onPrint,
  onSubmit,
  source="account"
}) => {
  const { currentUser } = useUser();
  const isAssignedToMe = currentUser && account.prepared_by === currentUser.id;
  const isCreator = currentUser && account.prepared_by === currentUser.id;
  const accountFinal = account.account ?? account;

  console.log("Account Details:", account);
  function Detail({ label, value }) {
    return (
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="whitespace-pre-wrap">{value || "-"}</p>
      </div>
    );
  }

  useEffect(() => {
    if (isAssignedToMe && !account.actual_date && !account.actual_from_time) {
      const now = new Date();
      const actual_date = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const actual_from_time = now.toTimeString().slice(0, 8); // HH:MM:SS

      apiBackendFetch(`/api/accounts/${account.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...account,
          actual_date,
          actual_from_time,
        }),
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((updatedTechnicalReco) => {
          if (onAccountUpdated) onAccountUpdated(updatedTechnicalReco);
        });
    }
    // eslint-disable-next-line
  }, [account?.id, isAssignedToMe]);

  return (
    <div className="container mx-auto p-6 overflow-auto">
      {/* Header */}
      <div className="py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {source === "account" && (<button
              onClick={onBack}
              className="flex items-center p-2 text-gray-700 hover:bg-gray-50 cursor-pointer border border-gray-200 rounded shadow-xs transition-all duration-200"
            >
              <LuArrowLeft className="h-4 w-4" />
            </button>)}
            <h1 className="text-2xl font-bold">NAEF Details</h1>
            <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
              {account.stageStatus}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPrint}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white"
          >
            <LuPrinter className="h-4 w-4 mr-2" />
            Print
          </button>
          {source === "account" && (<button
            onClick={() => onEdit(account)}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white"
          >
            <LuPencil className="h-4 w-4 mr-2" />
            Edit
          </button>)}
          <button
            onClick={() => onSubmit(account)}
            className={`items-center justify-center whitespace-nowrap rounded-md text-sm font-light shadow h-9 px-4 py-2 bg-green-500 hover:bg-green-600 text-white ${account.stageStatus === 'Approved' ? 'hidden' : 'inline-flex'}`}
          >
            <LuFileCheck className="mr-2" />
            Submit for Approval
          </button>
        </div>
      </div>

      <div className="space-y-6 pb-6">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Requestor Details
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Detail
                label="Date"
                value={utils.formatDate(accountFinal.createdAt, "MM/DD/YYYY")}
              />
              <Detail label="Requestor" value={accountFinal?.requestedBy} />
              <Detail label="Ref #" value={accountFinal?.kristem?.Code} />
              <Detail label="Designation" value={accountFinal?.designation} />
              <Detail label="Department" value={accountFinal?.department?.Department} />
              <Detail label="Validity Period" value={accountFinal.validityPeriod} />
              <Detail
                label="Due Date"
                value={utils.formatDate(accountFinal.dueDate, "MM/DD/YYYY") || "-"}
              />
              <Detail
                label="Done Date"
                value={utils.formatDate(accountFinal.doneDate, "MM/DD/YYYY") || "-"}
              />
              {/* <Detail label="Delay Status" value={accountFinal.refNumber} /> */}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Account Details
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Detail label="Account" value={accountFinal?.kristem?.Name} />
              <Detail label="Contract Period" value={accountFinal.contractPeriod} />
              <Detail label="Industry" value={accountFinal?.industry?.Code} />
              <Detail label="Designation" value={accountFinal?.designation} />
              <Detail label="Product" value={accountFinal?.brand?.Description} />
              <Detail label="Contact No." value={accountFinal.contactNumber} />
              <Detail label="Location" value={accountFinal.location} />
              <Detail label="Email Address" value={accountFinal.emailAddress} />
              <Detail label="Address" value={accountFinal.address} />
              <Detail label="Buyer Incharge" value={accountFinal.buyerIncharge} />
              <Detail label="Trunkline" value={accountFinal.trunkline} />
              <Detail label="Contract No" value={accountFinal.contractNumber} />
              <Detail label="Process" value={accountFinal.process} />
              <Detail label="Email Address" value={accountFinal.emailAddress} />
              <Detail label="Machines" value={accountFinal.machines} />
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Justification
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Detail label="Reason to Apply" value={accountFinal.reasonToApply} />
              <Detail
                label="Automotive Section"
                value={accountFinal.automotiveSection}
              />
              <Detail
                label="Source of Inquiry"
                value={accountFinal.sourceOfInquiry}
              />
              <Detail label="Commodity" value={accountFinal.commodity} />
              <Detail label="Business Activity" value={accountFinal.businessActivity} />
              <Detail label="Model" value={accountFinal.model} />
              <Detail label="Annual Target Sales" value={accountFinal.annualTargetSales} />
              <Detail label="Population" value={accountFinal.population} />
              <Detail label="Source of Target" value={accountFinal.sourceOfTarget} />
              <Detail label="Existing Bellows" value={accountFinal.existingBellows} />
              <Detail label="Products to Order" value={accountFinal.productsToOrder} />
              <Detail label="Model Under" value={accountFinal.modelUnder} />
              <Detail label="Target Areas" value={accountFinal.targetAreas} />
              <Detail label="Additional" value={accountFinal.additional} />
              <Detail label="Analysis" value={accountFinal.analysis} />
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col space-y-1.5 px-6 py-4 bg-blue-800 rounded-t-xl">
            <h3 className="text-lg font-semibold leading-none tracking-tight text-white">
              Requestor Details
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Detail label="Date" value={accountFinal.date} />
              <Detail label="Requestor" value={accountFinal.requestor} />
              <Detail label="Ref #" value={accountFinal.refNumber} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="w-full overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-blue-800 text-white">
                    <tr>
                      <th className="p-2 font-normal">Working Week</th>
                      <th className="p-2 font-normal">Update</th>
                      <th className="p-2 font-normal">Probability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workWeeks && workWeeks.length > 0 ? (
                      workWeeks.map((week, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-100 transition-all duration-200"
                        >
                          <td className="text-sm p-2 align-middle">
                            {week.name}
                          </td>
                          <td className="text-sm p-2 align-middle">
                            {week.update}
                          </td>
                          <td className="text-sm p-2 align-middle">
                            {week.probability}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-2 text-center text-gray-500 border-b border-gray-200"
                        >
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="w-full overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-blue-800 text-white">
                    <tr>
                      <th className="p-2 font-normal">Working Week</th>
                      <th className="p-2 font-normal">Update</th>
                      <th className="p-2 font-normal">Probability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {workWeeks && workWeeks.length > 0 ? (
                      workWeeks.map((week, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-100 transition-all duration-200"
                        >
                          <td className="text-sm p-2 align-middle">
                            {week.name}
                          </td>
                          <td className="text-sm p-2 align-middle">
                            {week.update}
                          </td>
                          <td className="text-sm p-2 align-middle">
                            {week.probability}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-2 text-center text-gray-500 border-b border-gray-200"
                        >
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-sm">
            I hereby certify that all information declared are true and correct.
            I provided my commitment based on my deep analysis.
          </p>
          <p className="text-sm">
            I understand that failure to generate sales output within the
            validity period will forfeit this application.
          </p>
          <p className="text-sm">
            I also understand that the management has the right to re-assess the
            applied account should I fail to perform within the agreed period to
            perform.
          </p>
          <p className="text-sm">
            I further understand that this account will be assigned to me only
            after it has been properly endorsed by my immediate supervisor and
            unless approved by the president.
          </p>
          <p className="text-sm">
            I hereby confirm this account under my area of responsibility. I am
            in-charge of all table to affiliated concerns.
          </p>
          <p className="text-sm">
            I commit to provide excellent customer service which serves as a
            factor for a continuous good business relationship with this
            accountFinal.
          </p>
        </div>

        {/* Approval Information */}
        <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-bold leading-none tracking-tight">
              Approval Information
            </h3>
          </div>
          <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Detail label="Prepared by" value={accountFinal.preparedByUsername} />
            <Detail label="Noted by" value={accountFinal.notedByUsername} />
            <Detail label="Approved by" value={accountFinal.approvedByUsername} />
            <Detail label="Received by" value={accountFinal.receivedByUsername} />
            <Detail
              label="Acknowledge Approved by"
              value={accountFinal.approvedDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetails;
