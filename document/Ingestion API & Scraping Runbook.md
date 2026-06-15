# 📄 Technical Document 4: Ingestion API & Scraping Runbook

**Project Name:** MapMyTrain

**Author:** Backend & Data Infrastructure Team

**Status:** Operational / Production Guidelines

**Version:** 2026.1.4

---

## 1. Upstream Targets & Reverse-Engineered Gateways

Since official National Train Enquiry System (NTES) API feeds are heavily guarded behind enterprise firewalls, the data ingestion worker relies on querying public-facing REST endpoints used by the government's mobile web utilities.

### 1.1 Primary Target Network Specification

* **Target Root Node:** `https://ntes.indianrail.gov.in/Coreata`
* **Primary Query Path:** `/QueryResult?queryType=LiveTrainStatus&trainNo={train_number}&date={date}`
* **Format:** Raw JSON or serialized JavaScript Object string strings.

### 1.2 Fallback Consumer Aggregator Endpoints

When official nodes enforce strict rate blocks, the worker falls back to parsing structured internal API payloads exposed by consumer travel networks:

* **Alternative A (RailYatri Schema Extraction):** Target page layout embeds a specific `<script type="application/ld+json">` sequence containing real-time station delays and current tracking coordinates.
* **Alternative B (RunningStatus Data Block):** Evaluates backend API nodes (`/api/v1/running-status/{train_number}`) using structured payload extractions.

---

## 2. Ingestion Session & Anti-Blocking Runbook

To prevent the application's backend server IPs from being blacklisted by Upstream Web Application Firewalls (such as Cloudflare or Akamai), the scraping background loop must mimic a legitimate human web session.

### 2.1 The Header Handshake Protocol

Every outbound asynchronous HTTP request must pass a highly customized payload header matrix. Hardcoded configurations will trigger immediate session rejection.

```ini
[Target Handshake Mapping]
User-Agent = Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36
Accept = application/json, text/javascript, */*; q=0.01
Accept-Language = en-US,en;q=0.9
X-Requested-With = XMLHttpRequest
Origin = https://ntes.indianrail.gov.in
Referer = https://ntes.indianrail.gov.in/
Connection = keep-alive

```

### 2.2 Client Ingestion Routine & Session Cycle

1. **Cookie Handshake:** Before asking for train statuses, the script must query the base home domain (`/`) to extract valid, ephemeral session cookies (`ASP.NET_SessionId` or custom tracking tokens).
2. **State Injection:** Attach the recovered cookies to the active `httpx.AsyncClient()` session context before dispatching the real-time target data query.
3. **User-Agent Rotation:** Maintain a local table of 50+ validated, modern browser agent strings. Rotate this token randomly on every execution loop.

---

## 3. Rate Limiting & The Redis Invalidation Matrix

To preserve server performance and remain below blocking thresholds, outgoing scraper requests are strictly throttled using a **Distributed Token Bucket** system implemented via Redis.

```
                  [ Outbound Ingestion Request ]
                                │
                                ▼
               { Redis: Has token bucket space? }
                 /                            \
           (Yes) /                              \ (No)
                ▼                                ▼
       Execute Live Fetch                 Read Cached State
   (Reset Redis TTL to 120s)             (No Outbound Call)

```

### 3.1 Caching Constraints

* **Active Train Invalidation Window:** **120 seconds**. If a map client requests coordinates for Train `12301` and the corresponding key `train:12301:raw` exists in Redis, the backend yields the cached data instead of executing an outbound network fetch.
* **Inactive Train Cool-Down Window:** **30 minutes**. If a train is outside its active running window (based on static schedule tables), the system sets a long-duration cache block to prevent dead queries.

---

## 4. Ingestion Error Handling & Failure Recovery Matrix

Upstream structural updates can break string parsers without warning. The background daemon handles failures using a programmatic recovery ladder.

| Incident Pattern | Root Cause Target | Immediate Automated Action | System State Notification |
| --- | --- | --- | --- |
| **HTTP `403 Forbidden**` | IP block or cookie validation failure. | Clear active session context; rotate outbound proxy node; wait 30 seconds before retry. | Warning flagged to system logs. |
| **HTTP `429 Too Many Requests**` | Scraper rate limits exceeded. | Double the specific train's Redis TTL window dynamically; drop execution priority queue. | Operational throttling engaged. |
| **JSON Serialization Error** | Upstream API payload schema layout changed. | Drop string parser layer; invoke BeautifulSoup regex fallback parser block instantly. | Developer alert dispatch via Webhook. |

---

## 5. Script Core Validation Check

The ingestion worker must validate that any parsed payload includes these key structural primitives before passing data down the processing chain:

```json
{
  "status": "VALIDATED",
  "payload_primitives": {
    "train_number": "MUST_BE_STRING_5_DIGITS",
    "last_location_node": "MUST_BE_VALID_STATION_CODE",
    "delay_metric": "MUST_BE_INTEGER_MINUTES",
    "geometry_marker": "OPTIONAL_LAT_LNG_ARRAY"
  }
}

```

If these primitives are missing, the worker discards the data packet to prevent dirty calculations from breaking the downstream WebGL canvas.

---

Document 4 (Ingestion API & Scraping Runbook) is complete. The next piece in the engineering sequence is **Document 5: Open-Core Repository & Sync Manifesto**. Let me know when you want to proceed.