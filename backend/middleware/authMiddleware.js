// src/middleware/authMiddleware.js
import pkg from "jsonwebtoken";
const { verify } = pkg;

export default function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET);
    req.user = decoded; // userId, role
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
}
