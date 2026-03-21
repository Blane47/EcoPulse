# Building EcoPulse: A Smart Waste Management Platform for African Cities

*How I built a full-stack, multi-app waste management system for Buea, Cameroon using React, React Native, Node.js, and MongoDB*

---

Waste management in many African cities is broken. In Buea, Cameroon --- a fast-growing university town at the foot of Mount Cameroon --- overflowing bins sit uncollected for days, residents have no way to report issues, and supervisors manage operations through phone calls and paper logs.

I decided to build something about it.

**EcoPulse** is a smart waste management platform that connects three key groups --- city administrators, waste collectors, and community members --- through a shared real-time system. It's not a concept. It's a working platform with a web dashboard, two mobile apps, and a backend API, all built from scratch.

Here's how I did it, what I learned, and what's next.

---

## The Problem

Buea is divided into zones --- Molyko, Bonduma, Great Soppo, and Buea Town. Each zone has dozens of waste bins that need regular collection. The challenges are real:

- **No visibility.** Administrators don't know which bins are full until residents complain.
- **Inefficient routes.** Collectors drive fixed routes regardless of which bins actually need attention.
- **No community voice.** Residents have no way to report overflowing bins or missed collections.
- **Zero accountability.** There's no record of when bins were collected, by whom, or how often.

EcoPulse solves all four.

---

## The Architecture

EcoPulse is a three-app ecosystem connected through a single REST API:

