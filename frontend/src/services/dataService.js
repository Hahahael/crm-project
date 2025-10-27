// src/services/dataService.js
// Centralized read-only data accessors for app modules
// Uses apiBackendFetch so cookies (JWT) are sent automatically.

import { apiBackendFetch } from "./api";

async function fetchJSON(endpoint, options = {}) {
  const res = await apiBackendFetch(endpoint, options);
  if (!res) throw new Error("No response returned");
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const e = await res.json();
      if (e?.error) errMsg = e.error;
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

function q(params) {
  if (!params || Object.keys(params).length === 0) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// Users
export const getUsers = (params) => fetchJSON(`/api/users${q(params)}`);
export const getUserById = (id) => fetchJSON(`/api/users/${encodeURIComponent(id)}`);

// Accounts (NAEF)
export const getAccounts = (params) => fetchJSON(`/api/accounts${q(params)}`);
export const getAccountById = (id) => fetchJSON(`/api/accounts/${encodeURIComponent(id)}`);

// Work Orders
export const getWorkOrders = (params) => fetchJSON(`/api/workorders${q(params)}`);
export const getWorkOrderById = (id) => fetchJSON(`/api/workorders/${encodeURIComponent(id)}`);
export const getWorkOrdersStatusSummary = () => fetchJSON(`/api/workorders/summary/status`);

// Workflow Stages
export const getWorkflowLatestSummary = () => fetchJSON(`/api/workflow-stages/summary/latest`);

// Sales Leads
export const getSalesLeads = (params) => fetchJSON(`/api/salesleads${q(params)}`);
export const getSalesLeadById = (id) => fetchJSON(`/api/salesleads/${encodeURIComponent(id)}`);

// Technical Recommendations
export const getTechnicals = (params) => fetchJSON(`/api/technicals${q(params)}`);
export const getTechnicalById = (id) => fetchJSON(`/api/technicals/${encodeURIComponent(id)}`);

// RFQs
export const getRFQs = (params) => fetchJSON(`/api/rfqs${q(params)}`);
export const getRFQById = (id) => fetchJSON(`/api/rfqs/${encodeURIComponent(id)}`);

// Quotations
export const getQuotations = (params) => fetchJSON(`/api/quotations${q(params)}`);
export const getQuotationById = (id) => fetchJSON(`/api/quotations/${encodeURIComponent(id)}`);

// Dashboard
export const getDashboardSummary = () => fetchJSON(`/api/dashboard/summary`);
export const getDashboardDuePerformance = () => fetchJSON(`/api/dashboard/due-performance`);
export const getDashboardStageDistribution = () => fetchJSON(`/api/dashboard/stage-distribution`);

// Optional: Inventory (create more granular methods as needed)
export const getInventory = (params) => fetchJSON(`/api/inventory${q(params)}`);

// Default export for convenience
const dataService = {
  fetchJSON,
  // users
  getUsers,
  getUserById,
  // accounts
  getAccounts,
  getAccountById,
  // workorders
  getWorkOrders,
  getWorkOrderById,
  getWorkOrdersStatusSummary,
  // workflow
  getWorkflowLatestSummary,
  // sales leads
  getSalesLeads,
  getSalesLeadById,
  // technicals
  getTechnicals,
  getTechnicalById,
  // rfqs
  getRFQs,
  getRFQById,
  // quotations
  getQuotations,
  getQuotationById,
  // dashboard
  getDashboardSummary,
  getDashboardDuePerformance,
  getDashboardStageDistribution,
  // inventory
  getInventory,
};

export default dataService;
