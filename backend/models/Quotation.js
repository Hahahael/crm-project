import db from '../mocks/dbMock.js';
import { toCamel } from '../helper/utils.js';

export async function getLatestAssigned(userId, stageName) {
  const q = `
    SELECT ws.*, qt.*, a.account_name AS account_name
    FROM workflow_stages ws
    INNER JOIN (
      SELECT wo_id, MAX(created_at) AS max_created
      FROM workflow_stages
      WHERE assigned_to = $1
      GROUP BY wo_id
    ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
    INNER JOIN quotations qt ON ws.wo_id = qt.wo_id
    LEFT JOIN accounts a ON qt.account_id = a.id
    WHERE ws.status = 'Draft' AND ws.stage_name = $2
  `;
  const res = await db.query(q, [userId, stageName]);
  return toCamel(res.rows);
}

export default { getLatestAssigned };
