import db from '../mocks/dbMock.js';
import { toCamel } from '../helper/utils.js';

export async function getLatestAssigned(userId, stageName) {
  const q = `
    SELECT ws.*, wo.*, wo.wo_number AS woNumber, u.username AS assigned_to_username, a.account_name AS account_name
    FROM workflow_stages ws
    INNER JOIN (
      SELECT wo_id, MAX(created_at) AS max_created
      FROM workflow_stages
      WHERE assigned_to = $1
      GROUP BY wo_id
    ) latest ON ws.wo_id = latest.wo_id AND ws.created_at = latest.max_created
    INNER JOIN workorders wo ON ws.wo_id = wo.id
    LEFT JOIN accounts a ON wo.account_id = a.id
    LEFT JOIN users u ON wo.assignee = u.id
    WHERE ws.status = 'Pending' AND ws.stage_name = $2 AND wo.assignee = $1
  `;
  const res = await db.query(q, [userId, stageName]);
  return toCamel(res.rows);
}

export default { getLatestAssigned };
