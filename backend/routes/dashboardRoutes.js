import express from "express";
import db from "../db.js";

const router = express.Router();

// Helpers
async function tableExists(tableName) {
    // Use information_schema which pg-mem supports
    const q = `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
                AND lower(table_name) = lower($1)
        ) AS exists
    `;
    const r = await db.query(q, [tableName]);
    return !!(r.rows && r.rows[0] && r.rows[0].exists);
}

async function columnExists(tableName, columnName) {
    const q = `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE lower(table_name) = lower($1)
                AND lower(column_name) = lower($2)
                AND table_schema = 'public'
        ) AS exists
    `;
    const r = await db.query(q, [tableName, columnName]);
    return !!(r.rows && r.rows[0] && r.rows[0].exists);
}

async function chooseTable() {
    if (await tableExists("workorders")) return "workorders";
    if (await tableExists("rfqs")) return "rfqs";
    return null;
}

/**
 * tryQuery:
 * - Run primarySql with params
 * - If it throws, and fallbackSql provided, run fallbackSql (with same params)
 * - If fallback also throws, rethrow the fallback error
 * - If neither present/works, return { rows: [] }
 */
async function tryQuery(primarySql, fallbackSql = null, params = []) {
    try {
        return await db.query(primarySql, params);
    } catch (errPrimary) {
        if (!fallbackSql) {
            // no fallback provided — rethrow original
            throw errPrimary;
        }
        try {
            return await db.query(fallbackSql, params);
        } catch (errFallback) {
            // Both failed. Return empty rows to keep callers safe.
            console.warn("Both primary and fallback queries failed:", errPrimary?.message, errFallback?.message);
            return { rows: [] };
        }
    }
}

// /api/dashboard/summary
router.get("/summary", async (req, res) => {
    try {
        const primarySql = `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN stage_status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN stage_status = 'In Progress' THEN 1 ELSE 0 END) AS "inProgress",
                SUM(CASE WHEN stage_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN (due_date::date < CURRENT_DATE AND done_date IS NULL) THEN 1 ELSE 0 END) AS overdue,
                SUM(CASE WHEN (due_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days') AND done_date IS NULL) THEN 1 ELSE 0 END) AS "dueSoon",
                SUM(CASE WHEN done_date IS NOT NULL AND done_date::date <= due_date::date THEN 1 ELSE 0 END) AS "onTimeCount"
            FROM workorders
        `;

        const fallbackSql = `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN stage_status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN stage_status = 'In Progress' THEN 1 ELSE 0 END) AS "inProgress",
                SUM(CASE WHEN stage_status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN (DATE(due_date) < DATE(NOW()) AND (done_date IS NULL)) THEN 1 ELSE 0 END) AS overdue,
                SUM(CASE WHEN (DATE(due_date) >= DATE(NOW()) AND DATE(due_date) <= DATE(NOW() + INTERVAL '3 days') AND (done_date IS NULL)) THEN 1 ELSE 0 END) AS "dueSoon",
                SUM(CASE WHEN done_date IS NOT NULL AND DATE(done_date) <= DATE(due_date) THEN 1 ELSE 0 END) AS "onTimeCount"
            FROM rfqs
        `;

        const result = await tryQuery(primarySql, fallbackSql);
        let row = result.rows && result.rows[0] ? result.rows[0] : {};

        if (!row || Object.keys(row).length === 0) {
            const table = await chooseTable();
            if (table) {
                const simple = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
                row = simple.rows && simple.rows[0] ? simple.rows[0] : {};
            }
        }

        const total = Number(row.total) || 0;
        const onTimeCount = Number(row.onTimeCount) || 0;
        const onTimeRate = total > 0 ? (onTimeCount / total) * 100 : 0;

        return res.json({
            total,
            pending: Number(row.pending) || 0,
            inProgress: Number(row.inProgress) || 0,
            completed: Number(row.completed) || 0,
            overdue: Number(row.overdue) || 0,
            dueSoon: Number(row.dueSoon) || 0,
            onTimeRate,
        });
    } catch (err) {
        console.error("Dashboard summary error:", err);
        return res.status(500).json({ error: "Failed to compute dashboard summary" });
    }
});

