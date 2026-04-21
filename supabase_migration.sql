-- ============================================================
-- LIFESAVE Blood Donation App — Supabase Migration
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Enable PostGIS extension (required for 15km radius search)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create donors table
CREATE TABLE IF NOT EXISTS donors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    blood_group TEXT NOT NULL,
    last_donation_date TIMESTAMPTZ DEFAULT NULL,
    village TEXT,
    post TEXT,
    district TEXT,
    state TEXT DEFAULT 'West Bengal',
    location GEOGRAPHY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    village TEXT,
    post TEXT,
    district TEXT,
    state TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Fulfilled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create spatial indexes for fast geospatial queries
CREATE INDEX IF NOT EXISTS donors_location_idx ON donors USING GIST (location);
CREATE INDEX IF NOT EXISTS requests_location_idx ON requests USING GIST (location);

-- 5. RPC function: Find eligible donors within a radius
--    Replaces MongoDB's $near + $maxDistance + 90-day cooldown filter
CREATE OR REPLACE FUNCTION find_nearby_donors(
    search_blood_group TEXT,
    search_lng FLOAT,
    search_lat FLOAT,
    max_distance_meters INT DEFAULT 15000,
    min_days_since_donation INT DEFAULT 90
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    mobile TEXT,
    email TEXT,
    blood_group TEXT,
    last_donation_date TIMESTAMPTZ,
    village TEXT,
    post TEXT,
    district TEXT,
    state TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id, d.name, d.mobile, d.email, d.blood_group,
        d.last_donation_date, d.village, d.post, d.district,
        d.state, d.created_at
    FROM donors d
    WHERE d.blood_group = search_blood_group
      AND (
          d.last_donation_date IS NULL
          OR d.last_donation_date < NOW() - (min_days_since_donation || ' days')::INTERVAL
      )
      AND ST_DWithin(
          d.location,
          ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
          max_distance_meters
      );
END;
$$ LANGUAGE plpgsql;
