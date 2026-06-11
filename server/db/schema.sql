-- ─────────────────────────────────────────────────────────────
-- Schema for WaveTracker
-- Run this file once to initialise the database, then seeds.sql
-- ─────────────────────────────────────────────────────────────

-- Plans
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(6,2) NOT NULL,
    max_beaches INTEGER NOT NULL,
    has_alerts BOOLEAN NOT NULL DEFAULT false,
    description TEXT
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    telegram_chat_id VARCHAR(100),
    plan_id INTEGER REFERENCES plans(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Beaches
CREATE TABLE IF NOT EXISTS beaches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(8,5) NOT NULL,
    longitude DECIMAL(8,5) NOT NULL,
    region VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Forecasts
-- UNIQUE (beach_id, forecast_time) enables ON CONFLICT DO UPDATE so that
-- re-fetching from Stormglass refreshes existing rows instead of duplicating them.
CREATE TABLE IF NOT EXISTS forecasts (
    id SERIAL PRIMARY KEY,
    beach_id INTEGER REFERENCES beaches(id),
    forecast_time TIMESTAMP NOT NULL,
    wave_height DECIMAL(4,2),
    wave_period DECIMAL(4,2),
    wave_direction DECIMAL(5,2),
    wind_speed DECIMAL(4,2),
    wind_direction DECIMAL(5,2),
    fetched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (beach_id, forecast_time)
);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    beach_id INTEGER REFERENCES beaches(id),
    min_wave_height DECIMAL(4,2),
    min_wind_speed DECIMAL(4,2),
    max_wind_speed DECIMAL(4,2),
    alert_time TIME
);