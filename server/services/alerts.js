import pool from "../db/pool.js";
import bot from "./telegram.js";

// Groups a flat list of hour strings into morning / noon / evening ranges
// and returns a formatted Hebrew string for the Telegram message.
// e.g. ["06:00","07:00","14:00"] → "🌅 בוקר: 06:00 - 07:00\n☀️ צהריים: 14:00\n"
function categorizeHours(hours) {
  const nums = [...new Set(hours.map((h) => parseInt(h)))].sort(
    (a, b) => a - b,
  );

  const morning = nums.filter((h) => h >= 6 && h < 12);
  const noon = nums.filter((h) => h >= 12 && h < 17);
  const evening = nums.filter((h) => h >= 17 && h < 20);

  function toRange(arr) {
    if (arr.length === 0) return "";
    const start = `${String(arr[0]).padStart(2, "0")}:00`;
    const end = `${String(arr[arr.length - 1]).padStart(2, "0")}:00`;
    return start === end ? start : `${start} - ${end}`;
  }

  let result = "";
  if (morning.length) result += `  🌅 בוקר: ${toRange(morning)}\n`;
  if (noon.length) result += `  ☀️ צהריים: ${toRange(noon)}\n`;
  if (evening.length) result += `  🌆 ערב: ${toRange(evening)}\n`;

  return result;
}

const IL_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// Forecasts are stored in UTC. getHours() uses server local time, which may
// differ from Israel time. Converting via toLocaleString keeps day/hour correct
// for users in the Asia/Jerusalem timezone (UTC+2/+3 depending on DST).
function toIsraelDate(date) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
}

// Runs once per day (via cron). Queries every Pro subscriber's upcoming
// forecasts and sends a Telegram digest only for time slots where ALL of
// the user's configured conditions are satisfied.
// Each condition is optional — a null value means "don't care about this metric".
async function checkAndSendAlerts() {
  try {
    const result = await pool.query(`
            SELECT
                users.telegram_chat_id,
                user_preferences.min_wave_height,
                user_preferences.min_wind_speed,
                user_preferences.max_wind_speed,
                forecasts.forecast_time,
                forecasts.wave_height,
                forecasts.wind_speed,
                forecasts.beach_id,
                beaches.name as beach_name
            FROM users
            INNER JOIN user_preferences ON users.id = user_preferences.user_id
            INNER JOIN forecasts ON user_preferences.beach_id = forecasts.beach_id
            INNER JOIN beaches ON forecasts.beach_id = beaches.id
            INNER JOIN plans ON users.plan_id = plans.id
            WHERE users.telegram_chat_id IS NOT NULL
            AND plans.has_alerts = true
            AND (
                user_preferences.min_wave_height IS NOT NULL OR
                user_preferences.min_wind_speed IS NOT NULL OR
                user_preferences.max_wind_speed IS NOT NULL
            )
            AND forecasts.forecast_time >= NOW()
            ORDER BY forecasts.forecast_time ASC
        `);

    // Group matching hours by (user, beach) so we send one message per user per beach
    const alertsMap = {};

    for (const row of result.rows) {
      // Stormglass stores wind speed in m/s; convert to km/h for comparison
      const windSpeedKmh = parseFloat((row.wind_speed * 3.6).toFixed(1));

      // Each condition only applies when the user has actually configured it
      const waveOk = row.min_wave_height == null || row.wave_height >= parseFloat(row.min_wave_height);
      const windMinOk = row.min_wind_speed == null || windSpeedKmh >= parseFloat(row.min_wind_speed);
      const windMaxOk = row.max_wind_speed == null || windSpeedKmh <= parseFloat(row.max_wind_speed);

      if (waveOk && windMinOk && windMaxOk) {
        const key = `${row.telegram_chat_id}_${row.beach_id}`;
        const ilDate = toIsraelDate(new Date(row.forecast_time));
        const dayName = `יום ${IL_DAYS[ilDate.getDay()]}`;
        const hour = `${String(ilDate.getHours()).padStart(2, "0")}:00`;

        if (!alertsMap[key]) {
          alertsMap[key] = {
            chatId: row.telegram_chat_id,
            beachId: row.beach_id,
            beachName: row.beach_name,
            days: {},
          };
        }

        if (!alertsMap[key].days[dayName]) {
          alertsMap[key].days[dayName] = [];
        }

        if (!alertsMap[key].days[dayName].includes(hour)) {
          alertsMap[key].days[dayName].push(hour);
        }
      }
    }

    for (const key of Object.keys(alertsMap)) {
      const alert = alertsMap[key];
      let message = `🏄 תנאים טובים השבוע בחוף ${alert.beachName}:\n\n`;
      for (const [day, hours] of Object.entries(alert.days)) {
        message += `${day}:\n${categorizeHours(hours)}`;
      }

      await bot.sendMessage(alert.chatId, message);
    }
  } catch (err) {
    console.error("Failed to send alerts:", err);
  }
}

export { checkAndSendAlerts };
