import db from '../db.js';
import { toSnake, toCamel } from '../helper/utils.js';
import * as SalesLead from '../models/SalesLead.js';
import * as Workorder from '../models/Workorder.js';
import * as TechnicalRecommendation from '../models/TechnicalRecommendation.js';
import * as Rfq from '../models/Rfq.js';
import * as Quotation from '../models/Quotation.js';

export async function latestSubmitted() {
  const unionQuery = `
        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'sales_lead' AS module, sl.sl_number AS transaction_number, sl.id AS module_id, sl.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN sales_leads sl ON ws.wo_id = sl.wo_id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON sl.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'Sales Lead'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'rfq' AS module, r.rfq_number AS transaction_number, r.id AS module_id, r.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN rfqs r ON ws.wo_id = r.wo_id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON r.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'RFQ'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'technical_recommendation' AS module, tr.tr_number AS transaction_number, tr.id AS module_id, tr.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN technical_recommendations tr ON ws.wo_id = tr.wo_id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON tr.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'Technical Recommendation'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'workorder' AS module, wo.wo_number AS transaction_number, wo.id AS module_id, wo.account_id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN workorders wo ON ws.wo_id = wo.id
            LEFT JOIN users u ON ws.assigned_to = u.id
            LEFT JOIN accounts a ON wo.account_id = a.id
            WHERE ws.status = 'Submitted' AND ws.stage_name = 'Work Order'

            UNION ALL

        SELECT ws.id AS workflow_stage_id, ws.created_at AS submitted_date, ws.stage_name, ws.status, ws.wo_id, ws.assigned_to, ws.remarks, u.username AS submitted_by, 'account' AS module, a.ref_number AS transaction_number, a.id AS module_id, a.id AS account_id, a.account_name AS account_name
            FROM workflow_stages ws
            INNER JOIN (
                SELECT wo_id, MAX(created_at) AS max_created
                FROM workflow_stages
                GROUP BY wo_id
            ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
            LEFT JOIN workorders wo ON ws.wo_id = wo.id
            LEFT JOIN accounts a ON wo.account_id = a.id
            LEFT JOIN users u ON ws.assigned_to = u.id
            WHERE ws.status = 'Submitted' AND (ws.stage_name = 'Account' OR ws.stage_name = 'NAEF')
        `;
  const { rows } = await db.query(unionQuery);
  return toCamel(rows);
}

export async function listAll() {
  const result = await db.query(
    `SELECT ws.*, u.username AS assigned_to_username
       FROM workflow_stages ws
       LEFT JOIN users u ON ws.assigned_to = u.id
       ORDER BY ws.created_at ASC`
  );
  return toCamel(result.rows);
}

export async function listByWorkorder(woId) {
  const result = await db.query(
    `SELECT ws.*, u.username AS assigned_to_username
       FROM workflow_stages ws
       LEFT JOIN users u ON ws.assigned_to = u.id
       WHERE ws.wo_id = $1
       ORDER BY ws.created_at ASC`,
    [woId]
  );
  return toCamel(result.rows);
}

export async function getById(id) {
  const result = await db.query(
    `SELECT ws.*, u.username AS assigned_to_username
                FROM workflow_stages ws
                LEFT JOIN users u ON ws.assigned_to = u.id
                WHERE ws.id = $1`,
    [id]
  );
  return toCamel(result.rows[0] || null);
}

export async function createStage(body) {
  const snake = toSnake(body);
  const {
    wo_id,
    stage_name,
    status,
    assigned_to,
    notified = false,
    remarks,
  } = snake;

  await db.query('BEGIN');
  let insertedStage;
  try {
    const result = await db.query(
      `INSERT INTO workflow_stages
                    (wo_id, stage_name, status, assigned_to, notified, remarks, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                RETURNING *`,
      [wo_id, stage_name, status, assigned_to, notified, remarks]
    );
    insertedStage = result.rows[0];

    switch (stage_name) {
      case 'Sales Lead':
        await db.query('UPDATE sales_leads SET stage_status = $1 WHERE wo_id = $2', [status, wo_id]);
        break;
      case 'RFQ':
        await db.query('UPDATE rfqs SET stage_status = $1 WHERE wo_id = $2', [status, wo_id]);
        break;
      case 'Technical Recommendation':
        await db.query('UPDATE technical_recommendations SET stage_status = $1 WHERE wo_id = $2', [status, wo_id]);
        break;
      case 'Account':
      case 'NAEF':
        if (snake.account_id) {
          await db.query('UPDATE accounts SET stage_status = $1 WHERE id = $2', [status, snake.account_id]);
        }
        break;
      case 'Work Order':
        await db.query('UPDATE workorders SET stage_status = $1 WHERE id = $2', [status, wo_id]);
        break;
      default:
        break;
    }

    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  return toCamel(insertedStage);
}

export async function updateStage(id, body) {
  const snake = toSnake(body);
  const { status, assigned_to, notified } = snake;
  const result = await db.query(
    `UPDATE workflow_stages
            SET status = COALESCE($1, status),
                assigned_to = COALESCE($2, assigned_to),
                notified = COALESCE($3, notified),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *`,
    [status, assigned_to, notified, id]
  );
  return toCamel(result.rows[0] || null);
}

export async function deleteStage(id) {
  const result = await db.query('DELETE FROM workflow_stages WHERE id = $1 RETURNING *', [id]);
  return toCamel(result.rows[0] || null);
}

export async function latestAssigned(id, stageName) {
  const stage = stageName.toLowerCase();
  // Delegate to module-specific model functions
  if (stage.includes('sales lead') || stage.includes('sl')) {
    return SalesLead.getLatestAssigned(id, stageName);
  }

  if (stage.includes('workorder') || stage.includes('wo')) {
    return Workorder.getLatestAssigned(id, stageName);
  }

  if (stage.includes('technical reco') || stage.includes('tr')) {
    return TechnicalRecommendation.getLatestAssigned(id, stageName);
  }

  if (stage.includes('rfq')) {
    return Rfq.getLatestAssigned(id, stageName);
  }

  if (stage.includes('quotation') || stage.includes('quote')) {
    return Quotation.getLatestAssigned(id, stageName);
  }

  // Fallback: return workorders (default behavior)
  return Workorder.getLatestAssigned(id, stageName);
}

export default {
  latestSubmitted,
  listAll,
  listByWorkorder,
  getById,
  createStage,
  updateStage,
  deleteStage,
  latestAssigned,
};
