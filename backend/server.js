import express from 'express';
import cors from 'cors';
import cookieParser from "cookie-parser";

import pool from './db.js';
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import usersRouter from "./routes/usersRoutes.js"
import accountsRouter from "./routes/accountsRoutes.js";
import hierarchicalRouter from "./routes/hierarchicalRoutes.js";
import workflowStagesRouter from "./routes/workflowStagesRoutes.js";
import workordersRouter from "./routes/workordersRoutes.js";
import salesleadsRouter from "./routes/salesleadsRoutes.js";
import technicalsRouter from "./routes/technicalsRoutes.js";
import rfqsRouter from "./routes/rfqsRoutes.js";


const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_URL, // frontend origin
    credentials: true,               // ✅ allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], // add any custom headers if needed
  })
);

// Apply auth middleware AFTER public routes if needed
app.use("/auth", authRoutes);
app.get('/healthcheck', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    return res.json({ status: 'ok', time: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(authMiddleware);
app.use("/dashboard", usersRouter);
app.use("/api/users", usersRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/hierarchy", hierarchicalRouter);
app.use("/api/workflow-stages", workflowStagesRouter);
app.use("/api/workorders", workordersRouter);
app.use("/api/salesleads", salesleadsRouter);
app.use("/api/technicals", technicalsRouter);
app.use("/api/rfqs", rfqsRouter);

app.get("/", (req, res) => {
  res.send("🚀 Server is alive!");
});


const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("❌ Server failed to start:", err);
});