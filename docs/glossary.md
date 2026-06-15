# MapMyTrain Glossary

> Canonical definitions for all domain-specific terms used across documentation, code, and AI-generated content.

## Core Concepts

| Term | Definition |
|------|-----------|
| **MapMyTrain** | Real-time Indian Railways spatial tracking platform. Open-core project with proprietary premium tier. |
| **NTES** | National Train Enquiry System — official Indian Railways API for live train status. |
| **LERP** | Linear Interpolation — mathematical method `P = P_start + f × (P_end - P_start)` for smooth train movement between data points. |
| **Binary WebSocket** | Custom 16-byte frame protocol `[TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2]` for streaming train positions without JSON overhead. |
| **Token Bucket** | Redis-based rate limiting algorithm — 5 tokens max, 1/sec refill, prevents NTES API abuse. |
| **PostGIS** | Spatial extension for PostgreSQL — enables geographic queries like `ST_DWithin` for proximity-based train lookup. |
| **MapLibre GL JS** | Open-source WebGL map rendering library used for the train visualization canvas. |
| **PMTiles** | Single-file vector tile format — OSM track data stored as `.pmtiles` for efficient tile serving. |

## Data Models

| Term | Definition |
|------|-----------|
| **Train** | A railway service identified by 5-digit number (e.g., 12301 = Rajdhani Express). |
| **Telemetry** | Real-time position data: lat, lng, bearing, delay_minutes, last_station, next_station. |
| **Track** | OSM-sourced railway geometry as LineString in PostGIS. ODbL-licensed. |
| **Station** | Railway station with code (e.g., NDLS = New Delhi), name, zone, and PostGIS Point geometry. |
| **Bearing** | Compass direction (0-359°) the train is facing. Determines arrow rotation on the map. |
| **Delay** | Minutes behind schedule. Positive = late, 0 = on time. |

## Architecture Terms

| Term | Definition |
|------|-----------|
| **Ingestion Worker** | Background asyncio loop that scrapes NTES every 120s and publishes to Redis. |
| **Broadcaster** | Redis Pub/Sub service that fans out train updates to all WebSocket clients. |
| **CacheService** | Redis wrapper with TTL management — 120s for active trains, 30min for inactive. |
| **State Machine Cache** | Viewport cluster tracker that skips processing trains not in the user's view. |
| **Cleanup Worker** | Hourly cron that deletes telemetry logs older than 48 hours. |
| **TileServer** | MapLibre GL TileServer serving vector tile layers for OSM track data. |

## Feature Tiers

| Term | Definition |
|------|-----------|
| **Core Tier** | Open-source features: 2D map, basic tracking, search, delay values. |
| **Premium Tier** | Proprietary features: 3D terrain, velocity analytics, WhatsApp alerts, offline mode. |
| **Open-Core** | Business model: core engine is open-source, premium features fund operations. |

## Legal & Licensing

| Term | Definition |
|------|-----------|
| **ODbL** | Open Database License — governs the OSM-derived track geometry data. |
| **Derivative Database** | Modified OSM data — MUST be published under ODbL if redistributed. |
| **Produced Work** | Visual rendering by software — NOT subject to ODbL viral licensing. |
| **Collective Database** | Independent databases joined at runtime (telemetry + tracks). Prevents ODbL from binding proprietary data. |
