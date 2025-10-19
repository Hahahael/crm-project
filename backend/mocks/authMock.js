import pkg from "jsonwebtoken";

const { sign, verify } = pkg;

const mockUsers = [
  { id: 1, username: "123", password: "123", role: "Admin" },
  { id: 2, username: "bob", password: "1234", role: "User" },
];

export function mockLogin(req, res) {
  const { username, password } = req.body;

  const user = mockUsers.find(
    (u) => u.username === username && u.password === password,
  );

  if (!user) {
    return res.status(400).json({ message: "Invalid username or password" });
  }

  const token = sign(
    { userId: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 1000 * 60 * 60, // 1 hour
  });

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions || [],
    },
  });
}
