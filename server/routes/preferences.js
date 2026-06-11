import pool from "../db/pool.js";
import express from "express";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        up.beach_id,
        b.name AS beach_name,
        up.min_wave_height,
        up.min_wind_speed,
        up.max_wind_speed,
        up.alert_time,
        COALESCE(p.has_alerts, false) AS has_alerts
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       LEFT JOIN beaches b ON up.beach_id = b.id
       LEFT JOIN plans p ON u.plan_id = p.id
       WHERE u.id = $1`,
      [req.user.id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { beach_id, min_wave_height, min_wind_speed, max_wind_speed, alert_time } = req.body;

    const result = await pool.query(
      `INSERT INTO user_preferences (user_id, beach_id, min_wave_height, min_wind_speed, max_wind_speed, alert_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         beach_id = $2,
         min_wave_height = $3,
         min_wind_speed = $4,
         max_wind_speed = $5,
         alert_time = $6
       RETURNING *`,
      [req.user.id, beach_id, min_wave_height || null, min_wind_speed || null, max_wind_speed || null, alert_time || null],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
