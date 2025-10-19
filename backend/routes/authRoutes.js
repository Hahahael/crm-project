// routes/authRoutes.js
import express from "express";
import { login, getMe, logout } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", getMe); // ✅ get current user
router.post("/logout", logout); // ✅ logout

export default router;
