const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "weathernepal_secret_2026";

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
