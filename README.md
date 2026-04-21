# LIFESAVE — Emergency Blood Donation Network

A real-time blood donation platform that connects patients with nearby donors within a 15km radius using PostGIS geospatial queries.

**🌐 Live:** `https://<your-github-username>.github.io/blood-app/`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (Glassmorphism), JavaScript |
| Styling | Tailwind CSS (CDN), Custom CSS |
| Backend | Supabase (PostgreSQL + PostGIS + Realtime) |
| Geocoding | Geoapify API |
| Hosting | GitHub Pages (static `docs/` folder) |

## Features

- 🔴 **Emergency Blood Requests** — Patients submit requests; nearby donors are found via PostGIS radius search
- 🟢 **Donor Registration** — Donors register with address auto-geocoded to coordinates
- ⚡ **Real-Time Updates** — Supabase Realtime broadcasts when a donor accepts (replaces Socket.io)
- 🗺️ **Navigation** — Google Maps integration guides donors to the patient
- 🛡️ **Security** — Supabase Row Level Security (RLS) protects all data
- 📱 **Responsive** — Premium glassmorphism design works on all devices

## Project Structure

```
blood-app/
├── docs/                      ← GitHub Pages serves from here
│   ├── index.html             ← Blood request page (home)
│   ├── register.html          ← Donor registration page
│   ├── accept.html            ← Donor accept handler (from email link)
│   ├── map-view.html          ← Navigation page (after accept)
│   ├── blood.jpg              ← Background image
│   └── js/
│       ├── config.js          ← Public Supabase + Geoapify keys
│       ├── supabase-client.js ← Browser Supabase client init
│       ├── geocoder.js        ← Browser-side geocoding
│       ├── request-app.js     ← Blood request logic + Realtime
│       ├── register-app.js    ← Donor registration logic
│       └── accept-app.js      ← Accept + redirect logic
├── supabase_migration.sql     ← Database schema (run once)
├── supabase_rls_policies.sql  ← Security policies (run once)
├── .gitignore
└── README.md
```

> **Note:** The `server.js`, `routes/`, `utils/`, `public/`, and `node_modules/` folders are legacy Express server files. They are NOT required for the deployed static site. GitHub Pages only serves the `docs/` folder.

## Deployment Guide

### Prerequisites

1. A [Supabase](https://supabase.com) project with:
   - PostGIS extension enabled
   - `supabase_migration.sql` executed in SQL Editor
   - `supabase_rls_policies.sql` executed in SQL Editor
   - Realtime enabled on the `donors` table (Database → Replication)
2. A [Geoapify](https://www.geoapify.com) API key (free tier)
3. A [GitHub](https://github.com) account

### Step 1: Verify `docs/js/config.js`

Make sure your public keys are set:

```js
const LIFESAVE_CONFIG = {
    SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
    SUPABASE_ANON_KEY: 'your_publishable_anon_key',
    GEOAPIFY_API_KEY: 'your_geoapify_key',
};
```

> These are **publishable** keys. Security is enforced by Supabase RLS policies, not by hiding keys.

### Step 2: Push to GitHub

```bash
cd blood-app
git init
git add .
git commit -m "Initial commit: LIFESAVE static deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/blood-app.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under **Source**, select: **Deploy from a branch**
3. Branch: `main`, Folder: `/docs`
4. Click **Save**
5. Wait 1–2 minutes for deployment

### Step 4: Access Your Live Site

```
https://YOUR_USERNAME.github.io/blood-app/
```

## Security Notes

- `.env` is **never** committed (listed in `.gitignore`)
- The Supabase anon key in `config.js` is a **publishable** key — safe for frontend
- All data access is controlled by **Row Level Security (RLS)** policies
- Email notifications require Supabase Edge Functions (optional)

## License

MIT
