// src/middleware/authMiddleware.js
import pkg from "jsonwebtoken";
const { verify } = pkg;

export default function (req, res, next) {
  // console.log("Auth Middleware: Headers:", req.headers);
  // console.log("Auth Middleware: Cookies:", req.cookies);
  // console.log("Auth Middleware: Authorization Header:", req.headers.authorization);
  const token = req.cookies?.token; // ✅ read from cookie instead of header

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET);
    req.user = decoded; // userId, role
    next();
  } catch (err) {
    console.error("❌ JWT verification error:", err.name, err.message);
    return res.status(403).json({
      message: "Invalid or expired token.",
      error: err.message,
    });
  }
}
