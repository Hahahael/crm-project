import { compare } from "bcryptjs";
import pool from "../db.js";
import { mockLogin } from "../mock/authMock.js";
import pkg from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const { sign } = pkg;

export async function login(req, res) {
  if (process.env.USE_MOCK === "true") {
    return mockLogin(req, res); // ✅ redirect to mock logic
  }

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
    const isMatch = await compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}
