// Colorize console.error globally (must be first import)
import "./helper/logColors.js";

// MSSQL utilities are imported in the mssql route when needed
import mssqlRoutes from "./routes/mssqlRoutes.js";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import usersRouter from "./routes/usersRoutes.js";
import accountsRouter from "./routes/accountsRoutes.js";
import hierarchicalRouter from "./routes/hierarchicalRoutes.js";
import workflowStagesRouter from "./routes/workflowStagesRoutes.js";
import workordersRouter from "./routes/workordersRoutes.js";
import salesleadsRouter from "./routes/salesleadsRoutes.js";
import technicalsRouter from "./routes/technicalsRoutes.js";
import rfqsRouter from "./routes/rfqsRoutes.js";
import inventoryRouter from "./routes/inventoryRoutes.js";
import quotationsRouter from "./routes/quotationsRoutes.js";
import mssqlInventoryRoutes from "./routes/mssqlInventoryRoutes.js";
import mssqlAccountsRoutes from "./routes/mssqlAccountsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const PORT = process.env.PORT || 5500;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ALLOW_ALL_CORS = String(process.env.ALLOW_ALL_CORS || "false").toLowerCase() === "true";

const app = express();

app.use(cookieParser());
// Allow larger request bodies for complex RFQ payloads during dev
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Allow multiple local/preview/prod origins
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://139.135.131.164:5173",
  "http://139.135.131.164:5174",
  // Deployed previews / prod frontends
  "https://crm-project-git-dev-raphaels-projects-763450c5.vercel.app",
  "https://crm-project-ieqy6ib68-raphaels-projects-763450c5.vercel.app",
  "https://crm-project-git-new-dev-raphaels-projects-763450c5.vercel.app",
  "https://crm-project-4ugu.onrender.com",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (ALLOW_ALL_CORS) return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    // Let the cors package reflect request headers automatically to avoid preflight mismatches
    // allowedHeaders: undefined,
    optionsSuccessStatus: 204,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use((req, res, next) => {
  console.log("🛰️  Incoming request:", req.method, req.path, "from", req.headers.origin);
  next();
});

// Preflight for all routes
app.options(/.*/, cors({
  origin: function (origin, callback) {
    if (ALLOW_ALL_CORS) return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// Lightweight CORS debug endpoint
app.get("/api/debug/cors", (req, res) => {
  res.json({
    ok: true,
    origin: req.headers.origin || null,
    allowed: ALLOW_ALL_CORS || allowedOrigins.includes(req.headers.origin || ""),
    allowedOrigins,
    allowAll: ALLOW_ALL_CORS,
  });
});

// Temporary debug endpoint (DEV ONLY): echo raw request body so clients can
// verify exactly what the server receives. Remove or protect in production.
app.post("/api/debug/echo", (req, res) => {
  try {
    console.log("[DEBUG ECHO] headers:", {
      "content-type": req.get("content-type"),
      "content-length": req.get("content-length"),
    });
    console.log("[DEBUG ECHO] body keys:", Object.keys(req.body || {}));
    return res.json({ ok: true, body: req.body });
  } catch (err) {
    console.error("[DEBUG ECHO] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Restore /auth routes for authentication
app.use("/auth", authRoutes);

// Healthcheck route for monitoring
app.get("/healthcheck", (req, res) => {
  res.json({ status: "ok" });
});
app.use(authMiddleware);

app.use("/api/mssql", mssqlRoutes);
app.use("/api/mssql/inventory", mssqlInventoryRoutes);
app.use("/api/mssql/accounts", mssqlAccountsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use("/dashboard", usersRouter);
app.use("/api/users", usersRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/hierarchy", hierarchicalRouter);
app.use("/api/workflow-stages", workflowStagesRouter);
app.use("/api/workorders", workordersRouter);
app.use("/api/salesleads", salesleadsRouter);
app.use("/api/technicals", technicalsRouter);
app.use("/api/rfqs", rfqsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/quotations", quotationsRouter);

app.get("/", (req, res) => {
  res.send("🚀 Server is alive!");
});

const server = app.listen(PORT||5500,'0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT||5500}`);
});

server.on("error", (err) => {
  console.error("❌ Server failed to start:", err);
});
