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
