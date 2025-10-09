import db from '../mocks/dbMock.js';
import { toCamel } from '../helper/utils.js';

export async function getLatestAssigned(userId, stageName) {
  const q = `
    SELECT rfq.*, sl.sl_number, a.account_name AS account_name
    FROM workflow_stages ws
    INNER JOIN (
      SELECT wo_id, MAX(created_at) AS max_created
      FROM workflow_stages
      WHERE assigned_to = $1
      GROUP BY wo_id
    ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
    INNER JOIN rfqs rfq ON ws.wo_id = rfq.wo_id
    LEFT JOIN sales_leads sl ON rfq.sl_id = sl.id
    LEFT JOIN accounts a ON rfq.account_id = a.id
    WHERE ws.status = 'Draft' AND ws.stage_name = $2
  `;
  const res = await db.query(q, [userId, stageName]);
  return toCamel(res.rows);
}

export default { getLatestAssigned };
