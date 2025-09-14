// controllers/authController.js
import { compare } from "bcryptjs";
import pool from "../db.js";
import pkg from "jsonwebtoken";
import { toSnake } from "../helper/utils.js";

const { sign, verify } = pkg;

export async function login(req, res) {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const user = result.rows[0];
    const isMatch = await compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = sign(
      {
        userId: user.id,
        role: user.role,
        username: user.username,
        permissions: user.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 60 * 60 * 1000,
    });

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

export function getMe(req, res) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const decoded = verify(token, process.env.JWT_SECRET);
    return res.json({
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions,
      },
    });
  } catch (err) {
    console.error("❌ JWT verification error:", err.name, err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

export function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });
  return res.json({ message: "Logged out successfully" });
}
