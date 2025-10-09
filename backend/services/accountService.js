import * as AccountModel from '../models/Account.js';
import db from '../mocks/dbMock.js';
import { toSnake } from '../helper/utils.js';
import * as WorkflowModel from '../models/Workflow.js';

// Business logic for accounts
export async function getAll() {
  return AccountModel.findAll();
}

export async function getNAEF() {
  return AccountModel.findNAEF();
}

export async function getById(id) {
  return AccountModel.findById(id);
}

export async function createAccount(payload) {
  // payload is expected camelCase; AccountModel.create will convert
  const created = await AccountModel.create(payload);
  return created;
}

async function generateRefNumberIfNeeded(id, snakeData) {
  // if is_naef true in payload, generate a REF-YYYY-XXXX counter and populate requested_by
  if (!snakeData.is_naef) return { snakeData, wo_id: snakeData.wo_id, assignee: snakeData.assignee };

  const currentYear = new Date().getFullYear();
  const refLike = `REF-${currentYear}-%`;
  const refNumberResult = await db.query(
    `SELECT ref_number FROM accounts WHERE ref_number LIKE $1 ORDER BY ref_number DESC LIMIT 1`,
    [refLike]
  );

  let newCounter = 1;
  if (refNumberResult.rows.length > 0) {
    const lastRefNumber = refNumberResult.rows[0].refNumber;
    const lastCounter = parseInt(lastRefNumber.split('-')[2], 10) || 0;
    newCounter = lastCounter + 1;
  }

  const ref_number = `REF-${currentYear}-${String(newCounter).padStart(4, '0')}`;

  // find requestor from workorders by account_id
  const requested_by = await WorkflowModel.getRequestorByAccountId(id);

  return { snakeData: { ...snakeData, ref_number, requested_by }, wo_id: snakeData.wo_id, assignee: snakeData.assignee };
}

export async function updateAccount(id, payload) {
  // payload is camelCase
  const snake = toSnake(payload) || {};

  // Whitelist fields (same as previous route)
  const allowedFields = [
    'naef_number', 'stage_status', 'ref_number', 'date_created', 'requested_by', 'designation', 'department_id',
    'validity_period', 'due_date', 'account_name', 'contract_period', 'industry_id', 'account_designation',
    'product_id', 'contact_number', 'location', 'email_address', 'address', 'buyer_incharge', 'trunkline',
    'contract_number', 'process', 'secondary_email_address', 'machines', 'reason_to_apply', 'automotive_section',
    'source_of_inquiry', 'commodity', 'business_activity', 'model', 'annual_target_sales', 'population',
    'source_of_target', 'existing_bellows', 'products_to_order', 'model_under', 'target_areas', 'analysis',
    'from_date', 'to_date', 'activity_period', 'prepared_by', 'noted_by', 'approved_by', 'received_by',
    'acknowledged_by', 'updated_at', 'created_at', 'is_naef'
  ];

  const filteredData = Object.fromEntries(Object.entries(snake).filter(([k]) => allowedFields.includes(k)));

  // handle NAEF ref number and requested_by generation
  const { snakeData, wo_id, assignee } = await generateRefNumberIfNeeded(id, { ...snake, ...filteredData });

  // Remove transient fields
  if (snakeData) {
    delete snakeData.wo_id;
    delete snakeData.assignee;
  }

  // If wo_id not present, find it
  let woId = wo_id;
  if (!woId) {
    const woResult = await WorkflowModel.findWorkOrderIdByAccountId(id);
    woId = woResult || null;
  }

  // If assignee missing, try to get from workflow_stages
  let finalAssignee = assignee;
  if (!finalAssignee && woId) {
    finalAssignee = await WorkflowModel.findAssigneeByWoId(woId);
  }

  // Update account via model
  const updated = await AccountModel.updateById(id, snakeData);

  if (!updated) return null;

  // Insert workflow stage as before
  const exists = await WorkflowModel.stageExists(woId, 'NAEF');
  const status = snake?.status ? snake.status : (exists ? 'Pending' : 'Draft');

  await WorkflowModel.insertStage(woId, 'NAEF', status, finalAssignee);

  if (updated) updated.assignee = finalAssignee;

  return updated;
}

export default {
  getAll,
  getNAEF,
  getById,
  createAccount,
  updateAccount,
};
