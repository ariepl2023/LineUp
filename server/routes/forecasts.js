import pool from "../db/pool.js";
import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import "dotenv/config";

const router = express.Router();

router.get("/my-beach", isAuthenticated, async (req, res) => {
  try {
    const prefsResult = await pool.query(
      "SELECT beach_id FROM user_preferences WHERE user_id = $1",
      [req.user.id],
    );

    if (prefsResult.rows.length === 0) {
      return res.status(404).json({ message: "No beach preference set" });
    }

    const beachId = prefsResult.rows[0].beach_id;

    const beachResult = await pool.query(
      "SELECT name FROM beaches WHERE id = $1",
      [beachId],
    );

    const result = await pool.query(
      "SELECT * FROM forecasts WHERE beach_id = $1 AND forecast_time >= DATE_TRUNC('day', NOW()) ORDER BY forecast_time ASC",
      [beachId],
    );

    res.json({ beach_name: beachResult.rows[0]?.name, forecasts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:beachId", async (req, res) => {
  try {
    const { beachId } = req.params;

    const result = await pool.query(
      "SELECT * FROM forecasts WHERE beach_id = $1 AND forecast_time >= DATE_TRUNC('day', NOW()) ORDER BY forecast_time ASC",
      [beachId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Beach not found" });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
