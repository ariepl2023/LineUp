import express from "express";
import bcrypt from "bcrypt";
import passport from "../config/passport.js";
import pool from "../db/pool.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user to DB with Free plan
    await pool.query(
      `INSERT INTO users (email, password, plan_id)
       VALUES ($1, $2, (SELECT id FROM plans WHERE has_alerts = false ORDER BY price ASC LIMIT 1))`,
      [email, hashedPassword],
    );

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ message: "Login successful", user: req.user });
});

// Logout
router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out successfully" });
  });
});

// Check session (supports both Passport and Clerk)
router.get("/me", isAuthenticated, (req, res) => {
  res.json(req.user);
});

router.post("/update-telegram", isAuthenticated, async (req, res) => {
  try {
    const { telegram_chat_id } = req.body;

    if (!telegram_chat_id || isNaN(telegram_chat_id)) {
      return res.status(400).json({ message: "Chat ID לא תקין" });
    }

    const userId = req.user.id;

    await pool.query("UPDATE users SET telegram_chat_id = $1 WHERE id = $2", [
      telegram_chat_id,
      userId,
    ]);

    res.json({ message: "Telegram connected successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
