import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApiClient } from "../api/client";
import { getMyBeachForecasts } from "../api/forecasts";
import { getPreferences } from "../api/preferences";

type Forecast = {
  id: number;
  forecast_time: string;
  wave_height: number;
  wave_period: number;
  wave_direction: number;
  wind_speed: number;
  wind_direction: number;
};

type Prefs = {
  min_wave_height?: number;
  max_wind_speed?: number;
};

type Period = { label: string; from: number; to: number; isNight: boolean };
const PERIODS: Period[] = [
  { label: "לילה", from: 0, to: 5, isNight: true },
  { label: "בוקר", from: 6, to: 11, isNight: false },
  { label: "צהריים", from: 12, to: 15, isNight: false },
  { label: "אחר הצהריים", from: 16, to: 19, isNight: false },
  { label: "לילה", from: 20, to: 23, isNight: true },
];

function degToDirection(deg: number | null): string {
  if (deg == null) return "-";
  const dirs = [
    "צפון",
    "צפון-מזרח",
    "מזרח",
    "דרום-מזרח",
    "דרום",
    "דרום-מערב",
    "מערב",
    "צפון-מערב",
  ];
  return dirs[Math.round(deg / 45) % 8];
}

function waveDescription(h: number): string {
  if (h < 0.2) return "שטוח";
  if (h < 0.4) return "נמוך מאוד";
  if (h < 0.6) return "נמוך";
  if (h < 0.8) return "טוב";
  if (h < 1.0) return "מעולה";
  if (h < 1.3) return "גבוה";
  if (h < 1.7) return "גבוה מאוד";
  return "סערה";
}

