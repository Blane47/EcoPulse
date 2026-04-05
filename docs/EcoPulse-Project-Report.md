# EcoPulse: Smart Waste Management Platform for Buea Municipality

## A Full-Stack Multi-Application System for Optimizing Urban Waste Collection

---

**Project Title:** EcoPulse - Smart Waste Management Platform

**Author:** Blane

**Institution:** [Your Institution]

**Supervisor:** [Supervisor Name]

**Date:** March 2026

**Version:** 1.0 (Living Document - Updated as development progresses)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Literature Review](#4-literature-review)
5. [System Analysis](#5-system-analysis)
6. [System Design](#6-system-design)
7. [Implementation](#7-implementation)
8. [Collection Schedule System](#8-collection-schedule-system)
9. [Testing](#9-testing)
10. [Challenges and Solutions](#10-challenges-and-solutions)
11. [Results and Discussion](#11-results-and-discussion)
12. [Future Work](#12-future-work)
13. [Conclusion](#13-conclusion)
14. [References](#14-references)
15. [Appendices](#15-appendices)

---

## 1. Introduction

### 1.1 Background

Waste management is one of the most pressing urban challenges facing rapidly growing cities in Sub-Saharan Africa. The United Nations estimates that Africa's urban population will double by 2050, intensifying pressure on already strained municipal services. In Cameroon, the situation is particularly acute in secondary cities like Buea, where infrastructure development has not kept pace with population growth.

Buea, located at the foot of Mount Cameroon in the South West Region of Cameroon, is home to the University of Buea and a growing tech community. With an estimated population exceeding 150,000, the municipality faces significant challenges in maintaining clean streets, timely waste collection, and effective communication between waste management authorities and residents.

### 1.2 Context

The current waste management system in Buea relies heavily on manual processes:
- Paper-based scheduling and routing for waste collectors
- Phone calls as the primary communication channel between supervisors and field workers
- No mechanism for residents to report issues or receive updates
- Limited data collection for performance monitoring and route optimization

EcoPulse was conceived as a technology-driven solution to bridge these gaps by connecting three key stakeholder groups through a shared digital platform.

### 1.3 Scope

EcoPulse is a full-stack, multi-application platform consisting of:
- **Admin Dashboard** (Web Application) - For city administrators and supervisors
- **Collector App** (Mobile Application) - For field waste collection workers
- **Community App** (Mobile Application) - For residents and community members
- **Backend API** (Server) - Shared REST API connecting all three applications

The system covers four zones within Buea Municipality: Molyko, Bonduma, Great Soppo, and Buea Town.

---

## 2. Problem Statement

### 2.1 Core Problem

Buea Municipality lacks an integrated digital system for managing waste collection operations, resulting in:

1. **Operational Inefficiency** - Collectors follow fixed routes regardless of actual bin fill levels, leading to unnecessary trips to empty bins and missed collections at full ones.

2. **Communication Gaps** - No real-time communication channel exists between administrators, collectors, and community members. Issues are reported through phone calls, which are slow and difficult to track.

3. **Lack of Accountability** - There is no digital record of when bins were collected, by whom, or whether collection was actually performed at the reported location.

4. **Community Exclusion** - Residents have no formal mechanism to report overflowing bins, missed collections, or damaged infrastructure.

5. **Data Deficiency** - Administrators make decisions based on anecdotal evidence rather than data, with no historical records for trend analysis or resource planning.

### 2.2 Impact

These problems lead to:
- Overflowing bins in high-traffic areas (markets, university campus)
- Health hazards from uncollected waste
- Low community trust in municipal waste services
- Inefficient use of limited municipal resources (trucks, fuel, personnel)
- Environmental degradation in an ecologically sensitive area (proximity to Mount Cameroon)

---

## 3. Objectives

### 3.1 General Objective

To design and develop a full-stack smart waste management platform that digitalizes and optimizes waste collection operations in Buea Municipality.

### 3.2 Specific Objectives

1. **Develop a web-based admin dashboard** that provides real-time monitoring of bin statuses, collector performance, and community reports.

2. **Develop a mobile application for waste collectors** that provides optimized route information, GPS-verified collection confirmation, and direct communication with supervisors.

3. **Develop a mobile application for community members** that enables residents to view collection schedules, report bin issues with photographic evidence, and communicate with administrators.

4. **Implement a GPS-verification system** that ensures collection reports are authentic by verifying the collector's proximity to the bin (within 100 meters).

5. **Design a zone-based scheduling system** that organizes collections by geographic zones with specific days and waste types.

6. **Enable real-time communication** between all stakeholders through an integrated live chat system.

7. **Implement a notification system** that alerts community members about upcoming collections and report status updates.

---

## 4. Literature Review

### 4.1 Smart Waste Management Systems

Smart waste management has gained traction globally, with cities like Barcelona, Seoul, and San Francisco implementing IoT-based systems. These typically involve:
- **Ultrasonic sensors** in bins to measure fill levels (Pardini et al., 2019)
- **GPS tracking** of collection trucks for route optimization (Anagnostopoulos et al., 2018)
- **Cloud-based dashboards** for centralized monitoring (Medvedev et al., 2015)

### 4.2 Waste Management in African Cities

Research on waste management in Sub-Saharan Africa highlights unique challenges:
- **Limited infrastructure** - Many cities lack basic waste collection infrastructure (Guerrero et al., 2013)
- **Informal sector dominance** - Waste picking and informal collection play a significant role (Wilson et al., 2012)
- **Financial constraints** - Municipalities have limited budgets for technology investments (Oduro-Appiah et al., 2017)
- **Low smartphone penetration** (improving rapidly) - Mobile-first solutions are increasingly viable (GSMA, 2023)

### 4.3 Existing Solutions

| Solution | Type | Limitations for Buea Context |
|----------|------|------------------------------|
| SmartBin | IoT Sensors | High hardware cost ($15-30/sensor), requires reliable power |
| Rubicon | Enterprise SaaS | Designed for large US municipalities, expensive licensing |
| WasteHero | Route Optimization | Requires IoT integration, subscription-based |
| CleanCity | Mobile Reporting | Community reporting only, no collector or admin tools |

### 4.4 Gap Analysis

Existing solutions are either:
- **Too expensive** for a municipality like Buea (IoT sensors, enterprise subscriptions)
- **Too narrow** (addressing only one stakeholder group)
- **Not adapted** to the African urban context (assuming reliable internet, formal collection systems)

EcoPulse addresses these gaps by providing a **software-only, multi-stakeholder platform** that works with existing infrastructure and requires no hardware investment beyond smartphones that collectors already carry.

---

## 5. System Analysis

### 5.1 Stakeholder Analysis

| Stakeholder | Role | Needs |
|-------------|------|-------|
| City Administrator | Oversees all waste management operations | Real-time monitoring, performance metrics, report management |
| Field Collector | Physically collects waste from bins | Route information, task prioritization, proof of collection |
| Community Member | Resident in a collection zone | Schedule visibility, issue reporting, status updates |

### 5.2 Functional Requirements

#### 5.2.1 Admin Dashboard
| ID | Requirement | Priority |
|----|------------|----------|
| FR-A1 | View real-time bin status on interactive map | High |
| FR-A2 | Manage collector profiles (add, edit, assign zones) | High |
| FR-A3 | View and respond to community reports | High |
| FR-A4 | View collection analytics and performance metrics | Medium |
| FR-A5 | Live chat with collectors and community members | High |
| FR-A6 | Export reports as CSV/PDF | Medium |
| FR-A7 | Manage collection schedules per zone | Medium |
| FR-A8 | Assign/change collector zones | High |
| FR-A9 | Set collector status (active, inactive, on leave) | High |
| FR-A10 | Receive notifications for new reports and critical bins | Medium |

#### 5.2.2 Collector App
| ID | Requirement | Priority |
|----|------------|----------|
| FR-C1 | Authenticate via phone number and PIN | High |
| FR-C2 | View assigned bins sorted by priority | High |
| FR-C3 | View route with distance to each bin | High |
| FR-C4 | Mark bin as collected with GPS verification | High |
| FR-C5 | Capture photo proof of collection | High |
| FR-C6 | View personal performance metrics | Medium |
| FR-C7 | Upload/change profile picture | Low |
| FR-C8 | Chat with admin/supervisor | Medium |
| FR-C9 | View map of assigned bins | High |
| FR-C10 | Navigate to bin (open external maps app) | Medium |

#### 5.2.3 Community App
| ID | Requirement | Priority |
|----|------------|----------|
| FR-U1 | Register with name and phone number | High |
| FR-U2 | Select home zone | High |
| FR-U3 | View next collection date and countdown | High |
| FR-U4 | Report overflowing/damaged bin with live photo | High |
| FR-U5 | View status of submitted reports | Medium |
| FR-U6 | View nearby bins on map | Medium |
| FR-U7 | View collection schedule calendar | Medium |
| FR-U8 | Set collection reminders (local notifications) | Medium |
| FR-U9 | Chat with administrator | Medium |
| FR-U10 | Receive notification when report status changes | Medium |

### 5.3 Non-Functional Requirements

| ID | Requirement | Description |
|----|------------|-------------|
| NFR-1 | Performance | API response time < 500ms for standard requests |
| NFR-2 | Scalability | Support up to 100 concurrent users |
| NFR-3 | Security | JWT-based authentication, no plaintext sensitive data in transit |
| NFR-4 | Availability | 99% uptime (dependent on hosting provider) |
| NFR-5 | Usability | Mobile apps usable with minimal training |
| NFR-6 | Compatibility | Android 10+ for mobile apps, modern browsers for dashboard |
| NFR-7 | Cost | Zero ongoing cost for map services (no paid API keys) |
| NFR-8 | Localization | Community app supports English (primary) |

### 5.4 Use Case Diagram

```
                        +---------------------------+
                        |       EcoPulse System      |
                        |                           |
   +--------+          |  +---------------------+  |
   | Admin  |--------->|  | Monitor Bins        |  |
   |        |--------->|  | Manage Collectors   |  |
   |        |--------->|  | Review Reports      |  |
   |        |--------->|  | View Analytics      |  |
   |        |--------->|  | Chat with Users     |  |
   |        |--------->|  | Export Data (CSV/PDF)|  |
   +--------+          |  +---------------------+  |
                        |                           |
   +--------+          |  +---------------------+  |
   |Collector|-------->|  | Login (Phone + PIN)  |  |
   |        |--------->|  | View Route           |  |
   |        |--------->|  | Collect Bin (GPS)    |  |
   |        |--------->|  | Capture Photo Proof  |  |
   |        |--------->|  | Chat with Admin      |  |
   |        |--------->|  | View Performance     |  |
   +--------+          |  +---------------------+  |
                        |                           |
   +--------+          |  +---------------------+  |
   |Community|-------->|  | Register (Name+Phone)|  |
   | Member |--------->|  | View Schedule        |  |
   |        |--------->|  | Report Bin Issue     |  |
   |        |--------->|  | View Nearby Bins     |  |
   |        |--------->|  | Chat with Admin      |  |
   |        |--------->|  | Set Reminders        |  |
   +--------+          |  +---------------------+  |
                        +---------------------------+
```

---

## 6. System Design

### 6.1 Architecture Overview

EcoPulse follows a **client-server architecture** with a centralized REST API serving three frontend applications.

```
+------------------+     +------------------+     +------------------+
| Admin Dashboard  |     | Collector App    |     | Community App    |
| (React + Vite)   |     | (React Native)   |     | (React Native)   |
| Port: 5173       |     | Expo SDK 55      |     | Expo SDK 55      |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         |    HTTP/REST (JSON)    |                        |
         +------------------------+------------------------+
                                  |
                        +---------+---------+
                        |  Node.js + Express |
                        |  REST API Server   |
                        |  Port: 5000        |
                        +---------+---------+
                                  |
                        +---------+---------+
                        |   MongoDB Atlas    |
                        |   (Cloud Database) |
                        +--------------------+
```

### 6.2 Technology Stack

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Admin Frontend | React | 19.x | Component-based, large ecosystem |
| Admin Styling | TailwindCSS | 4.x | Utility-first, rapid prototyping |
| Admin Build Tool | Vite | 6.x | Fast HMR, modern bundling |
| Admin Charts | Recharts | 2.x | React-native charts library |
| Admin Maps | Leaflet | 1.9.x | Free, OpenStreetMap-based |
| Mobile Framework | React Native (Expo) | SDK 55 | Cross-platform, managed workflow |
| Mobile Navigation | React Navigation | 7.x | Standard for React Native |
| Mobile Maps | Mapbox GL JS | - | Free tier (25K loads/month), no credit card |
| Backend Runtime | Node.js | 20.x | JavaScript ecosystem consistency |
| Backend Framework | Express | 4.x | Minimal, well-documented |
| Database | MongoDB Atlas | 7.x | Flexible schema, free tier |
| Authentication | JWT | - | Stateless, scalable |
| Location Services | expo-location | - | Native GPS access |
| Camera | expo-image-picker | - | Camera and gallery access |
| Notifications | expo-notifications | - | Local scheduled notifications |

### 6.3 Database Design

#### 6.3.1 Entity-Relationship Overview

```
User (Admin)
  |-- _id, name, email, password (hashed), role, avatar, phone

Collector
  |-- _id, name, phone, pin, truck, zone, status, avatar, efficiency
  |-- status: ['active', 'inactive', 'on_leave']

CommunityUser
  |-- _id, name, phone (unique), zone
  |-- Phone number serves as unique identifier

Bin
  |-- _id, binId, location, coordinates [lat, lng], fillLevel, status, zone, type, assignedCollector
  |-- status: ['optimal', 'warning', 'critical']

Schedule
  |-- _id, zone, day, time, wasteTypes[]

Report
  |-- _id, location, description, photo (base64), coordinates, zone, status, reporterPhone, reporterName
  |-- status: ['pending', 'reviewed', 'collected']

Message (Chat)
  |-- _id, chatId, sender, senderModel, text, timestamp

Activity (Audit Log)
  |-- _id, collector, bin, action, coordinates, photo, timestamp
```

#### 6.3.2 Collection Schedule Data Model

Each zone has 3 scheduled collection days per week:

| Zone | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday |
|------|--------|---------|-----------|----------|--------|----------|
| Molyko | 7-11 AM (General, Organic) | - | 7-11 AM (Recyclable) | - | 7 AM-12 PM (All) | - |
| Great Soppo | - | 7-11 AM (General, Organic) | - | 7-11 AM (Recyclable) | - | 8 AM-12 PM (All) |
| Bonduma | 8 AM-12 PM (General, Organic) | - | - | 8 AM-12 PM (Recyclable) | - | 7-11 AM (All) |
| Buea Town | - | 6-10 AM (General, Organic) | - | - | 6-10 AM (Recyclable) | 7-11 AM (All) |

### 6.4 API Design

All endpoints are prefixed with `/api/`.

#### 6.4.1 Authentication Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Admin login (email + password) | No |
| POST | /auth/collector-login | Collector login (phone + PIN) | No |
| GET | /auth/me | Get current admin profile | JWT |
| PUT | /auth/me | Update admin profile (name, email, phone, avatar) | JWT |
| POST | /auth/community-register | Register community user (name + phone) | No |
| POST | /auth/community-login | Community login (phone) | No |

#### 6.4.2 Bin Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /bins | List all bins (filterable by zone, status) | JWT |
| POST | /bins/:id/collect | Mark bin as collected (GPS + photo) | JWT |
| GET | /bins/:id | Get single bin details | JWT |

#### 6.4.3 Collector Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /collectors | List all collectors | JWT |
| GET | /collectors/me/route | Get assigned bins sorted by priority | JWT |
| PUT | /collectors/me/avatar | Upload profile photo (base64) | JWT |
| PUT | /collectors/:id/zone | Assign collector to a zone | JWT |
| PUT | /collectors/:id/status | Update collector status | JWT |

#### 6.4.4 Schedule Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /schedule/:zone | Get collection schedule for a zone | No |

#### 6.4.5 Report Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /reports | List all reports (admin) | JWT |
| POST | /reports | Submit new report (community) | No |
| PUT | /reports/:id/status | Update report status | JWT |
| GET | /reports/user/:phone | Get reports by phone number | No |

#### 6.4.6 Chat Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /chat | List all chat conversations | JWT |
| GET | /chat/:chatId | Get messages in a conversation | JWT |
| POST | /chat | Send a message | JWT |

### 6.5 UI/UX Design

#### 6.5.1 Design System

| Element | Value |
|---------|-------|
| Primary Color (Green) | #22c55e |
| Accent Color (Amber/Gold) | #F59E0B |
| Critical (Red) | #ef4444 |
| Warning (Orange) | #f59e0b |
| Banner Background | Dark Teal gradient (#0a2a3c to #134b63) |
| Card Background | #ffffff with soft shadows |
| Page Background (Dashboard) | Light blue (#dbeafe) |
| Card Border Radius | 16px |
| Button Border Radius | 14px |
| Font (Brand) | Orbitron (Google Fonts) |
| Font (Body) | System default |

#### 6.5.2 Mobile App Navigation

Both mobile apps use a **floating bottom tab bar** with:
- Rounded pill shape (borderRadius: 32)
- Dark translucent background with blur effect
- SVG icons from SVGRepo
- Active state: white icon + bold label
- Inactive state: semi-transparent icon + regular label

#### 6.5.3 Admin Dashboard Layout

- Collapsible sidebar navigation
- Top navbar with search, notification bell (with unread count), and user avatar
- Content area with card-based widgets
- Dark mode toggle in settings
- Responsive design (sidebar collapses on smaller screens)

---

## 7. Implementation

### 7.1 Project Structure

```
waste-management-system/
+-- client/                    # Admin Dashboard (React + Vite)
|   +-- public/
|   |   +-- logo.png
|   +-- src/
|       +-- components/
|       |   +-- layout/        # Sidebar, Navbar, Layout
|       |   +-- ui/            # StatCard, NotificationDropdown
|       +-- context/           # AuthContext
|       +-- pages/             # Dashboard, Bins, Collectors, Reports, etc.
+-- collector/                 # Collector Mobile App (Expo)
|   +-- src/
|       +-- api/               # Axios configuration
|       +-- assets/images/     # Logo, SVG icons, login assets
|       +-- components/        # TabIcons, GradientBrand
|       +-- context/           # AuthContext
|       +-- navigation/        # AppNavigator (Tab + Stack)
|       +-- screens/           # Home, Route, Map, Profile, Chat, Login
|       +-- theme.js           # Colors, gradients, shadows
+-- community/                 # Community Mobile App (Expo)
|   +-- src/
|       +-- api/               # Axios configuration
|       +-- assets/images/     # Logo, bin icons, truck banner
|       +-- components/        # TabIcons, TealHeader, GradientBrand
|       +-- context/           # ZoneContext (zone, language, profile)
|       +-- navigation/        # AppNavigator (Tab + Stack)
|       +-- screens/           # Home, Schedule, Reports, Map, Chat, etc.
|       +-- theme.js           # Colors, gradients, shadows
+-- server/                    # Backend API
|   +-- controllers/           # Auth, report logic
|   +-- models/                # Mongoose schemas
|   +-- routes/                # Express route handlers
|   +-- middleware/             # JWT auth middleware
|   +-- seed.js                # Database seed script
|   +-- index.js               # Server entry point
+-- docs/                      # Documentation
+-- article/                   # Medium article draft
```

### 7.2 Key Implementation Details

#### 7.2.1 GPS-Verified Collection

One of the most critical features is ensuring that collection reports are legitimate. The system uses the **Haversine formula** to calculate the distance between the collector's GPS coordinates and the bin's known coordinates.

**Algorithm:**
1. Collector taps "Mark Collected" on a bin
2. App requests current GPS position via `expo-location`
3. GPS coordinates are sent to the server along with the bin ID
4. Server calculates distance using:

```
a = sin^2(dlat/2) + cos(lat1) * cos(lat2) * sin^2(dlon/2)
c = 2 * atan2(sqrt(a), sqrt(1-a))
distance = R * c  (where R = 6371 km)
```

5. If distance > 100 meters: **REJECTED** (collector is not at the bin)
6. If distance <= 100 meters: proceed to photo capture
7. Photo captured via camera (no gallery upload - prevents old/fake photos)
8. Photo + GPS + timestamp stored as audit record

#### 7.2.2 Real-Time Collection Countdown

The community app's home screen displays a live countdown to the next scheduled collection:

1. Fetches all schedules for the user's zone from the API
2. For each schedule entry, calculates the next occurrence date based on the day of week
3. Selects the soonest upcoming collection
4. Displays formatted as "Today", "Tomorrow", or weekday name
5. Countdown timer updates every 60 seconds showing `Xd Xh Xm`

#### 7.2.3 Community User Identity

Community users are identified by **phone number** (unique key):
- No password required - phone number serves as both identifier and login credential
- If a phone already exists in the database, the user is logged in (returning user)
- If new, a profile is created with name + phone + zone
- All reports are linked to the phone number for traceability
- Admin can contact the reporter directly if clarification is needed

#### 7.2.4 Collector Status Management

Collectors can be set to three states by the admin:
- **Active** - Normal operation, can log in and collect
- **Inactive** - Account deactivated, login blocked with message
- **On Leave** - Can log in but sees a banner; collection actions disabled

#### 7.2.5 Live Chat System

The chat system connects all three applications:
- Collectors access chat from their Profile screen
- Community users access chat from the Chat tab
- Admin sees all conversations in the Chat page of the dashboard
- Messages are stored in MongoDB with sender reference and model type
- Polling-based updates (every 4 seconds) for near-real-time communication

#### 7.2.6 Map Implementation

Maps use **OpenStreetMap tiles via Leaflet.js** (admin dashboard) and **Mapbox GL JS** (mobile apps via WebView):
- Completely free with no API key required (OSM) or free tier (Mapbox - 25K loads/month)
- Bin markers are color-coded by status (green/orange/red)
- Tapping a marker shows bin details in a bottom sheet (mobile) or popup (web)
- Navigation button opens external maps app for turn-by-turn directions

#### 7.2.7 Photo-Only Reports

Community reports require a **live camera photo** - gallery upload is intentionally disabled:
- Prevents submission of old or misleading images
- Ensures the report reflects the current state of the bin
- Photo is compressed to 60% quality, converted to base64
- Stored directly in MongoDB (suitable for current scale)

---

## 8. Collection Schedule System

### 8.1 Zone-Based Organization

Buea is divided into four waste management zones, each with its own collection schedule:

| Zone | Population Density | Collection Frequency |
|------|-------------------|---------------------|
| Molyko | High (University area) | 3x/week (Mon, Wed, Fri) |
| Great Soppo | Medium | 3x/week (Tue, Thu, Sat) |
| Bonduma | Medium | 3x/week (Mon, Thu, Sat) |
| Buea Town | Medium-High | 3x/week (Tue, Fri, Sat) |

### 8.2 Waste Type Categorization

Each waste type is color-coded in the calendar view for easy identification:

| Waste Type | Calendar Color | Collection Days | Description |
|-----------|---------------|----------------|-------------|
| General | Green (#22c55e) | Primary collection day | Non-recyclable, non-compostable household waste |
| Organic | Amber (#d97706) | Primary collection day | Biodegradable waste that decomposes naturally |
| Recyclable | Blue (#3b82f6) | Secondary collection day | Materials that can be processed and reused |
| All Types | Combined | Tertiary collection day | Combined collection of all waste categories |

#### 8.2.1 Waste Type Examples

**General Waste:**
- Food packaging (chip bags, candy wrappers, sachets)
- Diapers and sanitary products
- Broken ceramics, mirrors, and light bulbs
- Dustpan sweepings and cigarette butts
- Damaged clothing and textiles
- Polystyrene (foam) containers

**Organic Waste:**
- Food scraps (fruit peels, vegetable trimmings, leftover food)
- Garden waste (leaves, grass clippings, small branches)
- Coffee grounds and tea bags
- Eggshells and nutshells
- Spoiled fruits and vegetables
- Sawdust and wood shavings

**Recyclable Waste:**
- Plastic bottles and containers (PET, HDPE)
- Paper, cardboard, and newspapers
- Metal cans (aluminum, tin, steel)
- Glass bottles and jars
- Cartons (juice, milk)
- Clean plastic bags

#### 8.2.2 Bin Configuration per Collection Point

Each designated collection point in the municipality is equipped with **three color-coded bins**, one for each waste category:

| Bin Color | Waste Type | Label | Lid Marking |
|-----------|-----------|-------|-------------|
| Green | General | GEN | Black lid |
| Brown/Amber | Organic | ORG | Brown lid |
| Blue | Recyclable | REC | Blue lid |

This three-bin configuration enables **waste segregation at source**, which is critical for:
- **Reducing landfill volume** — recyclable and organic waste is diverted from general disposal
- **Improving recycling rates** — pre-sorted recyclables are cleaner and more valuable
- **Enabling composting** — separated organic waste can be composted for agricultural use
- **Community education** — visible bin categories teach residents proper waste sorting habits

In the EcoPulse system, each collection point is represented as a single bin entity in the database (tracking overall fill level and status). The three physical bins at each location share the same GPS coordinates, assigned collector, and collection schedule. Future versions of the platform may track each physical bin individually to monitor which waste streams fill faster and optimize collection frequency per type.

**Note:** The current app implementation represents each collection point as one bin for simplicity. The three-bin physical setup is an operational detail managed at the municipal level, not reflected in the app's data model.

### 8.3 Collection Reminder System

The Collection Schedule screen in the community app provides an interactive calendar with per-collection-type reminder toggles.

#### 8.3.1 Calendar Features

- **Color-coded dots** on each calendar day indicate which waste types are scheduled:
  - Green dot = General waste collection
  - Amber dot = Organic waste collection
  - Blue dot = Recyclable waste collection
- Days with multiple collection types display multiple dots
- A **color legend** is shown below the calendar for reference
- **Tap any day** to view a detail card showing the exact waste types and collection time window
- **Today's date** is highlighted with a green border
- Navigation arrows allow browsing previous and future months

#### 8.3.2 Reminder Toggles

Each upcoming collection entry in the list below the calendar has a **toggle switch** that allows the user to enable or disable a reminder for that specific collection:

| Toggle State | Behavior |
|-------------|----------|
| **OFF** (default) | No reminder — user must check the app manually |
| **ON** | Reminder scheduled for **7:00 PM the evening before** collection day |

When a reminder is toggled ON:
1. The app requests notification permissions (if not already granted)
2. A local notification is scheduled using `expo-notifications` with a `seconds`-based trigger
3. The notification content includes: zone name, waste types, and collection time
4. Example: *"Collection Tomorrow - Molyko: General + Organic collection at 7:00 AM - 11:00 AM. Remember to place your bins out by 6:30 AM."*
5. A confirmation alert is shown to the user
6. A "Reminder set" label with a bell icon appears next to the toggle

When a reminder is toggled OFF:
1. The scheduled notification is cancelled
2. The preference is removed from storage

**Persistence:** Reminder preferences are stored in AsyncStorage under the key `reminders_{zone}` and persist across app restarts. Each zone maintains its own set of reminders.

**Graceful Fallback:** In environments where `expo-notifications` is unavailable (e.g., Expo Go), the toggle still works — it saves the user's preference locally. When the app is migrated to a development build, the saved preferences will automatically trigger real notifications.

---

## 9. Testing

### 9.1 Testing Environment

| Component | Environment |
|-----------|------------|
| Admin Dashboard | Chrome/Firefox browser, localhost:5173 |
| Collector App | Android Studio Pixel 8 emulator (1080x2400) |
| Community App | Android Studio Pixel 8 emulator (1080x2400) |
| Backend | Local Node.js server, MongoDB Atlas cloud |
| GPS Testing | Emulator Extended Controls, set to Buea (4.1548, 9.2985) |

### 9.2 Test Cases

#### 9.2.1 Authentication

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Admin login with valid credentials | Email + password | Dashboard loads | PASS |
| Admin login with invalid password | Wrong password | Error message | PASS |
| Collector login with valid phone + PIN | Phone + 6-digit PIN | Home screen loads | PASS |
| Collector login when inactive | Valid credentials, inactive status | "Account deactivated" message | PASS |
| Community registration | Name + unique phone | Profile created, home loads | PASS |
| Community login with existing phone | Existing phone | Profile loaded | PASS |
| Community duplicate phone registration | Already-registered phone | Existing profile returned | PASS |

#### 9.2.2 Bin Collection

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Mark collected within 100m | GPS within range | Camera opens, collection recorded | PASS |
| Mark collected outside 100m | GPS far from bin | "Too far from bin" error | PASS |
| Photo capture on collection | Camera shutter | Photo saved as base64 in activity log | PASS |
| Bin status update after collection | Collect action | Fill level resets, status changes | PASS |

#### 9.2.3 Community Reporting

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Submit report with camera photo | Live photo + description | Report created with "pending" status | PASS |
| Gallery upload blocked | Attempt gallery access | Only camera option available | PASS |
| View own reports | Navigate to Reports tab | All user's reports listed | PASS |
| Report status notification | Admin marks as "reviewed" | Notification dot appears on bell | PASS |

#### 9.2.4 Chat System

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Collector sends message | Type + send | Message appears in admin chat | PASS |
| Admin replies to collector | Type + send | Message appears in collector app | PASS |
| Community user sends message | Type + send | Message appears in admin chat | PASS |
| Chat input above keyboard | Open keyboard | Input field visible above keyboard | PASS |

#### 9.2.5 Schedule & Notifications

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| View zone schedule | Select zone | Correct schedule displayed | PASS |
| Countdown timer accuracy | Check against schedule | Counts down to correct next collection | PASS |
| Enable reminder toggle | Toggle ON | Confirmation alert shown | PASS |
| Disable reminder toggle | Toggle OFF | Reminder cancelled | PASS |

### 9.3 Known Limitations

1. **Expo Go notification constraints** - Local notifications are scheduled correctly in code (using `expo-notifications` with `seconds`-based triggers) but do not fire reliably in Expo Go on Android. The reminder toggle saves preferences and schedules notifications, but users will not receive the actual notification banner until the app is built as a **development build** (`npx expo run:android`) or **production APK**. In production, users would receive a notification at 7:00 PM the evening before their scheduled collection (e.g., *"Collection Tomorrow - Molyko: General + Organic at 7:00 AM. Place bins out by 6:30 AM."*). This is a known Expo Go limitation, not a code issue.
2. **Push notifications (remote) not available** - Remote push notifications (server-triggered) require a development build with Expo push token registration. Not supported in Expo Go.
3. **Base64 image storage** - Not scalable for production; CDN-based storage recommended
4. **Polling-based chat** - Not truly real-time; 4-second polling interval
5. **Single emulator testing** - Cannot run both mobile apps simultaneously on one emulator (different ports required)
6. **No automated tests** - All testing performed manually

---

## 10. Challenges and Solutions

### 10.1 Technical Challenges

| # | Challenge | Solution |
|---|-----------|----------|
| 1 | Google Maps API key requires billing account | Switched to OpenStreetMap (Leaflet) and Mapbox (free tier) — see 10.1.1 |
| 2 | Android emulator can't reach localhost | Used `10.0.2.2` (Android's loopback alias) and bound server to `0.0.0.0` |
| 3 | GPS testing in emulator shows Mountain View, CA | Set emulator location to Buea coordinates (4.1548, 9.2985) via Extended Controls |
| 4 | expo-notifications crashes in Expo Go | Wrapped import in try/catch, graceful fallback to local-only scheduling |
| 5 | Base64 photos exceed default JSON body limit | Increased Express JSON limit to 10MB: `express.json({ limit: '10mb' })` |
| 6 | Tab bar covering bottom content on screens | Added bottom padding to all scrollable screens + moved chat to stack navigator |
| 7 | Keyboard covering chat input on Android | Set `android.softwareKeyboardLayoutMode: "resize"` in app.json |
| 8 | Two Expo apps on same emulator conflict on port 8081 | Run second app on different port: `npx expo start --port 8082` |
| 9 | Name clashes in community user database | Used phone number as unique identifier instead of name |
| 10 | Filter pill text clipped in ScrollView | Replaced ScrollView with plain View for horizontal filter row |
| 11 | Chat messages delayed across apps | Reduced polling intervals from 3-5 seconds to 2 seconds on all platforms |

#### 10.1.1 Google Maps API Key — A Major Roadblock

One of the most significant challenges encountered during development was the inability to obtain a Google Maps API key. The `react-native-maps` package, which is the standard mapping library for React Native, relies on Google Maps on Android and requires an API key linked to a Google Cloud billing account.

**The Problem:**

Google Cloud Platform requires a valid credit or debit card to activate the Maps API, even though the first $200/month of usage is free. As a student developer in Cameroon, the only available payment method was a virtual card (mobile money-linked). Google's billing system **rejected the virtual card**, making it impossible to:
- Obtain a Google Maps API key
- Display any map tiles in the collector and community apps
- Use geocoding or directions APIs

The map screens in both mobile apps rendered completely blank — showing only the UI overlay (search bar, bottom sheet) with no map underneath.

**Solutions Explored:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Google Maps (paid) | Industry standard, best documentation | Requires real credit card — rejected virtual card | Not viable |
| OpenStreetMap + Leaflet (WebView) | Completely free, no API key, no account needed | Runs in a WebView — slightly less performant than native | Used for admin dashboard |
| Mapbox GL JS (WebView) | Free tier (25,000 loads/month), no credit card required, beautiful map styles | WebView-based on mobile, requires free account signup | Used for mobile apps |
| HERE Maps | Generous free tier | Requires account setup, less community support | Not pursued |

**Final Resolution:**

The project adopted a **dual-mapping strategy**:

1. **Admin Dashboard (Web):** Uses **Leaflet.js with OpenStreetMap tiles** via the `react-leaflet` library. Completely free, no API key, no account needed. Provides interactive bin markers with popups showing bin details.

2. **Mobile Apps (Collector + Community):** Uses **Mapbox GL JS rendered inside a React Native WebView**. Mapbox offers a free tier of 25,000 map loads per month and accepts email-only signup with no credit card. The Mapbox access token is stored as an environment variable (`EXPO_PUBLIC_MAPBOX_TOKEN`).

This approach delivered professional-quality maps across all three applications at **zero cost**, while maintaining full functionality including:
- Color-coded bin markers (green/amber/red by status)
- Fill level labels on markers
- Click/tap interactions to show bin details
- User geolocation (community app)
- Navigation controls

**Key Takeaway:** The Google Maps dependency is a common barrier for student developers and projects in regions where international payment methods are not easily accessible. Free alternatives like OpenStreetMap and Mapbox provide comparable functionality and should be considered as primary options, not just fallbacks.

### 10.2 Design Challenges

| # | Challenge | Solution |
|---|-----------|----------|
| 1 | Light theme cards not standing out | Added stronger box shadows and light blue (#dbeafe) page background |
| 2 | Number pad alignment on login | Replaced flexWrap with explicit row arrays: [[1,2,3], [4,5,6], [7,8,9]] |
| 3 | Sign-in button image showing white corners | Wrapper View with `overflow: 'hidden'` and slightly oversized image |
| 4 | Dual language (EN/FR) cluttering UI | Simplified to single language selection |
| 5 | Brand identity across 3 apps | Consistent use of EcoPulse logo + Orbitron font + green gradient text |

---

## 11. Results and Discussion

### 11.1 System Capabilities

EcoPulse successfully delivers:

1. **Multi-stakeholder platform** - Three interconnected applications serving admins, collectors, and community members through a shared API.

2. **GPS-verified accountability** - Collection cannot be falsely reported; physical proximity is required.

3. **Zero-cost mapping** - Both OpenStreetMap and Mapbox free tier eliminate the need for paid map API keys.

4. **Real-time communication** - Live chat between all stakeholders reduces reliance on phone calls.

5. **Community engagement** - Residents can actively participate in waste management through reporting and schedule awareness.

6. **Data-driven decisions** - Collection analytics, performance metrics, and trend data available to administrators.

### 11.2 Sample Data Performance

With seed data representing realistic Buea operations:
- **4 zones** fully configured with schedules
- **10 bins** with real GPS coordinates across the city
- **6 collectors** with truck assignments and performance tracking
- **12 weekly collection schedules** (3 per zone)

### 11.3 Comparison with Objectives

| Objective | Status | Notes |
|-----------|--------|-------|
| Web admin dashboard | Achieved | Full monitoring, management, and analytics |
| Collector mobile app | Achieved | Route, GPS collection, chat, profile |
| Community mobile app | Achieved | Schedule, reporting, map, chat, notifications |
| GPS verification | Achieved | 100m radius check with Haversine formula |
| Zone-based scheduling | Achieved | 4 zones, 3 days/week each, waste type categorization |
| Real-time communication | Achieved | Polling-based chat (4s interval) |
| Notification system | Partially | Local notifications work; push notifications need dev build |

---

## 12. Future Work

### 12.1 Short-Term (Next 3 months)

1. **IoT Sensor Integration** - Add ultrasonic sensors to high-priority bins for automated fill-level monitoring
2. **Push Notifications** - Migrate from Expo Go to development build to enable remote push notifications
3. **Offline Mode** - Cache data locally so collectors can work in areas with poor connectivity
4. **Automated Route Optimization** - Algorithm to suggest the most efficient collection route based on bin fill levels and distance

### 12.2 Medium-Term (3-6 months)

5. **Predictive Fill-Level Forecasting** - Machine learning model trained on historical collection data to predict when bins will reach critical levels
6. **Google Play Store Deployment** - Publish both mobile apps to the Play Store
7. **Web Dashboard Hosting** - Deploy admin dashboard to a cloud provider (Vercel/Railway)
8. **Payment Integration** - Mobile money integration for potential community waste pickup requests

### 12.3 Long-Term (6-12 months)

9. **Multi-Municipality Support** - Extend the platform to serve other cities in Cameroon
10. **Waste Recycling Tracking** - Track recyclable waste from collection to processing
11. **Gamification** - Community leaderboards, badges for active reporters
12. **Carbon Impact Dashboard** - Estimate and display CO2 savings from optimized collection routes

---

## 13. Conclusion

EcoPulse demonstrates that effective waste management technology does not require expensive hardware or enterprise software. By leveraging free and open-source tools — React, React Native, Node.js, MongoDB Atlas free tier, OpenStreetMap, and Mapbox — it is possible to build a comprehensive, multi-stakeholder platform that addresses real urban challenges in African cities.

The system successfully connects administrators, collectors, and community members through a shared digital ecosystem, bringing accountability (GPS-verified collections), transparency (real-time monitoring), and community participation (reporting and schedule awareness) to waste management operations in Buea Municipality.

While the current implementation relies on manual data entry and estimated fill levels, the architecture is designed to accommodate IoT sensors and machine learning enhancements as resources become available. The modular design — with three independent frontend applications sharing a common API — also makes the system adaptable to other municipalities facing similar challenges.

EcoPulse is not just a technical project; it is a step toward cleaner, healthier, and more responsive cities in Cameroon and across Africa.

---

## 14. References

1. Anagnostopoulos, T., et al. (2018). "Challenges and opportunities of waste management in IoT-enabled smart cities." *Renewable and Sustainable Energy Reviews*, 92, 374-387.

2. Guerrero, L.A., Maas, G., & Hogland, W. (2013). "Solid waste management challenges for cities in developing countries." *Waste Management*, 33(1), 220-232.

3. GSMA. (2023). "The Mobile Economy: Sub-Saharan Africa 2023." GSMA Intelligence.

4. Medvedev, A., et al. (2015). "Waste management as an IoT-enabled service in smart cities." *Internet of Things, Smart Spaces, and Next Generation Networks*, 104-115.

5. Oduro-Appiah, K., Afful, A., Donkor, E., & Nyarko, M.Y. (2017). "Existing solid waste management system in three most populous metropolitan assemblies in Ghana." *Journal of Sustainable Development of Energy, Water and Environment Systems*, 5(3), 443-459.

6. Pardini, K., et al. (2019). "IoT-Based Solid Waste Management Solutions: A Survey." *Journal of Sensor and Actuator Networks*, 8(1), 5.

7. Wilson, D.C., et al. (2012). "Comparative analysis of solid waste management in 20 cities." *Waste Management & Research*, 30(3), 237-254.

8. React Native Documentation. (2024). https://reactnative.dev/docs/getting-started

9. Expo Documentation. (2024). https://docs.expo.dev/

10. MongoDB Atlas Documentation. (2024). https://www.mongodb.com/docs/atlas/

---

## 15. Appendices

### Appendix A: Installation and Setup

#### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier)
- Android Studio with emulator configured
- Expo Go app on emulator/device

#### Backend Setup
```bash
cd server
npm install
# Configure .env with MONGODB_URI and JWT_SECRET
npm run seed    # Populate database with sample data
npm run dev     # Start server on port 5000
```

#### Admin Dashboard Setup
```bash
cd client
npm install
npm run dev     # Start on port 5173
```

#### Collector App Setup
```bash
cd collector
npm install
npx expo start --android   # Launch on emulator
```

#### Community App Setup
```bash
cd community
npm install
npx expo start --port 8082 --android   # Launch on different port
```

### Appendix B: Default Login Credentials

#### Admin Dashboard
- Email: admin@ecopulse.com
- Password: admin123

#### Collector App (Sample)
- Phone: 670000001
- PIN: 123456

### Appendix C: API Base URLs

| Environment | URL |
|------------|-----|
| Android Emulator | http://10.0.2.2:5000/api |
| Physical Device | http://[your-ip]:5000/api |
| Web Dashboard | http://localhost:5000/api |

### Appendix D: Seed Data - Bin Locations

| Bin ID | Location | Zone | Coordinates |
|--------|----------|------|-------------|
| BIN-001 | UB Main Gate | Molyko | 4.1548, 9.2985 |
| BIN-002 | Molyko Market | Molyko | 4.1562, 9.2970 |
| BIN-003 | Bonduma Health Center | Bonduma | 4.1480, 9.3020 |
| BIN-004 | Great Soppo Junction | Great Soppo | 4.1620, 9.2900 |
| BIN-005 | Buea Town Market | Buea Town | 4.1550, 9.2350 |

*(Additional bins listed in seed.js)*

### Appendix E: Screenshots

*[To be added - Screenshots of each screen in both mobile apps and the admin dashboard]*

1. Admin Dashboard - Overview
2. Admin Dashboard - Bin Map
3. Admin Dashboard - Collectors Management
4. Admin Dashboard - Reports
5. Admin Dashboard - Chat
6. Collector App - Login Screen
7. Collector App - Home Screen
8. Collector App - Route Screen
9. Collector App - Map Screen
10. Collector App - Profile Screen
11. Community App - Splash Screen
12. Community App - Zone Selection
13. Community App - Home Screen
14. Community App - Schedule Screen
15. Community App - Report Bin Screen
16. Community App - Nearby Map
17. Community App - Chat Screen

---

*This is a living document. Last updated: March 29, 2026.*
