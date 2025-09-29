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
// Allow multiple Vercel preview URLs and production
const allowedOrigins = [
  "https://crm-project-git-dev-raphaels-projects-763450c5.vercel.app",
  "https://crm-project-ieqy6ib68-raphaels-projects-763450c5.vercel.app",
  "https://crm-project-4ugu.onrender.com",
  "http://localhost:5173",
  FRONTEND_URL,
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Restore /auth routes for authentication
app.use("/auth", authRoutes);

// Healthcheck route for monitoring
app.get("/healthcheck", (req, res) => {
  res.json({ status: "ok" });
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