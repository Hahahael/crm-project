import { useEffect, useState } from "react";
import { LuPlus, LuTrash } from "react-icons/lu";
import { useRef } from "react";
import { apiBackendFetch } from "../services/api";
import utils from "../helper/utils.js";

export default function RFQDetailsForm({
  rfq,
  setFormData,
  formItems,
  setFormItems,
}) {
  console.log("RFQDetailsForm Props: ", rfq, formItems);
  const [itemsList, setItemsList] = useState([]);
  // errors state intentionally omitted (not used here)

  const onItemChange = (itemId, field, value) => {
    setFormItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const onRemoveItem = (itemId) => {
    setFormItems((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const onAddItem = () => {
    const newItem = {
      id: null,
      itemId: null,
      name: "",
      model: "",
      description: "",
      quantity: 1,
      price: "",
      unitPrice: null,
    };
    setFormItems((prev) => [...(prev || []), newItem]);
  };

  const dropdownRefs = useRef({});

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await apiBackendFetch(
          "/api/mssql/inventory/stocks?limit=1000",
        );
        const data = await res.json();
        console.log("Data:", data);
        const rows = data?.rows || data || [];
        setItemsList(rows);
      } catch (err) {
        console.error("Failed to fetch items", err);
      }
    };

    fetchItems();
  }, []);

  // Close dropdown on outside click for product name dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      setFormItems((prev) =>
        prev.map((item) => {
          const key = item.itemId ?? item.id;
          const ref = dropdownRefs.current[key];
          if (item.showDropdown && ref && !ref.contains(e.target)) {
            return { ...item, showDropdown: false };
          }
          return item;
        }),
      );
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setFormItems, dropdownRefs]);

  // No totals effect here: wrapper owns totals and syncs formData from formItems

  return (
    <div className="w-full h-full space-y-6">
      {/* Basic Information */}
      <div className="rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col space-y-1.5">
          <h3 className="font-semibold leading-none tracking-tight">
            Basic Information
          </h3>
        </div>
        <div className="pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="rfqNumber">RFQ Number</label>
              <input
                id="rfqNumber"
                value={rfq.rfqNumber}
                readOnly
                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
              />
            </div>
            <div>
              <label htmlFor="rfqDate">RFQ Date</label>
              <input
                id="rfqDate"
                type="date"
                value={utils.formatDate(rfq.rfqDate, "YYYY-MM-DD")}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rfqDate: e.target.value }))
                }
                className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
              />
            </div>
            <div>
              <label htmlFor="dueDate">Due Date</label>
              <input
                id="dueDate"
                type="date"
                value={utils.formatDate(rfq.dueDate, "YYYY-MM-DD")}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="description">Description</label>
            <input
              id="description"
              value={rfq.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="salesLeadRef">Sales Lead Reference</label>
              <input
                id="salesLeadRef"
                value={rfq.slNumber}
                readOnly
                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
              />
            </div>
            <div>
              <label htmlFor="accountName">Account Name</label>
              <input
                id="accountName"
                value={rfq.accountName}
                readOnly
                className={`border-gray-200 col-span-5 w-full rounded-md border p-1 text-sm py-2 px-3 bg-gray-50 focus:outline-0`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="terms">Payment Terms</label>
            <input
              id="terms"
              value={rfq.paymentTerms}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentTerms: e.target.value,
                }))
              }
              className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
            />
          </div>
          <div>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={rfq.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              className={`col-span-5 w-full rounded-md border p-1 focus:outline-1 text-sm py-2 px-3 focus:bg-yellow-50 border-gray-200`}
            />
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
            <div className="relative w-full overflow-overlay">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="border-b border-gray-200">
                  <tr className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Product Name
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Brand
                    </th>
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle">
                      Description
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
                    <th className="p-2 font-normal text-sm text-gray-500 text-left align-middle w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(formItems || []).map((item, idx) => (
                    <tr
                      key={item.itemId ?? item.id ?? idx}
                      className="hover:bg-gray-100 transition-all duration-200"
                    >
                      <td
                        className="text-sm p-2 align-middle"
                        style={{ position: "relative", overflow: "visible" }}
                      >
                        <div
                          className="relative"
                          ref={(el) => {
                            const key = item.itemId ?? item.id ?? idx;
                            dropdownRefs.current[key] = el;
                          }}
                          style={{ overflow: "visible" }}
                        >
                          <input
                            type="text"
                            value={
                              (item.searchQuery ??
                                item.name ??
                                item.details?.Description ??
                                item.Description) ||
                              ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormItems((prev) =>
                                prev.map((itm, i) =>
                                  i === idx
                                    ? {
                                        ...itm,
                                        name: v,
                                        showDropdown: true,
                                        searchQuery: v,
                                      }
                                    : itm,
                                ),
                              );
                            }}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                            onFocus={() =>
                              setFormItems((prev) =>
                                prev.map((itm, i) =>
                                  i === idx
                                    ? { ...itm, showDropdown: true }
                                    : itm,
                                ),
                              )
                            }
                          />
                          {item.showDropdown && (
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                bottom: "100%",
                                zIndex: 20,
                                width: "max-content",
                                minWidth: "100%",
                                maxWidth: "400px",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                                background: "white",
                                borderRadius: "0.5rem",
                                border: "1px solid #e5e7eb",
                                overflow: "visible",
                              }}
                            >
                              <ul
                                className="max-h-40 overflow-y-auto"
                                style={{ margin: 0, padding: 0 }}
                              >
                                {(itemsList || [])
                                  .filter(
                                    (i) =>
                                      (i.Description || i.description || "")
                                        .toLowerCase()
                                        .includes(
                                          (
                                            item.searchQuery ||
                                            item.name ||
                                            ""
                                          ).toLowerCase(),
                                        ) &&
                                      !(formItems || []).some(
                                        (tr) =>
                                          tr.itemId === i.Id || tr.id === i.Id,
                                      ),
                                  )
                                  .map((itm) => (
                                    <li
                                      key={itm.Id}
                                      onClick={() => {
                                        const detailsObj = {
                                          ...itm,
                                          ...Object.entries(itm.details).reduce(
                                            (acc, [key, value]) => {
                                              acc[`${key}_Details`] = value;
                                              return acc;
                                            },
                                            {},
                                          ),
                                        };
                                        const label =
                                          detailsObj?.Description ||
                                          itm.Description ||
                                          itm.Code ||
                                          "";
                                        setFormItems((prev) =>
                                          prev.map((itmRef, i) =>
                                            i === idx
                                              ? {
                                                  ...itmRef,
                                                  id: itmRef.id ?? null,
                                                  rfqId: itmRef.rfqId ?? null,
                                                  itemId: itm.Id,
                                                  item_id: itm.Id,
                                                  quantity:
                                                    itmRef.quantity || 1,
                                                  selectedVendorId: null,
                                                  leadTime: null,
                                                  unitPrice: null,
                                                  details: detailsObj,
                                                  // initialize visible name/search so input is editable immediately
                                                  name: label,
                                                  searchQuery: label,
                                                  showDropdown: false,
                                                }
                                              : itmRef,
                                          ),
                                        );
                                      }}
                                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                      style={{ listStyle: "none" }}
                                    >
                                      {`${itm.Description} - ${itm.Code}`}
                                    </li>
                                  ))}
                                {(itemsList || []).filter((i) =>
                                  (i.Description || i.description || "")
                                    .toLowerCase()
                                    .includes(
                                      (
                                        item.searchQuery ||
                                        item.name ||
                                        ""
                                      ).toLowerCase(),
                                    ),
                                ).length === 0 && (
                                  <li
                                    className="px-3 py-2 text-gray-500 text-sm"
                                    style={{ listStyle: "none" }}
                                  >
                                    No results found
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.details?.BRAND_ID || item.BRAND_ID || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={
                            item.details?.Description || item.Description || ""
                          }
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.details?.Code || item.Code || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-white"
                          onChange={(e) => {
                            const value = Math.max(1, Number(e.target.value));
                            // update by index so it works even before itemId exists
                            setFormItems((prev) =>
                              prev.map((itm, i) =>
                                i === idx ? { ...itm, quantity: value } : itm,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.details?.SK_UOM || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.leadTime || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={item.unitPrice || ""}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <input
                          type="text"
                          value={`₱ ${item.unitPrice * item.quantity || ""}`}
                          readOnly
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm bg-gray-100"
                        />
                      </td>
                      <td className="text-sm p-2 align-middle">
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 text-sm"
                          onClick={() =>
                            setFormItems((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <LuTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <button
              type="button"
              className="border border-gray-200 text-gray-800 rounded-md px-4 py-2 flex items-center shadow-xs hover:bg-gray-200 transition-all duration-200 text-xs"
              onClick={onAddItem}
              disabled={(formItems || []).some((item) => item.itemId == null)}
              style={
                (formItems || []).some((item) => item.itemId == null)
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : {}
              }
            >
              <LuPlus className="mr-2" /> Add Item
            </button>
          </div>
          <div className="flex justify-end space-y-2">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal:</span>
                <span>₱ {rfq.subtotal != null ? rfq.subtotal : "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="font-medium">VAT (5%):</span>
                <span>₱ {rfq.vat != null ? rfq.vat : "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-t font-bold">
                <span>Grand Total:</span>
                <span>₱ {rfq.grandTotal != null ? rfq.grandTotal : "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
