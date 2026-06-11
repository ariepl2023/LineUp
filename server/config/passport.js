import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import pool from "../db/pool.js";

// Local strategy: authenticate with email + hashed password stored in Postgres.
// "usernameField" overrides passport's default "username" field name.
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        // Find user by email
        const result = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email],
        );

        const user = result.rows[0];

        // User not found
        if (!user) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Only the user's id is stored in the session cookie.
// deserializeUser re-fetches the full user row on every request so that
// plan upgrades and profile changes are reflected immediately without
// requiring the user to log out and back in.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

export default passport;
