# 📄 Technical Document 7: `CONTRIBUTING.md` & Local Environment Setup Guide

**Project Name:** MapMyTrain (Core Engine)

**Author:** Community & Open Source Operations

**Status:** Published to Public Repository

**Version:** 1.0.0

---

## 1. Welcome to the Core Engine

Thank you for your interest in contributing to the open-source core of **MapMyTrain**! This document outlines the patterns, standards, and setup instructions required to get your local environment running using entirely free, open-source mock datasets and asset pipelines.

By contributing to this repository, you help democratize high-performance, visual transit data for millions of commuters.

---

## 2. Local Development Environment Setup

To work on the frontend map canvas or the baseline FastAPI routes without requiring live enterprise API credentials or private proxy keys, you will configure the application to run entirely in **Local Mock Mode**.

### 2.1 Prerequisites

Ensure your local development machine has the following dependencies installed globally:

* **Node.js:** v20.x or higher (Long Term Support)
* **Python:** v3.11.x or higher
* **Docker & Docker Compose:** For running the local spatial stack (PostGIS/Redis)

### 2.2 Step-by-Step Installation

#### Step 1: Clone the Core Repository

```bash
git clone https://github.com/your-org/map-my-train-core.git
cd map-my-train-core

```

#### Step 2: Configure Local Environment Variables

Copy the development environment template into an active runtime file:

```bash
cp .env.example .env.local

```

Open `.env.local` and ensure the following flags are enabled to run the app without upstream enterprise keys:

```env
NEXT_PUBLIC_USE_MOCK_TELEMETRY=true
NEXT_PUBLIC_TILE_SERVER_URL=http://localhost:8080

```

#### Step 3: Install Frontend Dependencies

```bash
npm install

```

#### Step 4: Launch the Local Infrastructure Stack

Spin up the localized database and caching layers via Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up -d

```

#### Step 5: Start the Next.js Local Server

```bash
npm run dev

```

Open your browser and navigate to `http://localhost:3000`. You will see the MapLibre canvas rendering static vector railroad lines with mock train coordinates moving across the viewport.

---

## 3. Git Branching & Workflow Strategy

We use a modified Git Flow model to protect production stability while keeping community code integration fluid.

```
[ main ] ───────────────► Production Stable Releases
    ▲
    │ (Strict Pull Request Review + CI Validation Pass)
[ develop ] ────────────► Integration & Staging Branch
    ▲
    ├── feature/map-glow-effect ──► (Your Feature Branch)
    └── bugfix/ios-canvas-crash  ──► (Your Bugfix Branch)

```

### branch Naming Conventions

* **Features:** `feature/your-feature-name` (e.g., `feature/custom-marker-rotation`)
* **Bug Fixes:** `bugfix/issue-tracker-id` (e.g., `bugfix/fix-redis-cache-leak`)
* **Documentation:** `docs/short-description` (e.g., `docs/update-api-endpoints`)

---

## 4. Coding Standards & Quality Assurance

To maintain a highly optimized WebGL execution pipeline (targeting a consistent **60 FPS** performance metric), code contributions must adhere to these rigid optimization principles:

### 4.1 React & TypeScript Constraints

* **Avoid Unnecessary Re-renders:** Map viewport configuration state objects must be held inside React refs (`useRef`) rather than traditional components state (`useState`) to prevent re-initializing the core WebGL canvas context during UI renders.
* **Strict Type Safety:** The use of `any` types is strictly forbidden. All spatial payloads must map directly to explicit TypeScript interfaces matching GeoJSON specifications (e.g., `GeoJSON.FeatureCollection`).

### 4.2 Automated Code Linting

Before committing your files, run the integrated testing pipeline to automatically format and catch syntax discrepancies:

```bash
# Run linting optimization check
npm run lint

# Execute local component test assertions
npm run test

```

---

## 5. Pull Request (PR) Submission Checklist

When you are ready to submit your code modifications back to the `develop` branch, verify that your PR meets these criteria:

1. **Clean Baseline Documentation:** The code includes descriptive inline comments around complex spatial mathematical blocks (e.g., custom linear interpolation components).
2. **Mock Mode Longevity:** The feature operates completely and flawlessly when `NEXT_PUBLIC_USE_MOCK_TELEMETRY` is set to `true`.
3. **Commit Cleanliness:** Commits are squashed into clear logical milestones using conventional changelog prefixes (e.g., `feat: add neon glow styling to station nodes`).
4. **Performance Verification:** Panning and zooming across dense track sections does not drop browser frame rendering times below stable operating levels.

---

Document 7 (`CONTRIBUTING.md` & Local Environment Setup Guide) is complete. The eighth and final document in the sequence is **Document 8: Open Database License (ODbL) Compliance Memo**. Let me know when you are ready to generate it.