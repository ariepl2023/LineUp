import express from "express";
import pool from "../db/pool.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM plans ORDER BY price ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/subscribe/:planId", isAuthenticated, async (req, res) => {
  try {
    const { planId } = req.params;
    await pool.query("UPDATE users SET plan_id = $1 WHERE id = $2", [
      planId,
      req.user.id,
    ]);
    res.json({ message: "Plan updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
