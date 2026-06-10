# WaveTracker — React Native Development Plan

> **Audience:** First-time React Native developer with existing web app experience (React + Express + PostgreSQL).
> **Auth:** Clerk (replaces Passport.js sessions from the web app)
> **App stores:** iOS (App Store) + Android (Google Play)

---

## What You're Building

A mobile version of your existing WaveTracker web app. The mobile app connects to the **same Express + PostgreSQL backend**, but replaces the custom Passport.js auth with **Clerk**, and uses native mobile patterns (bottom tabs, native inputs, push notifications).

**Screens to build:**
| Screen | Description |
|---|---|
| Login / Register | Clerk-powered sign-in & sign-up |
| Dashboard | Current conditions + hourly + 7-day forecast |
| Settings | Beach selector + alert thresholds |
| Plans | Free vs Pro upgrade flow |
| Connect Telegram | Enter Telegram Chat ID |

---

## Tech Stack (Final Decisions)

| Concern | Tool | Why |
|---|---|---|
| Auth | Clerk (`@clerk/expo`) + `<AuthView />` | Fully native pre-built screens (SwiftUI/Compose), JWT tokens, no custom forms |
| Navigation | React Navigation 7 (already installed) | Industry standard, already scaffolded |
| HTTP client | Axios | Already used in the web app — same patterns |
| State | React Context + `useState` | Simple enough to start; you already know it |
| Charts | `victory-native` | Best-supported charting for RN |
| UI components | `react-native-paper` | Material Design, pre-built inputs/buttons/cards |
| Icons | `react-native-vector-icons` | Thousands of icons, easy to use |
| Secure storage | `expo-secure-store` | Store tokens safely (required by Clerk) |

---

## Prerequisites — Do These First