function getBestWindow(slots: Forecast[], prefs: Prefs): string | null {
  if (slots.length === 0 || (!prefs.min_wave_height && !prefs.max_wind_speed))
    return null;

  const minWave = prefs.min_wave_height ?? 0;
  const maxWind = prefs.max_wind_speed ?? Infinity;

  const isGood = (f: Forecast) =>
    Number(f.wave_height) >= minWave && f.wind_speed * 3.6 <= maxWind;

  let bestStart = -1,
    bestLen = 0;
  let curStart = -1,
    curLen = 0;

  slots.forEach((f, i) => {
    if (isGood(f)) {
      if (curStart === -1) {
        curStart = i;
        curLen = 1;
      } else curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  });

  if (bestLen === 0) return null;

  const sh = new Date(slots[bestStart].forecast_time).getHours();
  const eh = new Date(slots[bestStart + bestLen - 1].forecast_time).getHours();
  return `${String(sh).padStart(2, "0")}:00 – ${String(eh).padStart(2, "0")}:00`;
}

// wind_direction = direction wind comes FROM; arrow shows where it blows TO (+180°)
// Wrapped in View so rotation applies reliably (Ionicons is a text/font node)
function WindArrow({ direction }: { direction: number | null }) {
  const deg = (Number(direction ?? 0) + 180) % 360;
  return (
    <View style={{ transform: [{ rotate: `${deg}deg` }] }}>
      <Ionicons name="arrow-up" size={24} color="#00838f" />
    </View>
  );
}

export default function HomeScreen() {
  const api = useApiClient();
  const [beachName, setBeachName] = useState("");
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [result, prefData] = await Promise.all([
        getMyBeachForecasts(api),
        getPreferences(api).catch(() => ({})),
      ]);
      setBeachName(result.beach_name);
      setForecasts(result.forecasts);
      setPrefs(prefData || {});
      setError("");
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("לא נבחר חוף. עבור להגדרות לבחירת חוף.");
      } else {
        setError("שגיאה בטעינת הנתונים. האם השרת פועל?");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#00bcd4" />
      </View>
    );

  if (error)
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  const now = forecasts[0];
  const today = new Date().toDateString();
  const todaySlots = forecasts.filter(
    (f) => new Date(f.forecast_time).toDateString() === today,
  );
  const bestWindow = getBestWindow(todaySlots, prefs);
  const hasPrefs = !!(prefs.min_wave_height || prefs.max_wind_speed);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor="#00bcd4"
        />
      }
    >
      <Text style={styles.beachLabel}>תחזית גלים</Text>
      <Text style={styles.beachName}>{beachName}</Text>

      {/* Section 1: Current Conditions */}
      {now && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>עכשיו</Text>
          <Text style={styles.bigWave}>
            {Number(now.wave_height).toFixed(1)}
            <Text style={styles.bigWaveUnit}> מ׳</Text>
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {(now.wind_speed * 3.6).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>קמ"ש</Text>
            </View>
            <View style={styles.stat}>
              <WindArrow direction={now.wind_direction} />
              <Text style={styles.statLabel}>
                {degToDirection(now.wind_direction)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {Number(now.wave_period).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>שנ׳ מחזור</Text>
            </View>
          </View>
        </View>
      )}

      {/* Section 2: Best Time Today */}
      <View style={[styles.card, styles.bestCard]}>
        <Text style={styles.cardLabel}>הזמן הכי טוב היום</Text>
        {!hasPrefs ? (
          <Text style={styles.bestEmpty}>
            הגדר תנאים בהגדרות כדי לראות את הזמן הטוב ביותר
          </Text>
        ) : bestWindow ? (
          <Text style={styles.bestTime}>{bestWindow} 🌊</Text>
        ) : (
          <Text style={styles.bestEmpty}>אין תנאים מתאימים להיום</Text>
        )}
      </View>

      {/* Section 3: Today's Forecast — grouped by period */}
      <Text style={styles.sectionTitle}>תחזית היום</Text>
      {PERIODS.map((period) => {
        const slots = todaySlots.filter((f) => {
          const h = new Date(f.forecast_time).getHours();
          return h >= period.from && h <= period.to;
        });
        if (slots.length === 0) return null;
        return (
          <View key={period.label + period.from} style={styles.periodGroup}>
            <View
              style={[
                styles.periodHeader,
                period.isNight && styles.periodHeaderNight,
              ]}
            >
              <Text
                style={[
                  styles.periodLabel,
                  period.isNight && styles.periodLabelNight,
                ]}
              >
                {period.isNight ? " " : ""}
                {period.label}
              </Text>
            </View>
            {slots.map((f) => {
              const h = Number(f.wave_height);
              return (
                <View
                  key={f.id}
                  style={[
                    styles.forecastRow,
                    period.isNight && styles.forecastRowNight,
                  ]}
                >
                  <Text
                    style={[
                      styles.rowHour,
                      period.isNight && styles.rowHourNight,
                    ]}
                  >
                    {String(new Date(f.forecast_time).getHours()).padStart(
                      2,
                      "0",
                    )}
                    :00
                  </Text>
                  <Text style={styles.rowWind}>
                    {(f.wind_speed * 3.6).toFixed(0)} קמ"ש
                  </Text>
                  <Text style={styles.rowDesc}>{waveDescription(h)}</Text>
                  <Text
                    style={[
                      styles.rowWave,
                      period.isNight && styles.rowWaveNight,
                    ]}
                  >
                    {h.toFixed(1)}
                    <Text style={styles.rowWaveUnit}>מ׳</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e0f7fa" },
  scrollContent: { paddingBottom: 32 },
  center: { justifyContent: "center", alignItems: "center" },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    padding: 24,
  },

  beachLabel: {
    textAlign: "center",
    color: "#00838f",
    fontSize: 12,
    marginTop: 20,
    letterSpacing: 1,
  },
  beachName: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: "#004d5e",
    marginBottom: 16,
    marginTop: 4,
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#00bcd4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  bestCard: {
    backgroundColor: "#b2ebf2",
    shadowColor: "#00acc1",
  },
  cardLabel: {
    color: "#00838f",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
    fontWeight: "600",
  },

  bigWave: {
    color: "#00838f",
    fontSize: 68,
    fontWeight: "bold",
    lineHeight: 72,
  },
  bigWaveUnit: { fontSize: 22, fontWeight: "400" },

  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginTop: 16,
    justifyContent: "center",
  },
  stat: { alignItems: "center", gap: 4 },
  statValue: { color: "#004d5e", fontSize: 20, fontWeight: "700" },
  statLabel: { color: "#00838f", fontSize: 11 },

  bestTime: {
    color: "#00696f",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 4,
  },
  bestEmpty: {
    color: "#4db6c4",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },

  sectionTitle: {
    color: "#00838f",
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  periodGroup: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#00bcd4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  periodHeader: {
    backgroundColor: "#e0f2f1",
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  periodHeaderNight: {
    backgroundColor: "#c5cae9",
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00696f",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  periodLabelNight: {
    color: "#3949ab",
  },

  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f4f8",
  },
  forecastRowNight: {
    backgroundColor: "#eef0fb",
  },
  rowHour: { width: 52, fontSize: 13, fontWeight: "700", color: "#00838f" },
  rowHourNight: { color: "#3949ab" },
  rowWind: { flex: 1, fontSize: 12, color: "#4db6c4" },
  rowDesc: {
    width: 68,
    fontSize: 12,
    fontWeight: "700",
    color: "#004d5e",
    textAlign: "center",
  },
  rowWave: {
    width: 72,
    fontSize: 20,
    fontWeight: "800",
    color: "#00acc1",
    textAlign: "right",
  },
  rowWaveNight: { color: "#5c6bc0" },
  rowWaveUnit: { fontSize: 13, fontWeight: "400" },
});
