import db from '../mocks/dbMock.js';
import { toCamel } from '../helper/utils.js';

export async function findWorkOrderIdByAccountId(accountId, dbClient = db) {
  const res = await dbClient.query('SELECT id FROM workorders WHERE account_id = $1 LIMIT 1', [accountId]);
  return res.rows.length > 0 ? res.rows[0].id : null;
}

export async function findAssigneeByWoId(woId, dbClient = db) {
  const res = await dbClient.query("SELECT assigned_to FROM workflow_stages WHERE wo_id = $1 AND stage_name = 'NAEF' LIMIT 1", [woId]);
  return res.rows.length > 0 ? res.rows[0].assignedTo : null;
}

export async function stageExists(woId, stageName = 'NAEF', dbClient = db) {
  const res = await dbClient.query('SELECT 1 FROM workflow_stages WHERE wo_id = $1 AND stage_name = $2 LIMIT 1', [woId, stageName]);
  return res.rows.length > 0;
}

export async function insertStage(woId, stageName, status, assignedTo, dbClient = db) {
  return dbClient.query(
    `INSERT INTO workflow_stages (wo_id, stage_name, status, assigned_to, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [woId, stageName, status, assignedTo]
  );
}

export async function getRequestorByAccountId(accountId, dbClient = db) {
  const res = await dbClient.query('SELECT wo.contact_person FROM workorders wo WHERE wo.account_id = $1', [accountId]);
  return res.rows.length > 0 ? res.rows[0].contactPerson : null;
}

export default { findWorkOrderIdByAccountId, findAssigneeByWoId, stageExists, insertStage };
