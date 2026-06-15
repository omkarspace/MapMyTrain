# 📄 Technical Document 8: Open Database License (ODbL) Compliance Memo

**Project Name:** MapMyTrain

**Author:** Legal & Open Source Compliance Operations

**Status:** Enforced / Production Standard

**Version:** 1.0.0

---

## 1. Context & Purpose

**MapMyTrain** leverages geographic data from OpenStreetMap (OSM) to render its railway track network layouts (`LineString` vectors) and station infrastructure nodes (`Point` vectors). OSM data is licensed under the **Open Database License (ODbL) v1.0**.

Because MapMyTrain is an open-core project featuring a monetized commercial tier, strict structural compliance with the ODbL is mandatory to mitigate copyright risks, prevent viral copyleft exposure of proprietary software components, and maintain community trust.

---

## 2. Core Legal Pillars of the ODbL

The ODbL governs the *database* itself rather than the software rendering it. Its requirements can be broken down into three operational mandates:

| Pillar | Legal Obligation | Application to MapMyTrain |
| --- | --- | --- |
| **Attribution** | You must explicitly credit the data source. | Clear, hyperlinked UI placement on all web and mobile viewports. |
| **Share-Alike (SA)** | Any modifications or additions made to the base spatial data must be published back under the ODbL. | If we manually fix broken track geometry in our database, those exact coordinates must be made public. |
| **Keep Open** | If you redistribute a derivative version, you cannot apply technical restrictions (DRM) to block access. | The compiled vector tracks (`.pmtiles`) must be freely downloadable from the public repository. |

---

## 3. The "Derivative Database" vs. "Produced Work" Distinction

The critical architectural defense for MapMyTrain relies on the legal distinction between a *Derivative Database* and a *Produced Work* under ODbL Section 4.

```
[ OSM Spatial Tracks DB ] ──► (Modified/Cleaned Layer) ──► [ Derivative Database ] (MUST BE OPEN-SOURCE)
                                                                   │
                                                                   ▼
[ MapLibre / WebGL Rendering Canvas Engine ] ──────────────► [ Produced Work ] (CAN BE PROPRIETARY)

```

### 3.1 The Derivative Database (Open-Source)

Any manipulation, translation, clipping, or manual correction of the raw OSM track geography files results in a **Derivative Database**.

* **Compliance Action:** These asset pipelines, `.geojson` sources, and PostGIS structural schemas reside strictly within our **Public Repository**. Anyone can download, extract, and reuse this geometric network data.

### 3.2 The Produced Work (Commercialization Protected)

The visual image rendered on the screen by the WebGL canvas context (the map interface itself, including custom canvas styles, real-time live train positioning layers, user subscription drawers, and custom overlay filters) is legally classified as a **Produced Work**.

* **Compliance Action:** The ODbL **does not** viral-bind the software code or proprietary tracking algorithms generating a Produced Work. The private repository assets (Stripe endpoints, notification engines, telemetry handlers) are safely insulated from open-source forcing rules.

---

## 4. The Collective Database Framework: Isolating Live Telemetry

MapMyTrain merges static track vectors with volatile real-time scraping data. To prevent our proprietary live train tracking matrix from being designated a derivative of OSM, data ingestion must follow a **Collective Database** model (keeping databases independent yet displayed simultaneously).

```sql
-- CORRECT COMPLIANCE PATTERN: Explicit Separation of Data Sources
SELECT 
    t.train_number,
    ST_AsGeoJSON(t.current_location) AS live_point,  -- Proprietary Telemetry DB Node
    ST_AsGeoJSON(tr.geom) AS physical_track        -- ODbL OSM Track Database Node
FROM train_telemetry_logs t
INNER JOIN tracks tr ON ST_DWithin(t.current_location, tr.geom, 0.005)
WHERE t.train_number = '12301';

```

> **Compliance Directives:**
> 1. **No Permanent Binding:** Do not permanently burn proprietary scraped delay statistics or client account telemetry logs into the underlying OSM track dataset records.
> 2. **Runtime Joining Only:** Keep records separated into isolated tables (`tracks` vs. `train_telemetry_logs`). Only correlate them dynamically at runtime in memory or through volatile SQL queries using PostGIS spatial functions (e.g., `ST_DWithin`).
> 
> 

---

## 5. Required Production UI Attribution Specs

To satisfy the Attribution requirement, the web app frontend must display a visible copyright block.

### 5.1 Presentation Constraints

* **Placement:** Permanently anchored to the lower right corner of the map canvas layer.
* **Visibility:** Legend text must contrast clearly against the background (`text-slate-400` on dark basemaps) and remain unhidden by popups or interactive sliding panels.
* **Format Requirement:**

```html
<div class="absolute bottom-2 right-2 z-50 text-[10px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
  © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" class="hover:underline text-sky-400">OpenStreetMap</a> contributors
</div>

```

---

## 6. Data Redelivery Runbook

If a community fork requests access to the structural geometry components utilized by MapMyTrain's map view, the public repo fulfills this open data mandate automatically by hosting a cron-generated dump script:

```bash
#!/bin/bash
# Location: public-repo/scripts/export-odbl-compliance-dump.sh
# Scheduled via GitHub Actions to export clean snapshots every Sunday morning

echo "Exporting ODbL Compliant Railway Network Tracks..."
docker exec -t mmt-postgis-db pg_dump -U mmt_admin -t tracks -t stations mapmytrain > ./public/data/odbl_export_latest.sql

echo "Compiling flat GeoJSON vector geometries..."
ogr2ogr -f "GeoJSON" ./public/data/railway_tracks.geojson PG:"host=localhost user=mmt_admin dbname=mapmytrain password=secure_spatial_pwd" "tracks"

echo "Compliance export successful. Assets publicly accessible via HTTP access blocks."

```

---

With the finalization of the Open Database License Compliance Memo, the complete 8-document technical engineering blueprint for **MapMyTrain** is finalized and ready for codebase generation. All technical constraints, licensing guardrails, scaling pipelines, and local development configurations are locked down.