1. **Node.js 20+** installed (`node --version`)
2. **Xcode 16+** installed (Mac App Store) — for iOS simulator
3. **Android Studio** installed — for Android emulator
4. **CocoaPods** installed (`sudo gem install cocoapods`)
5. **A Clerk account** — sign up free at [clerk.com](https://clerk.com)
6. **Expo CLI** — `npm install -g expo`

---

## Phase 0 — Understand Your Web App (Reference)

Before writing any mobile code, map these web app files to their mobile equivalents. You'll reuse the same logic.

| Web app file | What it does | Mobile equivalent |
|---|---|---|
| `client/src/context/AuthContext.jsx` | Tracks logged-in user | Replaced by Clerk's `useUser()` hook |
| `client/src/api/axios.js` | Axios base URL config | Copy to `src/api/client.ts` |
| `client/src/pages/Dashboard.jsx` | Main forecast view | `screens/HomeScreen.tsx` |
| `client/src/pages/Settings.jsx` | Beach + thresholds | `screens/SettingsScreen.tsx` |
| `client/src/pages/Plans.jsx` | Subscription page | `screens/PlansScreen.tsx` |
| `client/src/pages/ConnectTelegram.jsx` | Telegram ID setup | `screens/ConnectTelegramScreen.tsx` |
| `server/routes/auth.js` | Auth endpoints | You will **add Clerk JWT middleware** here |
| `server/routes/forecasts.js` | Forecast API | Call from mobile via Axios |
| `server/routes/preferences.js` | User prefs API | Call from mobile via Axios |

---

## Phase 1 — Backend: Add Clerk JWT Support

> **Why:** Your existing backend uses Passport.js sessions (cookies). Clerk uses JWT tokens. You need to tell your Express server how to verify Clerk tokens instead.
> This is the only backend change needed.

### Step 1.1 — Install Clerk backend SDK

```bash
cd "/Users/arielfominih/Desktop/My Project/wave-tracker/server"
npm install @clerk/express
```

### Step 1.2 — Create a Clerk application

1. Go to [clerk.com](https://clerk.com) → **Create application**
2. Name it "WaveTracker"
3. Enable **Email + Password** sign-in (matches your existing user flow)
4. Copy **Publishable Key** (starts with `pk_test_...`)
5. Copy **Secret Key** (starts with `sk_test_...`)

### Step 1.3 — Add Clerk middleware to Express

In `server/index.js` (or `server/app.js`), add:

```js
// At the top of the file
const { clerkMiddleware, requireAuth } = require('@clerk/express');

// After creating the Express app, BEFORE all routes
app.use(clerkMiddleware());

// Now protect routes like this (replace your old `isAuthenticated` middleware):
// app.get('/forecasts/my-beach', requireAuth(), forecastController.getMyBeach);
```

### Step 1.4 — Replace auth middleware on protected routes

Find every route that uses `isAuthenticated` or `req.isAuthenticated()` and replace with Clerk's `requireAuth()`. In route handlers, replace `req.user.id` with:

```js
const { userId } = req.auth; // Clerk's user ID (a string like "user_abc123")
```

### Step 1.5 — Handle user sync

Clerk assigns each user a unique `userId` (e.g., `user_2abc123`). Your database uses numeric IDs. You need to link them.

**Option A (Simpler — recommended for now):** Add a `clerk_user_id` column to your `users` table:

```sql
ALTER TABLE users ADD COLUMN clerk_user_id VARCHAR(255) UNIQUE;
```

On first authenticated API call from mobile, check if `clerk_user_id` exists; if not, create the user record.

**Option B (Production-grade):** Use Clerk Webhooks to sync user creation/deletion automatically. Set this up after Option A is working.

### Step 1.6 — Add environment variables to server

In your server `.env` file:

```
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

---

## Phase 2 — React Native: Project Setup

### Step 2.1 — Install Clerk for Expo

```bash
cd /Users/arielfominih/Desktop/WaveTracker
npm install @clerk/expo expo-secure-store expo-web-browser
```

> **Important — development build required:** The `<AuthView />` native component uses SwiftUI (iOS) and Jetpack Compose (Android) under the hood. It does **not** work with Expo Go. You must run the app with `npx expo run:ios` or `npx expo run:android`, which builds a real native binary on your machine. This is a one-time setup step.

### Step 2.2 — Install remaining UI and data dependencies

```bash
npm install axios react-native-paper react-native-vector-icons victory-native react-native-svg
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

### Step 2.3 — Set up your project folder structure

```
WaveTracker/
├── src/
│   ├── api/
│   │   └── client.ts          ← Axios instance
│   │   └── forecasts.ts       ← Forecast API calls
│   │   └── preferences.ts     ← Preferences API calls
│   │   └── plans.ts           ← Plans API calls
│   ├── components/
│   │   └── ForecastCard.tsx   ← Reusable forecast display
│   │   └── WeatherIcon.tsx    ← Wave/wind icon component
│   ├── screens/
│   │   └── AuthScreen.tsx     ← Single auth screen using <AuthView />
│   │   └── HomeScreen.tsx
│   │   └── SettingsScreen.tsx
│   │   └── PlansScreen.tsx
│   │   └── ConnectTelegramScreen.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx   ← Main nav (tabs + stack)
│   └── theme/
│       └── colors.ts          ← Your color palette
```

Create the `src/` directories:

```bash
mkdir -p src/api src/components src/navigation src/theme
```

---

## Phase 3 — Clerk Authentication Screens

> Clerk's `<AuthView />` is a **fully native pre-built component** — it renders a complete sign-in + sign-up UI using SwiftUI on iOS and Jetpack Compose on Android. You write zero form code.

### Step 3.1 — Wrap your app with ClerkProvider

Open `App.tsx` and replace its content with:

```tsx
import React from 'react';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import AppNavigator from './src/navigation/AppNavigator';

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

const CLERK_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE'; // replace this

export default function App() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <AppNavigator />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
```

### Step 3.2 — Create the Main App Navigator

Create `src/navigation/AppNavigator.tsx`:

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@clerk/expo';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlansScreen from '../screens/PlansScreen';
import ConnectTelegramScreen from '../screens/ConnectTelegramScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="waves" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="cog" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="star" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isSignedIn ? (
        <Stack.Navigator>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="ConnectTelegram" component={ConnectTelegramScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
```

> **Key concept:** `isSignedIn` from Clerk automatically controls which navigator shows. When the user signs in via `<AuthView />`, Clerk updates `isSignedIn` and the app switches to `MainTabs` — no manual navigation needed.

### Step 3.3 — Create AuthScreen using Clerk's pre-built AuthView

Create `src/screens/AuthScreen.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthView } from '@clerk/expo/native';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <AuthView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

That's it. `<AuthView />` automatically handles:
- Sign-in form (email + password)
- Sign-up form (email + password + email verification OTP)
- "Forgot password" flow
- Switching between sign-in and sign-up
- Error messages and loading states
- Everything controlled by your Clerk Dashboard settings

### Step 3.4 — Run a development build to test

`<AuthView />` does **not** run in Expo Go — it needs a real native build. Run once:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

This compiles the native code and installs the app on your simulator/device. From then on you just use `npx expo start` for live-reload without rebuilding.

> **First run takes 5-10 minutes** — it's compiling Swift and Kotlin code. Subsequent starts are instant.

---

## Phase 4 — API Client Setup

### Step 4.1 — Create Axios client with Clerk auth

Create `src/api/client.ts`:

```ts
import axios from 'axios';
import { useAuth } from '@clerk/expo';

// Your Express server URL — change this to your server's IP/domain
// For local dev: use your computer's local IP, not localhost (simulator can't reach localhost)
// Find your IP with: ifconfig | grep "inet " (on Mac)
export const API_BASE_URL = 'http://192.168.x.x:3001'; // ← replace with your IP

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Call this hook in components to get an authenticated API client
export function useApiClient() {
  const { getToken } = useAuth();

  const authClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

  authClient.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return authClient;
}
```

> **Important for local development:** The iOS/Android simulator cannot reach `localhost` on your Mac. Use your Mac's actual local IP address (e.g., `192.168.1.5`). Run `ifconfig | grep "inet "` in terminal to find it.

### Step 4.2 — Create API service modules

Create `src/api/forecasts.ts`:

```ts
import { AxiosInstance } from 'axios';

export async function getMyBeachForecasts(client: AxiosInstance) {
  const { data } = await client.get('/forecasts/my-beach');
  return data; // array of forecast objects
}

export async function getBeachForecasts(client: AxiosInstance, beachId: number) {
  const { data } = await client.get(`/forecasts/${beachId}`);
  return data;
}
```

Create `src/api/preferences.ts`:

```ts
import { AxiosInstance } from 'axios';

export async function getPreferences(client: AxiosInstance) {
  const { data } = await client.get('/preferences');
  return data;
}

export async function savePreferences(client: AxiosInstance, prefs: {
  beach_id?: number;
  min_wave_height?: number;
  min_wind_speed?: number;
  max_wind_speed?: number;
  alert_time?: string;
}) {
  const { data } = await client.post('/preferences', prefs);
  return data;
}
```

Create `src/api/beaches.ts`:

```ts
import { AxiosInstance } from 'axios';

export async function getBeaches(client: AxiosInstance) {
  const { data } = await client.get('/beaches');
  return data;
}
```

Create `src/api/plans.ts`:

```ts
import { AxiosInstance } from 'axios';

export async function getPlans(client: AxiosInstance) {
  const { data } = await client.get('/plans');
  return data;
}

export async function subscribeToPlan(client: AxiosInstance, planId: number) {
  const { data } = await client.post(`/plans/subscribe/${planId}`);
  return data;
}
```

---

## Phase 5 — HomeScreen (Dashboard)

This is your most complex screen. Build it in layers — first show data, then add charts.

### Step 5.1 — Basic data fetch

Replace `screens/HomeScreen.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { useApiClient } from '../api/client';
import { getMyBeachForecasts } from '../api/forecasts';

type Forecast = {
  id: number;
  forecast_time: string;
  wave_height: number;
  wave_period: number;
  wave_direction: number;
  wind_speed: number;
  wind_direction: number;
};

export default function HomeScreen() {
  const api = useApiClient();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await getMyBeachForecasts(api);
      setForecasts(data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No beach selected. Go to Settings to pick a beach.');
      } else {
        setError('Failed to load forecasts. Check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.error}>{error}</Text>
    </View>
  );

  const now = forecasts[0];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Current conditions */}
      {now && (
        <View style={styles.currentCard}>
          <Text style={styles.currentTitle}>Right Now</Text>
          <Text style={styles.bigStat}>{now.wave_height.toFixed(1)}m</Text>
          <Text style={styles.statLabel}>Wave Height</Text>
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{now.wave_period.toFixed(0)}s</Text>
              <Text style={styles.statLabel}>Period</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{now.wind_speed.toFixed(0)} km/h</Text>
              <Text style={styles.statLabel}>Wind</Text>
            </View>
          </View>
        </View>
      )}

      {/* Hourly list */}
      <Text style={styles.sectionTitle}>Next 24 Hours</Text>
      {forecasts.slice(0, 24).map((f) => (
        <View key={f.id} style={styles.hourRow}>
          <Text style={styles.hourTime}>
            {new Date(f.forecast_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text>{f.wave_height.toFixed(1)}m</Text>
          <Text style={styles.wind}>{f.wind_speed.toFixed(0)} km/h wind</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: 'red', textAlign: 'center' },
  currentCard: { margin: 16, padding: 20, backgroundColor: '#0066cc', borderRadius: 16, alignItems: 'center' },
  currentTitle: { color: 'white', opacity: 0.8, fontSize: 14, marginBottom: 8 },
  bigStat: { color: 'white', fontSize: 64, fontWeight: 'bold' },
  statLabel: { color: 'white', opacity: 0.8, fontSize: 12 },
  row: { flexDirection: 'row', gap: 32, marginTop: 16 },
  stat: { alignItems: 'center' },
  statValue: { color: 'white', fontSize: 20, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, marginTop: 8, marginBottom: 8 },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'white', marginBottom: 1 },
  hourTime: { width: 60, fontWeight: '600' },
  wind: { color: '#666' },
});
```

### Step 5.2 — Add a wave height chart (after Step 5.1 is working)

Install victory-native (if not already done), then add to HomeScreen:

```tsx
import { VictoryChart, VictoryLine, VictoryAxis } from 'victory-native';

// Inside your ScrollView, after the hourly list:
<Text style={styles.sectionTitle}>Wave Height (24h)</Text>
<VictoryChart height={200}>
  <VictoryAxis tickFormat={(t) => new Date(t).getHours() + 'h'} />
  <VictoryAxis dependentAxis />
  <VictoryLine
    data={forecasts.slice(0, 24).map(f => ({
      x: new Date(f.forecast_time).getTime(),
      y: f.wave_height
    }))}
    style={{ data: { stroke: '#0066cc' } }}
  />
</VictoryChart>
```

---

## Phase 6 — SettingsScreen

```tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import RNPickerSelect from '@react-native-picker-select/react-native-picker-select'; // npm install @react-native-picker-select/react-native-picker-select
import { useApiClient } from '../api/client';
import { getBeaches } from '../api/beaches';
import { getPreferences, savePreferences } from '../api/preferences';

export default function SettingsScreen({ navigation }: any) {
  const api = useApiClient();
  const [beaches, setBeaches] = useState([]);
  const [selectedBeach, setSelectedBeach] = useState<number | null>(null);
  const [minWave, setMinWave] = useState('');
  const [minWind, setMinWind] = useState('');
  const [maxWind, setMaxWind] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getBeaches(api), getPreferences(api)]).then(([beachList, prefs]) => {
      setBeaches(beachList);
      if (prefs) {
        setSelectedBeach(prefs.beach_id);
        setMinWave(String(prefs.min_wave_height ?? ''));
        setMinWind(String(prefs.min_wind_speed ?? ''));
        setMaxWind(String(prefs.max_wind_speed ?? ''));
        setIsPro(prefs.user?.plan?.has_alerts ?? false);
      }
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences(api, {
        beach_id: selectedBeach ?? undefined,
        min_wave_height: minWave ? parseFloat(minWave) : undefined,
        min_wind_speed: minWind ? parseFloat(minWind) : undefined,
        max_wind_speed: maxWind ? parseFloat(maxWind) : undefined,
      });
      Alert.alert('Saved', 'Your preferences have been saved.');
    } catch {
      Alert.alert('Error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Beach</Text>
      <RNPickerSelect
        onValueChange={setSelectedBeach}
        value={selectedBeach}
        placeholder={{ label: 'Select a beach...', value: null }}
        items={beaches.map((b: any) => ({ label: b.name, value: b.id }))}
      />

      <Text style={styles.sectionTitle}>Alert Thresholds {!isPro ? '(Pro only)' : ''}</Text>
      <TextInput
        label="Min wave height (m)"
        value={minWave}
        onChangeText={setMinWave}
        keyboardType="decimal-pad"
        disabled={!isPro}
        style={styles.input}
      />
      <TextInput
        label="Min wind speed (km/h)"
        value={minWind}
        onChangeText={setMinWind}
        keyboardType="decimal-pad"
        disabled={!isPro}
        style={styles.input}
      />
      <TextInput
        label="Max wind speed (km/h)"
        value={maxWind}
        onChangeText={setMaxWind}
        keyboardType="decimal-pad"
        disabled={!isPro}
        style={styles.input}
      />

      {!isPro && (
        <Button mode="outlined" onPress={() => navigation.navigate('Plans')} style={styles.upgradeBtn}>
          Upgrade to Pro to unlock alerts
        </Button>
      )}

      <Button mode="contained" onPress={handleSave} loading={saving} style={styles.saveBtn}>
        Save Settings
      </Button>

      <Button onPress={() => navigation.navigate('ConnectTelegram')} style={{ marginTop: 12 }}>
        Connect Telegram
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  input: { marginBottom: 12 },
  upgradeBtn: { marginTop: 12 },
  saveBtn: { marginTop: 24 },
});
```

---

## Phase 7 — PlansScreen

```tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { useApiClient } from '../api/client';
import { getPlans, subscribeToPlan } from '../api/plans';

export default function PlansScreen() {
  const api = useApiClient();
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState<number | null>(null);

  useEffect(() => {
    getPlans(api).then(setPlans).catch(console.error);
    // Fetch user's current plan from preferences or /auth/me
    api.get('/auth/me').then(({ data }) => setCurrentPlanId(data.plan_id)).catch(console.error);
  }, []);

  const handleSubscribe = async (planId: number) => {
    setLoading(planId);
    try {
      await subscribeToPlan(api, planId);
      setCurrentPlanId(planId);
      Alert.alert('Success', 'Plan updated successfully!');
    } catch {
      Alert.alert('Error', 'Failed to update plan.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choose your plan</Text>
      {plans.map((plan) => (
        <Card key={plan.id} style={[styles.card, currentPlanId === plan.id && styles.activePlan]}>
          <Card.Content>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>${plan.price}/month</Text>
            <Text style={styles.planDesc}>{plan.description}</Text>
            {plan.has_alerts && <Text style={styles.feature}>✓ Telegram alerts</Text>}
            {plan.has_alerts && <Text style={styles.feature}>✓ Custom thresholds</Text>}
            {plan.has_alerts && <Text style={styles.feature}>✓ Up to {plan.max_beaches} beaches</Text>}
          </Card.Content>
          <Card.Actions>
            {currentPlanId === plan.id ? (
              <Button disabled>Current plan</Button>
            ) : (
              <Button
                mode="contained"
                loading={loading === plan.id}
                onPress={() => handleSubscribe(plan.id)}
              >
                {plan.price === 0 ? 'Downgrade' : 'Upgrade to Pro'}
              </Button>
            )}
          </Card.Actions>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  card: { marginBottom: 16 },
  activePlan: { borderWidth: 2, borderColor: '#0066cc' },
  planName: { fontSize: 20, fontWeight: 'bold' },
  planPrice: { fontSize: 28, fontWeight: 'bold', color: '#0066cc', marginVertical: 8 },
  planDesc: { color: '#666', marginBottom: 8 },
  feature: { color: '#2d7a2d', marginTop: 4 },
});
```

---

## Phase 8 — ConnectTelegramScreen

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Linking, Alert, ScrollView } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useApiClient } from '../api/client';

