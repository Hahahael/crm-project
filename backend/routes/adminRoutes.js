import express from "express";
import db from "../db.js";

const router = express.Router();

// POST /api/admin/wipe
// Danger: Wipes all data from public tables except whitelisted core tables.
// Protection layers:
// - Requires authMiddleware globally (mounted after auth in server.js)
// - Requires a confirmation token in body: { confirm: "WIPE" }
// - Blocks in production unless ADMIN_ALLOW_WIPE=true
router.post("/wipe", async (req, res) => {
  try {
    console.log("[ADMIN WIPE] Request received from user:", req.user?.id || "unknown");
    const { confirm } = req.body || {};
    if (confirm !== "WIPE") {
      return res.status(400).json({ ok: false, error: "Confirmation token missing or invalid" });
    }

    if (process.env.NODE_ENV === "production" && String(process.env.ADMIN_ALLOW_WIPE).toLowerCase() !== "true") {
      return res.status(403).json({ ok: false, error: "Wipe is blocked in production. Set ADMIN_ALLOW_WIPE=true to override." });
    }

    // Whitelist: do NOT truncate these tables
    const keep = ["roles", "departments", "statuses", "users"];

    console.log("[ADMIN WIPE] Fetching tables to truncate...");

    // Fetch all base tables in public schema except the keep list
    const q = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> 'spatial_ref_sys'
        AND table_name NOT IN (${keep.map((_, i) => `$${i + 1}`).join(", ")});
    `;
    const { rows } = await db.query(q, keep);
    const tables = rows.map((r) => r.tableName).filter(Boolean);

    if (tables.length === 0) {
      return res.json({ ok: true, truncated: 0, tables: [] });
    }

    // Quote identifiers safely
    const quoted = tables.map((t) => `"${t.replace(/"/g, '""')}"`);
    const sql = `TRUNCATE TABLE ${quoted.join(", ")} RESTART IDENTITY CASCADE;`;
    await db.query(sql);

    return res.json({ ok: true, truncated: tables.length, tables });
  } catch (err) {
    console.error("[ADMIN WIPE] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
