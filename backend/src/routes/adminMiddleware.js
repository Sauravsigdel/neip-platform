const authMiddleware = require("./authMiddleware");
const User = require("../models/User");

async function adminMiddleware(req, res, next) {
  authMiddleware(req, res, async () => {
    try {
      const user = await User.findById(req.userId).select("role email");
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      req.adminUser = user;
      next();
    } catch (err) {
      return res.status(500).json({ error: "Admin check failed" });
    }
  });
}

module.exports = adminMiddleware;
