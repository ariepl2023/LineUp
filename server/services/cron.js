import cron from "node-cron";
import { fetchAndStoreForecasts } from "./stormglass.js";
import { checkAndSendAlerts } from "./alerts.js";

// Refresh forecast data every 6 hours. Stormglass's free tier provides ~48h
// of hourly data per request, so fetching 4× a day keeps the DB current
// without burning through the daily API quota.
cron.schedule("0 */6 * * *", () => {
  fetchAndStoreForecasts();
});

// Send daily Telegram digest at 08:00 server time so users see
// the week's good conditions each morning before heading to the beach.
cron.schedule("0 8 * * *", () => {
  checkAndSendAlerts();
});
