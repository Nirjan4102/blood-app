/**
 * LIFESAVE — Supabase Browser Client
 * Initializes the Supabase client using the CDN-loaded library.
 * Depends on: config.js (must be loaded first), supabase-js CDN script
 */
const supabaseClient = window.supabase.createClient(
    LIFESAVE_CONFIG.SUPABASE_URL,
    LIFESAVE_CONFIG.SUPABASE_ANON_KEY
);
