# FeatureFlags

Lightweight feature flag helpers for Prisma-backed services.

## Overview
- Validates feature flag keys with `^[a-z0-9_.-]+$` (case-insensitive).
- Ensures flags exist with defaults (`ensureFeatureFlag`).
- Evaluates flags with optional scoped overrides (`isFeatureFlagEnabled`).

## Installation
```sh
npm install @rafiki270/feature-flags
```

## Admin UI

Use the reusable React page to manage flags in the admin:

```jsx
import { FeatureFlagsPage } from "@rafiki270/feature-flags/admin";
import { apiFetch } from "./api";

export default function Flags() {
  return <FeatureFlagsPage apiFetch={apiFetch} />;
}
```

### Props

- `apiFetch(url, options?)`: async function matching `fetch` signature, expected to throw on non-2xx.
- `definitions?`: override the default `featureFlagDefinitions` array.
- `title?`: custom page heading (default: `"Future flags"`).

## Client-side caching (CSR)

You can load feature flags once per session and reuse them without repeated requests:

```ts
import { loadFlagsOnce, useFlags } from "@rafiki270/feature-flags";

// Somewhere in your bootstrapping code:
await loadFlagsOnce(apiFetch); // populates in-memory cache

// Later in components or services:
const { flags, loaded, error } = useFlags(apiFetch);
```

`loadFlagsOnce(fetchImpl, endpoint?)` loads `/feature-flags` by default, caches the array, and returns it. `useFlags` returns the cached flags synchronously (and triggers a load on first call if not already loaded).

### Required API endpoints

The page expects these API routes (methods and payloads):

- `GET /feature-flags` → returns array of flags.
- `POST /feature-flags` → create `{ key, description?, defaultEnabled? }`.
- `PATCH /feature-flags/:key` → update `{ description?, defaultEnabled? }`.
- `DELETE /feature-flags/:key` → delete a flag.

Each response should return the flag shape:

```json
{
  "id": "uuid",
  "key": "admin.feature_key",
  "description": "string or null",
  "defaultEnabled": false,
  "metadata": {}
}
```

## Prisma schema requirements
Your Prisma schema must include `FeatureFlag` and `FeatureFlagOverride` models.

```prisma
model FeatureFlag {
  id             String                @id @default(uuid())
  key            String                @unique
  description    String?
  defaultEnabled Boolean               @default(false)
  metadata       Json?
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
  overrides      FeatureFlagOverride[]
}

model FeatureFlagOverride {
  id                String      @id @default(uuid())
  flagId            String
  scope             String      @default("platform")
  targetKey         String?
  enabled           Boolean     @default(false)
  rolloutPercentage Int?
  metadata          Json?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  flag              FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)

  @@index([flagId])
  @@index([scope, targetKey])
  @@unique([flagId, scope, targetKey])
}
```

## API

### ensureFeatureFlag(prisma, key, options?)
Creates a flag if missing, or fills missing description/metadata when present.

Options:
- `description?: string`
- `defaultEnabled?: boolean`
- `metadata?: unknown`

### isFeatureFlagEnabled(prisma, key, options?)
Evaluates a flag with optional scoped override. If `autoCreate` is true and the flag
does not exist, it will be created with defaults.

Options:
- `scope?: string` (default: `platform`)
- `targetKey?: string | null`
- `description?: string`
- `defaultEnabled?: boolean`
- `metadata?: unknown`
- `autoCreate?: boolean` (default: true)

## Override behavior
- Overrides are matched by `scope` + `targetKey`.
- If `rolloutPercentage` is <= 0, the override is disabled.
- If `rolloutPercentage` is >= 100, the override fully applies.
- Otherwise, the override `enabled` value is returned as-is.
