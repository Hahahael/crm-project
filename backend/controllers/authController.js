// controllers/authController.js
import { sql, crmPoolPromise } from "../mssql.js";
import pkg from "jsonwebtoken";

const { sign, verify } = pkg;

export async function login(req, res) {
  const { username, password } = req.body;

  try {
    const pool = await crmPoolPromise;
    const result = await pool.request().input('username', sql.NVarChar, username).query('SELECT * FROM crmdb.users WHERE username = @username');
    const user = (result.recordset || [])[0];
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    // Plain-text password comparison (per new requirement)
    const stored = user.password || user.password_hash || user.passwordHash || null;
    if (!stored || String(stored) !== String(password)) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = sign(
      {
        userId: user.id,
        role: user.role || user.role_id || null,
        username: user.username,
        permissions: user.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 60 * 60 * 1000,
    });

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role || user.role_id || null,
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
    secure: true,
    sameSite: "None",
  });
  return res.json({ message: "Logged out successfully" });
}
