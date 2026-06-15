# Contributing to MapMyTrain Core

Thank you for your interest in contributing to the open-source core of **MapMyTrain**! This document outlines the patterns, standards, and setup instructions required to get your local environment running.

## Local Development Environment Setup

### Prerequisites

- **Node.js:** v20.x or higher
- **Python:** v3.11.x or higher
- **Docker & Docker Compose:** For running the local spatial stack (PostGIS/Redis)

### Step-by-Step Installation

#### Step 1: Clone the Core Repository

```bash
git clone https://github.com/your-org/map-my-train-core.git
cd map-my-train-core
```

#### Step 2: Configure Local Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and ensure mock mode is enabled:

```env
NEXT_PUBLIC_USE_MOCK_TELEMETRY=true
NEXT_PUBLIC_TILE_SERVER_URL=http://localhost:8080
```

#### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

#### Step 4: Launch the Local Infrastructure Stack

```bash
docker compose -f docker-compose.dev.yml up -d
```

#### Step 5: Start the Next.js Local Server

```bash
cd frontend
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

## Git Branching & Workflow Strategy

```
[ main ] ───────────────► Production Stable Releases
    ▲
    │ (Strict Pull Request Review + CI Validation Pass)
[ develop ] ────────────► Integration & Staging Branch
    ▲
    ├── feature/map-glow-effect ──► (Your Feature Branch)
    └── bugfix/ios-canvas-crash  ──► (Your Bugfix Branch)
```

### Branch Naming Conventions

- **Features:** `feature/your-feature-name`
- **Bug Fixes:** `bugfix/issue-tracker-id`
- **Documentation:** `docs/short-description`

## Coding Standards & Quality Assurance

### React & TypeScript Constraints

- **Avoid Unnecessary Re-renders:** Map viewport configuration state objects must be held inside React refs (`useRef`) rather than traditional component state (`useState`).
- **Strict Type Safety:** The use of `any` types is strictly forbidden.

### Automated Code Linting

```bash
# Run linting check
npm run lint

# Execute local component test assertions
npm run test
```

## Pull Request (PR) Submission Checklist

1. **Clean Baseline Documentation:** The code includes descriptive inline comments around complex spatial mathematical blocks.
2. **Mock Mode Longevity:** The feature operates completely when `NEXT_PUBLIC_USE_MOCK_TELEMETRY` is set to `true`.
3. **Commit Cleanliness:** Commits are squashed into clear logical milestones using conventional changelog prefixes.
4. **Performance Verification:** Panning and zooming across dense track sections does not drop browser frame rendering times below stable operating levels.

## License

By contributing to MapMyTrain Core, you agree that your contributions will be licensed under the same license as the project.