export default function ConnectTelegramScreen() {
  const api = useApiClient();
  const [chatId, setChatId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        if (data.telegram_chat_id) {
          setChatId(String(data.telegram_chat_id));
          setIsConnected(true);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!chatId.trim()) return;
    setSaving(true);
    try {
      await api.post('/auth/update-telegram', { telegram_chat_id: chatId.trim() });
      setIsConnected(true);
      Alert.alert('Connected!', 'Your Telegram account is now linked.');
    } catch {
      Alert.alert('Error', 'Failed to save Telegram ID.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Connect Telegram</Text>
      <Text style={styles.step}>Step 1: Open Telegram and find the bot</Text>
      <Button
        mode="outlined"
        icon="send"
        onPress={() => Linking.openURL('https://t.me/wave_tracker_bot')}
        style={styles.telegramBtn}
      >
        Open @wave_tracker_bot
      </Button>
      <Text style={styles.step}>Step 2: Send /start to the bot and copy your Chat ID</Text>
      <Text style={styles.step}>Step 3: Paste your Chat ID below</Text>
      <TextInput
        label="Your Telegram Chat ID"
        value={chatId}
        onChangeText={setChatId}
        keyboardType="number-pad"
        style={styles.input}
      />
      {isConnected && <Text style={styles.connected}>✓ Telegram connected</Text>}
      <Button mode="contained" onPress={handleSave} loading={saving} style={styles.button}>
        Save
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  step: { fontSize: 15, marginBottom: 12, lineHeight: 22 },
  telegramBtn: { marginBottom: 16 },
  input: { marginTop: 8 },
  connected: { color: '#2d7a2d', marginTop: 8, fontWeight: '600' },
  button: { marginTop: 24 },
});
```

---

## Phase 9 — Sign-Out Button

Add a sign-out option to the Settings screen header or add a Profile tab:

```tsx
import { useClerk } from '@clerk/expo';

// Inside any component:
const { signOut } = useClerk();

<Button
  mode="outlined"
  onPress={() => signOut()}
  style={{ marginTop: 32, borderColor: 'red' }}
  textColor="red"
>
  Sign Out
</Button>
```

---

## Phase 10 — Testing on a Real Device

### iOS (physical device)

1. Plug in your iPhone via USB
2. Open Xcode once to trust the device
3. Run: `npx expo run:ios --device`

### Android (physical device)

1. Enable **Developer Options** on your Android phone (tap Build Number 7 times in About Phone)
2. Enable **USB Debugging**
3. Run: `npx expo run:android --device`

### Common issues and fixes

| Problem | Fix |
|---|---|
| `localhost` not reachable | Use your Mac's local IP (`192.168.x.x`) |
| `<AuthView />` shows blank | You're using Expo Go — use `npx expo run:ios` instead |
| iOS build fails | Run `npx expo run:ios` again; it will re-run pod install |
| Clerk token not sent | Check `useAuth()` is inside `<ClerkProvider>` |
| Simulator stuck loading | Press `r` in the Expo terminal to reload |
| Android build fails | Delete `android/.gradle` folder and retry |

---

## Phase 11 — Production Checklist

### Before submitting to app stores

- [ ] Replace `pk_test_` Clerk key with `pk_live_` key (switch Clerk app to Production)
- [ ] Replace your local IP API URL with your server's real domain or IP
- [ ] Set up HTTPS on your Express server (required by App Store)
- [ ] Add app icons (1024x1024 PNG for iOS, adaptive icons for Android)
- [ ] Add a splash screen
- [ ] Set Bundle ID / Application ID to something like `com.yourname.wavetracker`
- [ ] Test on a real physical device (not just simulator)
- [ ] Handle network errors gracefully on every screen

### App Store (iOS)

1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Install EAS CLI: `npm install -g eas-cli` and run `eas login`
3. Configure: `eas build:configure`
4. Build: `eas build --platform ios`
5. Submit: `eas submit --platform ios`

### Google Play (Android)

1. Enroll in [Google Play Console](https://play.google.com/console) ($25 one-time)
2. Build: `eas build --platform android`
3. Submit: `eas submit --platform android`

> **EAS Build** (Expo Application Services) builds your app in the cloud — no Xcode archive steps needed. Free tier available.

---

## Development Order Summary

```
✅ Phase 0  → Web app understood (used as reference)
✅ Phase 1  → Clerk JWT middleware added to Express backend
✅ Phase 2  → Expo project created, all dependencies installed
✅ Phase 3  → Clerk <AuthView /> — sign-in, sign-up, email verification
✅ Phase 4  → Axios client with auto Clerk token injection
✅ Phase 5  → HomeScreen — current conditions + 24h hourly forecast
✅ Phase 6  → SettingsScreen — beach picker + alert thresholds + sign out
✅ Phase 7  → PlansScreen — Free / Pro switching
✅ Phase 8  → ConnectTelegramScreen — 3-step Telegram linking flow
✅ Phase 9  → Sign-out button (in SettingsScreen)
✅ Phase 10 → Tested on real iPhone (built via Xcode → Cmd+R)

⬜ Phase 11 → Production & App Store — items remaining:
    ⬜ 11.1 → Deploy Express server (Railway recommended — free tier)
    ⬜ 11.2 → Switch Clerk from Development (pk_test_) to Production (pk_live_)
    ⬜ 11.3 → Update API_BASE_URL in src/api/client.ts to real server domain
    ⬜ 11.4 → Add app icon (1024x1024 PNG → assets/icon.png)
    ⬜ 11.5 → Set up EAS Build (npm install -g eas-cli → eas build:configure)
    ⬜ 11.6 → Enroll in Apple Developer Program ($99/year)
    ⬜ 11.7 → eas build --platform ios → eas submit --platform ios
```

---

## Helpful Resources

| Topic | Link |
|---|---|
| React Native official docs | https://reactnative.dev/docs/getting-started |
| React Navigation docs | https://reactnavigation.org/docs/getting-started |
| Clerk Expo docs | https://clerk.com/docs/expo/getting-started/quickstart |
| Clerk AuthView component | https://clerk.com/docs/reference/expo/native-components/auth-view |
| React Native Paper components | https://callstack.github.io/react-native-paper/ |
| Victory Native charts | https://formidable.com/open-source/victory/docs/native |
| Stormglass API (your data source) | https://docs.stormglass.io |

---

*Last updated: 2026-06-09 — based on WaveTracker web app (React + Express + PostgreSQL + Stormglass)*