```
                    +------------------+
                    |   MongoDB Atlas  |
                    +--------+---------+
                             |
                    +--------+---------+
                    |  Node.js + Express |
                    |    REST API        |
                    +--------+---------+
                             |
          +------------------+------------------+
          |                  |                  |
  +-------+-------+  +------+------+  +--------+-------+
  | Admin Dashboard|  | Collector   |  | Community      |
  | (React + Vite) |  | App (Expo)  |  | App (Expo)     |
  +----------------+  +-------------+  +----------------+
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Admin Dashboard | React 19, Vite, TailwindCSS, Recharts, Leaflet |
| Collector App | React Native (Expo SDK 55), React Navigation 7 |
| Community App | React Native (Expo SDK 55), Bilingual (EN/FR) |
| Backend | Node.js, Express, MongoDB, JWT Auth |
| Maps | OpenStreetMap + Leaflet (free, no API key) |
| Location | expo-location with GPS verification |

---

## App 1: The Admin Dashboard

The web dashboard is the command center. Built with React and TailwindCSS, it gives city administrators a bird's-eye view of the entire waste management operation.

**[Screenshot: Admin Dashboard Overview]**

### Key Features

- **Real-time bin monitoring** --- Every bin in the city is displayed on an interactive Leaflet map, color-coded by status (green for optimal, orange for warning, red for critical).
- **Collector management** --- View all 6 field collectors, their zones, truck assignments, efficiency scores, and current status.
- **Analytics and reporting** --- Recharts-powered graphs showing collection trends, zone performance, and response times.
- **Community reports** --- A feed of citizen-submitted reports with location data, photos, and status tracking.
- **Role-based access** --- Three tiers: City Administrator, Field Collector, and Viewer, each with different permissions.

The design uses a dark sidebar navigation with a clean white content area. Cards use subtle shadows and rounded corners. The accent green (#22c55e) runs through the entire design system, giving it a consistent environmental identity.

---

## App 2: The Collector App

This is where the real work happens. The collector app is a React Native (Expo) application designed for field workers who are out collecting waste every day.

**[Screenshot: Collector Login Screen]**

### Authentication

Collectors don't use email and password. They log in with their **phone number and a 6-digit PIN** --- faster, simpler, and better suited for field workers who need quick access. The login screen features a custom number pad, PIN dot indicators, and a dark themed UI with the EcoPulse branding.

**[Screenshot: Collector Home Screen]**

### Home Screen

When a collector opens the app, they immediately see:
- Their name and duty status ("ON DUTY --- MOLYKO ZONE")
- Today's numbers: bins assigned (32), collected (8), remaining (24)
- A progress bar showing daily completion percentage
- A priority list of bins sorted by fill level, with the most critical ones at the top

### Route & Map

**[Screenshot: Route Screen]**

The route screen shows all assigned bins with distance markers, fill levels, and one-tap navigation. Each bin card displays its ID (e.g., BIN-001), location name, how far away it is, and a color-coded status badge.

The map screen uses **OpenStreetMap via Leaflet rendered in a WebView** --- completely free, no API key required. Bins appear as colored circle markers. Tapping a marker opens a bottom sheet with bin details, a capacity bar, and two action buttons: **Navigate** (opens turn-by-turn directions in Google Maps or Apple Maps) and **Mark Collected**.

### GPS-Verified Collection

This is one of the features I'm most proud of. When a collector marks a bin as collected, the system:

1. Gets the collector's GPS coordinates
2. Calculates distance to the bin using the Haversine formula
3. Rejects the collection if the collector is more than **100 meters away** (prevents false reports)
4. Opens the camera to capture a photo as proof
5. Sends everything --- coordinates, timestamp, and photo --- to the server

No more fake collection reports. You have to physically be at the bin.

### Profile & Avatar

**[Screenshot: Profile Screen]**

Collectors can upload a profile picture directly from their phone's gallery. The profile screen shows their performance stats --- bins this month, average response time, efficiency score (rendered as an animated SVG circle), and a featured collection card.

---

## App 3: The Community App

The community app puts power in residents' hands. Built with React Native and supporting **English and French** (critical for Cameroon), it lets citizens participate in keeping their zones clean.

**[Screenshot: Community Home Screen]**

### Key Features

- **Zone dashboard** --- Select your zone and see its health: total bins, critical bins, and overall health percentage.
- **Next collection countdown** --- A banner showing when the next pickup is scheduled (e.g., "Tomorrow 7:00 AM").
- **Report a bin** --- Citizens can report overflowing or damaged bins with a photo and description. Reports go directly to the admin dashboard.
- **Nearby bins map** --- See all bins near your current location with real-time status.
- **Collection schedule** --- Zone-specific timetables showing collection days and times for different waste types (General, Recyclable, Organic).

---

## The Backend

The server is a straightforward Node.js + Express API connected to MongoDB Atlas. Here's the data model:

```
User (admins)
Collector (field staff - name, phone, PIN, truck, zone, avatar, efficiency)
Bin (location, coordinates, fill level, status, assigned collector, type)
Schedule (zone, day, time, waste type)
Report (citizen submissions with photos and location)
Activity (collection audit log)
```

### API Design

All routes are prefixed with `/api/` and protected with JWT authentication:

- `POST /auth/collector-login` --- Phone + PIN auth for collectors
- `GET /bins` --- List all bins (filterable by zone and status)
- `POST /bins/:id/collect` --- GPS-verified collection with photo proof
- `PUT /collectors/me/avatar` --- Profile picture upload (base64)
- `GET /collectors/me/route` --- Get assigned bins sorted by priority
- `POST /reports` --- Submit a community report
- `GET /schedule` --- Zone-specific collection timetables

The server binds on `0.0.0.0` to accept connections from both the web dashboard and mobile emulators. JSON body parsing is set to 10MB to handle base64 photo uploads.

---

## Technical Challenges & Solutions

### 1. Free Maps Without Google

Google Maps requires a billing account with a real credit card. For a student project in Cameroon, that's not always possible. I switched to **OpenStreetMap tiles rendered through Leaflet.js inside a React Native WebView**. It's completely free, looks great, and supports markers, popups, and click events --- all communicating with the React Native layer through `postMessage`.

### 2. Android Emulator Networking

The Android emulator can't reach `localhost` on the host machine. The solution: use `10.0.2.2` as the API base URL (Android's alias for the host's loopback) and bind the Express server to `0.0.0.0` instead of the default `localhost`.

### 3. GPS Testing in the Emulator

The GPS-verified collection feature needs real coordinates. In Android Studio, you set the emulator's location through Extended Controls > Location. I configured it to Buea's coordinates (4.1548, 9.2985) so the proximity check works during development.

### 4. Base64 Image Handling

Profile photos and collection evidence are captured via `expo-image-picker`, compressed to 60% quality, converted to base64, and stored directly in MongoDB. It's not the most scalable approach (a CDN would be better for production), but it works without any external file storage service.

---

## Design Philosophy

Every screen in EcoPulse follows a consistent design language:

- **Color system:** Accent green (#22c55e) for positive actions, red (#ef4444) for critical alerts, orange (#f59e0b) for warnings
- **Glassmorphic cards:** Semi-transparent backgrounds with subtle borders and shadows
- **Gradient backgrounds:** Smooth gradients on key screens (login, home, profile) to create depth
- **Rounded everything:** Cards (16px radius), buttons (14px), avatars (full circle), even the logo uses rounded edges
- **Custom assets:** The login screen uses a Canva-designed Sign In button, custom background images, and a branded logo throughout all three apps

---

## Sample Data

The system ships with realistic seed data for Buea:

- **4 zones:** Molyko, Bonduma, Great Soppo, Buea Town
- **10 bins** with real GPS coordinates across the city
- **6 collectors** with truck assignments and performance metrics
- **12 weekly collection schedules** (3 per zone)
- **Sample reports** from community members

---

## What I Learned

1. **Start with the data model.** Getting the MongoDB schemas right early saved me from endless refactoring.
2. **Build the API first.** Having a working backend with seed data made frontend development much faster.
3. **Design for the user.** Collectors need big buttons and quick actions. Admins need data density. Citizens need simplicity. One design doesn't fit all.
4. **Free tools are enough.** OpenStreetMap, MongoDB Atlas free tier, Expo --- you can build a production-quality system without spending a dollar.
5. **Test on real scenarios.** Setting the emulator to Buea's coordinates and testing the GPS verification caught bugs that unit tests wouldn't.

---

## What's Next

- **Push notifications** for critical bin alerts
- **Offline mode** for collectors in areas with poor connectivity
- **Analytics dashboard** with predictive fill-level forecasting
- **Multi-language expansion** beyond English and French
- **Deployment** to Google Play Store and a hosted web dashboard

---

## Try It Yourself

The full source code is available on GitHub:

**GitHub:** https://github.com/Blane47/EcoPulse

The repository contains:
- `/client` --- Admin dashboard (React + Vite)
- `/collector` --- Collector mobile app (Expo)
- `/community` --- Community mobile app (Expo)
- `/server` --- Backend API (Node.js + Express + MongoDB)

---

*EcoPulse started as a project to solve a real problem I see every day in Buea. Waste management isn't glamorous, but it's one of the most impactful things technology can improve in growing African cities. If you're building for your community, start with what frustrates you --- chances are, it frustrates everyone else too.*

---

**Tags:** #React #ReactNative #NodeJS #MongoDB #WasteManagement #Africa #Cameroon #FullStack #MobileApp #OpenSource
