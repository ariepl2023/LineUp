import pool from "../db/pool.js";
import "dotenv/config";

// Fetches hourly wave and wind forecasts from the Stormglass API for every
// active beach and upserts them into the forecasts table.
// ON CONFLICT ... DO UPDATE ensures re-runs overwrite stale data instead of
// creating duplicates — safe to call as many times as needed.
async function fetchAndStoreForecasts() {
  try {
    const fetchedBeaches = await pool.query(
      "SELECT id, latitude, longitude FROM beaches WHERE is_active = true",
    );
    for (const beach of fetchedBeaches.rows) {
      console.log("Fetching beach:", beach.id);

      // Stormglass returns hourly forecasts for the next ~48 hours.
      // The `sg` source key is Stormglass's own blended model.
      const response = await fetch(
        `https://api.stormglass.io/v2/weather/point?lat=${beach.latitude}&lng=${beach.longitude}&params=waveHeight,wavePeriod,waveDirection,windSpeed,windDirection`,
        {
          headers: {
            Authorization: process.env.STORMGLASS_API_KEY,
          },
        },
      );
      if (!response.ok) {
        console.error(`Stormglass API error for beach ${beach.id}: ${response.status}`);
        continue;
      }
      const data = await response.json();
      for (const beachData of data.hours) {
        // Skip hours where the essential surf metrics are missing
        if (!beachData.waveHeight?.sg || !beachData.wavePeriod?.sg || !beachData.windSpeed?.sg) continue;
        await pool.query(
          "INSERT INTO forecasts (beach_id, forecast_time, wave_height, wave_period, wave_direction, wind_speed, wind_direction) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (beach_id, forecast_time) DO UPDATE SET wave_height = EXCLUDED.wave_height, wave_period = EXCLUDED.wave_period, wave_direction = EXCLUDED.wave_direction, wind_speed = EXCLUDED.wind_speed, wind_direction = EXCLUDED.wind_direction, fetched_at = NOW()",
          [
            beach.id,
            beachData.time,
            beachData.waveHeight.sg,
            beachData.wavePeriod.sg,
            beachData.waveDirection?.sg ?? null,
            beachData.windSpeed.sg,
            beachData.windDirection?.sg ?? null,
          ],
        );
      }
    }
  } catch (err) {
    console.error("Failed to fetch or store forecasts data", err);
  }
}

export { fetchAndStoreForecasts };
