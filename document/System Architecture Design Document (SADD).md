# 📄 Technical Document 2: System Architecture Design Document (SADD)

**Project Name:** MapMyTrain

**Author:** Core Architecture Team

**Status:** Under Review

**Version:** 1.0.0

---

## 1. System Overview

MapMyTrain is built on an event-driven, microservices-adjacent architecture designed to process high-throughput spatial data with minimal latency. The system balances highly volatile, scraped real-time telemetry strings with massive, static spatial layers (railway tracks and station nodes).

### High-Level Architecture Diagram

```
[ Upstream Public Portals / NTES ]
               │ (HTTPS Requests / Rotating Headers)
               ▼
   [ FastAPI Ingestion Worker ] 
               │
               ├───────► [ Redis Cache Matrix (120s TTL Storage) ]
               │
               ▼
     [ PostGIS Spatial Engine ] ────► Compute Interpolation Coordinates
               │
               ▼
    [ Redis Pub/Sub Broadcast ]
               │
               ▼
   [ FastAPI WebSocket Servers ]
               │ (Binary Protobuf Streams)
               ▼
 [ MapLibre GL WebGL Client Canvas ]

```

---

## 2. Component Breakdowns

### 2.1 Data Ingestion Subsystem (Private Layer)

This service runs as a decoupled background worker managed by Celery or an independent asyncio loop. It isolates the platform from the instability of upstream data scraping.

* **Ingestion Protocol:** Scheduled cron workers fetch the data. Instead of sweeping the entire national schedule simultaneously, the worker queries a target queue of *active* trains stored in Redis.
* **Anti-Blocking Layer:** Implements an automated rotation matrix handling `User-Agent` strings, header structures, and coordinate session tokens to prevent IP address throttling from upstream CDNs.

### 2.2 Shared Memory & Caching Subsystem (Redis Matrix)

Redis acts as the high-velocity memory buffer that prevents database degradation and eliminates duplicate outbound API requests.

* **Raw Data Cache:** Stores incoming raw JSON packets indexed by `train_number` with a strict Time-to-Live (TTL) configuration of 120 seconds.
* **State Machine Cache:** Tracks active browser viewport cluster sizes to adjust calculation intervals. If no users are viewing a specific train cluster, background processing for that sector automatically dials back to save CPU cycles.

### 2.3 Spatial Processing Engine (PostgreSQL + PostGIS)

The core computation module matches textual updates to exact spatial geography coordinates.

```
[Raw Status: "Departed Station A"] ──► Lookup Station A & B Nodes ──► Extract Path LineString
                                                                                 │
[Stream Client Coordinates] ◄── LERP Fractional Point Calculation ◄──────────────┘

```

When a raw packet declares that a train has departed Station A heading toward Station B, the Spatial Processing Engine runs the following pipeline:

1. Fetch the distinct geometric `Point` data for Station A and Station B.
2. Query the track database to isolate the exact vector `LineString` segment connecting those two stations.
3. Compute the current physical position using a client-side or server-side time-based linear interpolation script.

---

## 3. Mathematical Interpolation Specification

Because raw tracking updates arrive at slow intervals (e.g., every 2 to 3 minutes), the system uses a linear interpolation algorithm to ensure smooth 60 FPS marker movement on the client map layout.

Let the geographic coordinate vector of the departure station be $P_{start} = (\lambda_{start}, \phi_{start})$ and the target destination station be $P_{end} = (\lambda_{end}, \phi_{end})$, where $\lambda$ represents longitude and $\phi$ represents latitude.

The total scheduled transit duration between the two points is defined as $T_{total}$, and the actual time elapsed since departure is $T_{elapsed}$. The current progress fraction $f$ is calculated as:

$$f = \frac{T_{elapsed}}{T_{total}}$$

Where $0 \le f \le 1$. The calculated spatial coordinates of the moving train $P_{current}$ along a straight vector path at any given interval are determined by:

$$P_{current} = P_{start} + f \times (P_{end} - P_{start})$$

For curved tracks, PostGIS projects this fraction directly onto the topological track layout using the spatial execution function `ST_LineInterpolatePoint(geom, f)`.

---

## 4. Real-Time Distribution & Streaming API

To prevent web server overhead, client connections bypass traditional REST polling completely in favor of persistent WebSockets.

### 4.1 WebSocket Broadcast Mesh

* **Pub/Sub Gateway:** The background calculation engine updates coordinate values and publishes the resulting spatial state straight to a Redis Pub/Sub channel (`train:updates`).
* **FastAPI Workers:** Independent, stateless WebSocket servers subscribe to the Redis channel and stream data packets to connected browser map clients. This allows the system to scale horizontally by simply adding more WebSocket containers behind a load balancer.

### 4.2 Network Payload Optimization

To protect bandwidth overhead on mobile networks, JSON serialization is discarded. The WebSocket server encodes real-time positions into a lightweight binary packet string before broadcast:

| Data Field | Data Type | Size (Bytes) | Description |
| --- | --- | --- | --- |
| **Train ID** | Int32 | 4 | Unique 5-digit identifier |
| **Longitude** | Float32 | 4 | Highly accurate X coordinate |
| **Latitude** | Float32 | 4 | Highly accurate Y coordinate |
| **Bearing** | Int16 | 2 | Vector heading angle ($0^\circ$ to $359^\circ$) |
| **Delay** | Int16 | 2 | Integer value tracking delay in minutes |

---

## 5. Security & Infrastructure Boundaries

```
                    [ PRODUCTION CLUSTER ]
 ┌──────────────────────────────────────────────────────────┐
 │  [ Private Core Repo ] ──► Extends Modules & UI Controls │
 │       │                                                  │
 │       ▼ (Submodule Ingestion)                            │
 │  [ Public Core Repo ] ───► Base Client Canvas & Workflows│
 └──────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                     [ Open-Source Version ]

```

### 5.1 Open-Core Code Isolation

The codebase is structured into a split-repository layout to safeguard infrastructure dependencies:

* **The Public Repository:** Houses the core Next.js client engine, MapLibre layout frameworks, basic PostGIS schema components, and local development mock data structures.
* **The Private Repository:** Integrates the public core code as a secure Git Submodule. It overlays production-sensitive parameters, including AdMob tracking script modules, Stripe billing webhook containers, and live ingestion proxy clusters.

### 5.2 Failover Operational Logic

If an upstream data provider experiences an outage, the system switches to a degraded operational state. Instead of failing completely, the FastAPI worker pushes a warning flag down the WebSocket stream. The front-end map canvas captures this flag and turns train icons amber, notifying users that they are viewing estimated tracks based on historical schedules until connection to live telemetry is restored.