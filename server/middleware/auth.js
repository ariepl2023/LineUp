import pool from "../db/pool.js";
import { clerkClient } from "@clerk/express";

export const isAuthenticated = async (req, res, next) => {
  // Web app: Passport session auth — existing behaviour unchanged
  if (req.isAuthenticated()) {
    return next();
  }

  // Mobile app: Clerk JWT auth
  const clerkAuth = req.auth();
  if (clerkAuth?.userId) {
    try {
      const clerkUserId = clerkAuth.userId;

      let result = await pool.query(
        "SELECT * FROM users WHERE clerk_user_id = $1",
        [clerkUserId],
      );

      if (result.rows.length === 0) {
        // First API call from this Clerk user — create their DB record
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        const planResult = await pool.query(
          "SELECT id FROM plans WHERE price = 0 LIMIT 1",
        );
        const freePlanId = planResult.rows[0]?.id;

        result = await pool.query(
          `INSERT INTO users (email, clerk_user_id, plan_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET clerk_user_id = $2
           RETURNING *`,
          [email, clerkUserId, freePlanId],
        );
      }

      req.user = result.rows[0];
      return next();
    } catch (err) {
      console.error("Clerk auth error:", err);
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  res.status(401).json({ message: "Unauthorized" });
};
