# 📄 Technical Document 1: Product Requirement Document (PRD)

**Project Name:** MapMyTrain

**Author:** Engineering & Product Team

**Status:** Approved / Ready for Implementation

**Target Launch:** Q3 2026

---

## 1. Executive Summary & Vision

### 1.1 Objective

**MapMyTrain** is a high-performance, visual-first, real-time spatial tracking platform for Indian Railways. Built as a next-generation open-core tribute to classic text-based tracking applications, it shifts the user experience from reading static transit lists to interacting with a hardware-accelerated 3D map canvas.

### 1.2 Core Value Proposition

* **Visual-First Geometry:** See trains moving along actual physical tracks instead of reading estimated station delay tables.
* **Open-Core Infrastructure:** A robust, open-source core engine that the community can self-host and improve, backed by a private commercial distribution layer that funds server operations via lightweight ads and premium feature tiers.
* **Ultra-Low Resource Footprint:** Designed to stream coordinate data smoothly using custom WebGL rendering and optimized caching layers, preventing browser crashes on low-end mobile devices.

---

## 2. User Personas & Problem Alignment

### Persona A: The Daily Commuter ("Rahul")

* **Context:** Takes a local/express train to work every morning.
* **Pain Point:** Existing apps show that a train is "delayed by 20 minutes at Station X," but he cannot tell if the train is stuck at a distant signal or already pulling up to the outer tracking loop near his platform.
* **Solution:** Uses MapMyTrain to visually inspect the exact geographic coordinates of the train relative to his station's outer signals.

### Persona B: The Long-Distance Traveler / Rail Enthusiast ("Priya")

* **Context:** Traveling across states over a 24-hour journey.
* **Pain Point:** Wants to see the scenic terrain (Ghats, rivers, tunnels) she is crossing in real time, but text-only utilities provide zero geographical context.
* **Solution:** Uses the 3D terrain canvas mode to visualize her route slicing through topography in real time.

---

## 3. Scope & Feature Matrix (Open-Core Split)

To maintain a healthy relationship with the open-source community while securing financial sustainability, features are strictly bifurcated:

| Feature | Core Tier (Open-Source) | Premium Tier (Subscription) |
| --- | --- | --- |
| **Interactive Map Canvas** | 2D/3D WebGL Base View | 3D Topographic Terrain Layer (DEM Enabled) |
| **Train Metrics** | Core schedules & delay values | Live velocity & delay trend analytics |
| **Ads** | Standard display panels included | 100% Ad-Free Canvas Interface |
| **Telemetry Alerts** | In-app notification polling | WhatsApp/Push alert routing for upcoming arrivals |
| **Offline Caching** | Standard web session storage | Local cellular tower coordinate fallback matrix |

---

## 4. Functional Requirements

### 4.1 Search & Discovery Engine

* **FR-1.1:** Users must be able to query a train by its 5-digit number or alphabetic name.
* **FR-1.2:** Users must be able to search for trains running between two specific stations on a selected calendar date.
* **FR-1.3:** Auto-suggest must surface matching metadata from a local database within 150 milliseconds of user text input.

### 4.2 WebGL Map Interface

* **FR-2.1:** The map must display continuous vector lines representing the complete spatial layout of Indian Railways tracks.
* **FR-2.2:** Active train markers must render with directional arrows representing their physical orientation (`bearing`) relative to the track geometry.
* **FR-2.3:** Clicking a train marker must pull up an absolute-positioned bottom drawer UI revealing its structural timetable, current tracking delay, and next upcoming terminal.

### 4.3 Ingestion & Interpolation Backend

* **FR-3.1:** The backend system must ingest real-time raw string arrays from public scraper routines and parse them into clean JSON coordinate states.
* **FR-3.2:** The calculation worker must dynamically execute linear interpolation (LERP) algorithms to generate smooth intermediate train placements when raw upstream updates lag.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Performance & Rendering Speed

* **NFR-1.1 (Frame Rate):** The map canvas must maintain a stable target execution speed of **60 FPS** during pan, zoom, and tilt operations when rendering up to 500 active trains simultaneously.
* **NFR-1.2 (Data Ingestion Interval):** The background worker must update the shared Redis cache matrix every **120 seconds** per active train to prevent server IP throttling by upstream firewalls.

### 5.2 Security & Data Governance

* **NFR-2.1 (Credential Segregation):** Private operational tokens (`STRIPE_SECRET_KEY`, `AD_NETWORK_ID`) must never be exposed to the public open-source repository configuration files.
* **NFR-2.2 (Attribution Compliance):** The web app frontend must clearly present OpenStreetMap data contributor credits (`© OpenStreetMap contributors`) permanently fixed to the base map canvas layout in accordance with ODbL legal guidelines.

---

## 6. User Experience & Interface Guidelines

```
+-------------------------------------------------------------+
|  [🔍 Search Train No. or Station... ]                       |
+-------------------------------------------------------------+
|                                                             |
|          ▲ (Moving Train Icon Layer - Smooth LERP)          |
|          │                                                  |
|   =======●======= (Dashed Vector Track Layer)                |
|                                                             |
|                 [ 3D Topography / Elevation DEM ]          |
|                                                             |
+-------------------------------------------------------------+
|  [ Sliding UI Information Drawer - Absolute Bottom Fixed ]  |
|  ---------------------------------------------------------  |
|  Train: 12301 Rajdhani Exp  |  Status: 12 Mins Delayed       |
|  Next Stop: Kanpur Central (CNB)                            |
|  +-------------------------------------------------------+  |
|  |                Sandboxed Ad Placement Unit            |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+

```

* **Design Language:** Clean, minimalist dark mode aesthetics (`slate-950` backing palette) to ensure vibrant neon tracking lines and station indicators are glanceable under direct sunlight.
* **Gesture Integrity:** Map interaction bounds must swallow all drag and pinch gestures completely. Bottom UI drawer components must use sandboxed touch containers to avoid accidental map panning when scrolling through timetable lists.

---

Document 1 (Product Requirement Document) is complete. Let me know when you are ready to generate Document 2 (System Architecture Design Document).