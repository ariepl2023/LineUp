import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useApiClient } from "../api/client";
import { getMyBeachForecasts } from "../api/forecasts";

type Forecast = {
  id: number;
  forecast_time: string;
  wave_height: number;
  wave_period: number;
  wave_direction: number;
  wind_speed: number;
  wind_direction: number;
};

const WEEK_HOURS = [6, 12, 18];
const SLOT_LABELS: Record<number, string> = {
  6: "בוקר",
  12: "צהריים",
  18: "ערב",
};

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

export default function WeekScreen() {
  const api = useApiClient();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [beachName, setBeachName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const result = await getMyBeachForecasts(api);
      setBeachName(result.beach_name);
      setForecasts(result.forecasts);
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

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toDateString();
  });

  const grouped: Record<string, Forecast[]> = {};
  forecasts.forEach((f) => {
    const d = new Date(f.forecast_time);
    if (days.includes(d.toDateString()) && WEEK_HOURS.includes(d.getHours())) {
      const key = d.toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    }
  });

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
          tintColor="#00d4ff"
        />
      }
    >
      <Text style={styles.beachLabel}>תחזית שבועית</Text>
      <Text style={styles.beachName}>{beachName}</Text>

      {days.map((day) => {
        const slots = grouped[day] || [];
        const date = new Date(day);
        const isToday = date.toDateString() === new Date().toDateString();
        const dayLabel = date.toLocaleDateString("he-IL", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });

        return (
          <View key={day} style={[styles.dayCard, isToday && styles.todayCard]}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                {dayLabel}
              </Text>
              {isToday && <Text style={styles.todayBadge}>היום</Text>}
            </View>
            <View style={styles.daySlots}>
              {WEEK_HOURS.map((hour) => {
                const slot = slots.find(
                  (f) => new Date(f.forecast_time).getHours() === hour,
                );
                return (
                  <View key={hour} style={styles.slot}>
                    <Text style={styles.slotHourLabel}>
                      {SLOT_LABELS[hour]}
                    </Text>
                    {slot ? (
                      <>
                        <Text style={styles.slotWave}>
                          {Number(slot.wave_height).toFixed(1)}
                          <Text style={styles.slotWaveUnit}>מ׳</Text>
                        </Text>
                        <Text style={styles.slotWind}>
                          {(slot.wind_speed * 3.6).toFixed(0)} קמ"ש
                        </Text>
                        <Text style={styles.slotDesc}>
                          {waveDescription(Number(slot.wave_height))}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.slotEmpty}>—</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e0f7fa" },
  scrollContent: { padding: 16, paddingBottom: 32 },
  center: { justifyContent: "center", alignItems: "center" },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
    fontSize: 16,
    padding: 24,
  },

  beachLabel: {
    textAlign: "center",
    color: "#00838f",
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 1,
  },
  beachName: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#004d5e",
    marginBottom: 20,
  },

  dayCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#00bcd4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  todayCard: {
    backgroundColor: "#b2ebf2",
    shadowColor: "#00acc1",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  dayLabel: { color: "#004d5e", fontWeight: "700", fontSize: 15 },
  todayLabel: { color: "#00696f" },
  todayBadge: {
    backgroundColor: "#00acc1",
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    letterSpacing: 0.5,
  },

  daySlots: { flexDirection: "row-reverse" },
  slot: { flex: 1, alignItems: "center", gap: 4 },
  slotHourLabel: {
    color: "#00838f",
    fontSize: 10,
    marginBottom: 4,
    fontWeight: "600",
  },
  slotEmpty: { color: "#b2dfdb", fontSize: 18 },
  slotWave: { color: "#00acc1", fontSize: 20, fontWeight: "700" },
  slotWaveUnit: { fontSize: 13, fontWeight: "400" },
  slotWind: { color: "#4db6c4", fontSize: 11 },
  slotDesc: { color: "#004d5e", fontSize: 11, fontWeight: "600" },
});