// /api/dashboard/due-performance
router.get('/due-performance', async (req, res) => {
    try {
      const primarySql = `
        SELECT
          SUM(CASE WHEN done_date IS NOT NULL AND done_date <= due_date THEN 1 ELSE 0 END) AS early,
          SUM(CASE WHEN done_date IS NOT NULL AND done_date = due_date THEN 1 ELSE 0 END) AS onTime,
          SUM(CASE WHEN done_date IS NULL AND due_date BETWEEN NOW() AND (NOW() + INTERVAL '3 days') THEN 1 ELSE 0 END) AS dueSoon,
          SUM(CASE WHEN done_date IS NULL AND due_date < NOW() THEN 1 ELSE 0 END) AS overdue,
          SUM(CASE WHEN done_date IS NULL THEN 1 ELSE 0 END) AS notCompleted
        FROM workorders
      `;
  
      const fallbackSql = `
        SELECT
          SUM(CASE WHEN done_date IS NOT NULL AND done_date <= due_date THEN 1 ELSE 0 END) AS early,
          SUM(CASE WHEN done_date IS NOT NULL AND done_date = due_date THEN 1 ELSE 0 END) AS onTime,
          SUM(CASE WHEN done_date IS NULL AND due_date >= NOW() AND due_date <= (NOW() + INTERVAL '3 days') THEN 1 ELSE 0 END) AS dueSoon,
          SUM(CASE WHEN done_date IS NULL AND due_date < NOW() THEN 1 ELSE 0 END) AS overdue,
          SUM(CASE WHEN done_date IS NULL THEN 1 ELSE 0 END) AS notCompleted
        FROM rfqs
      `;
  
      const result = await tryQuery(primarySql, fallbackSql);
      let row = result.rows && result.rows[0] ? result.rows[0] : {};
  
      // fallback logic
      if (!row || Object.keys(row).length === 0) {
        const table = await chooseTable();
        if (table) {
          const hasDue = await columnExists(table, 'due_date');
          const hasDone = await columnExists(table, 'done_date');
  
          if (hasDue) {
            let simpleSql;
          
            if (hasDone) {
              simpleSql = `
                SELECT
                  SUM(CASE WHEN done_date IS NOT NULL THEN 1 ELSE 0 END) AS completed,
                  SUM(CASE WHEN done_date IS NULL AND due_date::timestamp < (NOW()::timestamp) THEN 1 ELSE 0 END) AS overdue
                FROM ${table};
              `;
            } else {
              simpleSql = `
                SELECT
                  0 AS completed,
                  SUM(CASE WHEN due_date::timestamp < (NOW()::timestamp) THEN 1 ELSE 0 END) AS overdue
                FROM ${table};
              `;
            }
          
            const s = await db.query(simpleSql);
            row = s.rows && s.rows[0] ? s.rows[0] : {};
          }
          
        }
      }
  
      return res.json({
        early: Number(row.early) || 0,
        onTime: Number(row.onTime) || 0,
        dueSoon: Number(row.dueSoon) || 0,
        overdue: Number(row.overdue) || 0,
        notCompleted: Number(row.notCompleted) || 0,
        completed: Number(row.completed) || 0,
      });
    } catch (err) {
      console.error('Dashboard due-performance error:', err);
      return res.status(500).json({ error: 'Failed to compute due-date performance' });
    }
  });
  

// /api/dashboard/stage-distribution
router.get("/stage-distribution", async (req, res) => {
    try {
        const primarySql = `SELECT stage_status AS stage, COUNT(*) AS count FROM workorders GROUP BY stage_status ORDER BY count DESC`;
        const fallbackSql = `SELECT stage_status AS stage, COUNT(*) AS count FROM rfqs GROUP BY stage_status ORDER BY count DESC`;
        const result = await tryQuery(primarySql, fallbackSql);
        const rows = result.rows || [];
        const total = rows.reduce((s, r) => s + Number(r.count || 0), 0) || 0;
        const out = rows.map((r) => ({
            stage: r.stage || "Unknown",
            count: Number(r.count || 0),
            pct: total > 0 ? (Number(r.count || 0) / total) * 100 : 0,
        }));
        return res.json(out);
    } catch (err) {
        console.error("Dashboard stage-distribution error:", err);
        return res.status(500).json({ error: "Failed to compute stage distribution" });
    }
});

// /api/dashboard/assignees
router.get("/assignees", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        // Primary tries to use workorders + users; fallback uses rfqs
        const primarySql = `
            SELECT u.id AS assignee_id,
                    COALESCE(u.username, (u.first_name || ' ' || u.last_name)) AS assignee_name,
                    COUNT(*) AS count
            FROM workorders w
            LEFT JOIN users u ON u.id = COALESCE(w.assigned_to, w.assignee)
            WHERE COALESCE(w.assigned_to, w.assignee) IS NOT NULL
            GROUP BY u.id, u.username, u.first_name, u.last_name
            ORDER BY count DESC
            LIMIT $1
        `;
        const fallbackSql = `
            SELECT r.assignee AS assignee_id, NULL AS assignee_name, COUNT(*) AS count
            FROM rfqs r
            WHERE r.assignee IS NOT NULL
            GROUP BY r.assignee
            ORDER BY count DESC
            LIMIT $1
        `;
        const result = await tryQuery(primarySql, fallbackSql, [limit]);
        const rows = result.rows || [];
        return res.json({
            totalActive: rows.length,
            top: rows.map((r) => ({ assignee: r.assignee_name || r.assignee_id || r.assignee, count: Number(r.count || 0) })),
        });
    } catch (err) {
        console.error("Dashboard assignees error:", err);
        return res.status(500).json({ error: "Failed to compute assignee stats" });
    }
});

export default router;
