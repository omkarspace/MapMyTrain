# 📄 Technical Document 5: Open-Core Repository & Sync Manifesto

**Project Name:** MapMyTrain

**Author:** DevOps & Security Architecture Team

**Status:** Approved / Enforced

**Version:** 1.0.0

---

## 1. Dual-Repository Topology

To maintain a healthy open-source community while safeguarding monetization mechanisms, commercial infrastructure keys, and proprietary analytical layers, **MapMyTrain** splits its codebase across two completely separate Git environments.

```
[ PUBLIC REPOSITORY: map-my-train-core ]
  └── Open-source Next.js frontend, MapLibre WebGL configurations, 
      base PostGIS migrations, and local mock-ingestion data.
         ▲
         │ (Ingested as a secure Git Submodule)
         ▼
[ PRIVATE REPOSITORY: map-my-train-prod ]
  ├── /core (Points directly to the public repository master head)
  ├── /premium (Proprietary Stripe webhooks, AdMob injection scripts)
  └── .env.production (Encrypted environment secrets)

```

---

## 2. Git Submodule Integration Runbook

The private production repository consumes the public repository as a core engine dependency. Developers must follow this strict sequence when initializing or modifying the dual-repo environment.

### 2.1 Initial Setup in the Private Repository

To inject the open-source engine into the production runtime workspace without duplicating source code, execute the following commands from the root of your **private** repository:

```bash
# Add the public core repository as a nested tracking module
git submodule add https://github.com/your-org/map-my-train-core.git core

# Initialize and pull the source files from the public tracking branch
git submodule update --init --recursive

```

### 2.2 Routine Development Workflow

When making changes that span both repository boundaries, implement modifications inside the public workspace first to avoid broken upstream builds.

```
[ Step 1: Commit & Push features inside /core directory to Public Master ]
                             │
                             ▼
[ Step 2: Step out to Private Root Directory ]
                             │
                             ▼
[ Step 3: Run: git submodule update --remote --merge ]
                             │
                             ▼
[ Step 4: Commit updated pointer reference inside Private Repository ]

```

---

## 3. Automated Sync Pipeline (GitHub Actions CI/CD)

To ensure the production app instantly inherits bug fixes submitted by the open-source community, a GitHub Action automates the downstream deployment pipeline.

Create the following workflow file inside the **public repository** at `.github/workflows/mirror-sync.yml`:

```yaml
name: Downstream Production Mirror Sync

on:
  push:
    branches: [ main ]

jobs:
  trigger-production-build:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch Sync Event to Private Repository
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.PRODUCTION_SYNC_PAT }}
          repository: your-org/map-my-train-prod
          event-type: update-submodule
          client-payload: '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}'

```

Inside the **private repository**, configure a corresponding listening action to capture the event, execute a fast-forward merge on the `/core` directory submodule pointer, and deploy the combined build straight to your hosting provider (Vercel, AWS EC2, or Docker cluster).

---

## 4. Isolation Framework: The `/premium` Override Pattern

The Next.js 14 application layer uses a clean dynamic loading strategy to injection-merge premium monetization modules without modifying public core files.

### 4.1 Implementation of the Client Wrapper Interface

Inside the public core repo, define a clean placeholder slot using structural React props:

```tsx
// Location: public-repo/components/map/AdBlockerWrapper.tsx
import React from 'react';

interface ComponentProps {
  children: React.ReactNode;
}

export default function AdBlockerWrapper({ children }: ComponentProps) {
  // Open-source core simply acts as a passthrough, doing nothing to the layout
  return <>{children}</>;
}

```

### 4.2 The Private Production Deployment Override

During the production compilation loop, your private repo overrides this directory workspace, swapping the passthrough component for your actual monetization modules:

```tsx
// Location: private-repo/premium/overrides/AdBlockerWrapper.tsx
import React from 'react';
import NativeAdBanner from '@/premium/components/NativeAdBanner';
import { useUserSubscription } from '@/premium/hooks/useUserSubscription';

export default function AdBlockerWrapper({ children }: { children: React.ReactNode }) {
  const { isPremiumUser } = useUserSubscription();

  // Premium users get a clean canvas view; free users see sandboxed ad frames
  if (isPremiumUser) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full">
      {children}
      <NativeAdBanner zoneId="canvas-bottom-overlay" />
    </div>
  );
}

```

---

## 5. Contributor Mocking Strategy

To enable open-source community contributors to safely test and run the full Next.js 14 and FastAPI map engine locally without giving them access to live, private scraping proxies, the core frontend includes a toggleable environment mock layer:

```env
# Location: public-repo/.env.example
NEXT_PUBLIC_USE_MOCK_TELEMETRY=true
NEXT_PUBLIC_CENTRAL_STATION_GEOJSON=/data/mock_india_live_tracks.json

```

When `NEXT_PUBLIC_USE_MOCK_TELEMETRY` is set to `true`, the MapLibre canvas stops listening to live production WebSockets and hooks into a localized static JSON file that continuously loops a handful of mock trains along predefined track shapes. This isolates production systems completely while keeping local contribution friction low.

---

Document 5 (Open-Core Repository & Sync Manifesto) is complete. The sixth and final piece in this suite is **Document 6: Infrastructure & Deployment Runbook (Docker/Compose Stack)**. Let me know when you are ready to generate it.