import express from "express";
import session from "express-session";
import cors from "cors";
import passport from "passport";
import { clerkMiddleware } from "@clerk/express";
import authRouter from "./routes/auth.js";
import beachesRouter from "./routes/beaches.js";
import forecastsRouter from "./routes/forecasts.js";
import preferencesRouter from "./routes/preferences.js";
import plansRouter from "./routes/plans.js";
import "./services/cron.js";
import "dotenv/config";
import "./services/telegram.js";
import { checkAndSendAlerts } from "./services/alerts.js";

const app = express();

const ALLOWED_ORIGINS = ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow web app (has origin) and mobile app (no origin header)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(clerkMiddleware());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  }),
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRouter);
app.use("/beaches", beachesRouter);
app.use("/forecasts", forecastsRouter);
app.use("/preferences", preferencesRouter);
app.use("/plans", plansRouter);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.post("/test-alerts", async (req, res) => {
  await checkAndSendAlerts();
  res.send("Alerts triggered");
});

app.post("/fetch-beach/:id", async (req, res) => {
  const { default: pool } = await import("./db/pool.js");
  const beach = await pool.query("SELECT * FROM beaches WHERE id = $1", [req.params.id]);
  if (!beach.rows.length) return res.status(404).send("Beach not found");
  const { id, latitude, longitude } = beach.rows[0];
  const response = await fetch(
    `https://api.stormglass.io/v2/weather/point?lat=${latitude}&lng=${longitude}&params=waveHeight,wavePeriod,waveDirection,windSpeed,windDirection`,
    { headers: { Authorization: process.env.STORMGLASS_API_KEY } }
  );
  if (!response.ok) return res.status(500).send(`Stormglass error: ${response.status}`);
  const data = await response.json();
  let inserted = 0;
  for (const hour of data.hours) {
    if (!hour.waveHeight?.sg || !hour.wavePeriod?.sg || !hour.windSpeed?.sg) continue;
    await pool.query(
      "INSERT INTO forecasts (beach_id, forecast_time, wave_height, wave_period, wave_direction, wind_speed, wind_direction) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (beach_id, forecast_time) DO UPDATE SET wave_height = EXCLUDED.wave_height, wave_period = EXCLUDED.wave_period, wave_direction = EXCLUDED.wave_direction, wind_speed = EXCLUDED.wind_speed, wind_direction = EXCLUDED.wind_direction, fetched_at = NOW()",
      [id, hour.time, hour.waveHeight.sg, hour.wavePeriod.sg, hour.waveDirection?.sg ?? null, hour.windSpeed.sg, hour.windDirection?.sg ?? null]
    );
    inserted++;
  }
  res.send(`Fetched and stored ${inserted} forecast hours for beach ${id}`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
