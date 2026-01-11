export const FEATURE_FLAG_KEY_PATTERN = /^[a-z0-9_.-]+$/i;

const normalizeKey = (value) => String(value || "").trim();

export const featureFlagDefinitions = [
  {
    key: "admin.overview_metrics",
    description: "Overview performance metrics and KPIs.",
    defaultEnabled: false,
  },
  {
    key: "admin.pipeline_health",
    description: "Pipeline health monitoring and alert cards.",
    defaultEnabled: false,
  },
  {
    key: "admin.activity_stream",
    description: "Recent activity feed for releases and builds.",
    defaultEnabled: false,
  },
  {
    key: "admin.storage_usage",
    description: "Storage usage breakdown across teams.",
    defaultEnabled: false,
  },
  {
    key: "admin.future_flags",
    description: "Feature flag management workspace.",
    defaultEnabled: false,
  },
  {
    key: "admin.security_posture",
    description: "Security posture reporting and access reviews.",
    defaultEnabled: false,
  },
  {
    key: "admin.workspace_settings",
    description: "Workspace settings and team administration.",
    defaultEnabled: false,
  },
];

export const resolveFeatureFlagDefaults = (key, definitions = featureFlagDefinitions) =>
  definitions.find((flag) => flag.key === key);

export const ensureFeatureFlags = async (prisma, definitions = featureFlagDefinitions) => {
  await Promise.all(
    definitions.map((flag) =>
      ensureFeatureFlag(prisma, flag.key, {
        description: flag.description,
        defaultEnabled: flag.defaultEnabled,
      }),
    ),
  );
};

export const validateFeatureFlagKey = (key) => FEATURE_FLAG_KEY_PATTERN.test(normalizeKey(key));

export const ensureFeatureFlag = async (prisma, key, options = {}) => {
  const normalizedKey = normalizeKey(key);
  if (!FEATURE_FLAG_KEY_PATTERN.test(normalizedKey)) {
    throw new Error("Feature flag keys must only contain letters, numbers, '.', '-', or '_' characters.");
  }

  const { description = null, defaultEnabled = false, metadata } = options;
  const createData = {
    key: normalizedKey,
    description: description ?? null,
    defaultEnabled: Boolean(defaultEnabled),
  };
  if (metadata !== undefined) {
    createData.metadata = metadata ?? null;
  }

  try {
    return await prisma.featureFlag.create({ data: createData });
  } catch (error) {
    if (error?.code === "P2002") {
      const existing = await prisma.featureFlag.findUnique({ where: { key: normalizedKey } });
      if (!existing) {
        throw error;
      }

      const updateData = {};
      let shouldUpdate = false;
      if (!existing.description && description) {
        updateData.description = description;
        shouldUpdate = true;
      }
      if (existing.metadata == null && metadata !== undefined) {
        updateData.metadata = metadata ?? null;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        return prisma.featureFlag.update({
          where: { key: normalizedKey },
          data: updateData,
        });
      }

      return existing;
    }

    throw error;
  }
};

export const deleteFeatureFlag = async (prisma, key) => {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) {
    return null;
  }
  const existing = await prisma.featureFlag.findUnique({ where: { key: normalizedKey } });
  if (!existing) {
    return null;
  }
  return prisma.featureFlag.delete({ where: { key: normalizedKey } });
};

export const isFeatureFlagEnabled = async (prisma, key, options = {}) => {
  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) {
    return false;
  }

  const {
    scope = "platform",
    targetKey = null,
    description = null,
    defaultEnabled = false,
    metadata,
    autoCreate = true,
  } = options;

  let flag = await prisma.featureFlag.findUnique({ where: { key: normalizedKey } });

  if (!flag && autoCreate) {
    flag = await ensureFeatureFlag(prisma, normalizedKey, {
      description,
      defaultEnabled,
      metadata,
    });
  }

  if (!flag) {
    return Boolean(defaultEnabled);
  }

  if (scope !== "platform" || targetKey !== null) {
    const override = await prisma.featureFlagOverride.findFirst({
      where: {
        flagId: flag.id,
        scope,
        targetKey: targetKey ?? null,
      },
    });

    if (override) {
      if (override.rolloutPercentage != null) {
        if (override.rolloutPercentage <= 0) {
          return false;
        }
        if (override.rolloutPercentage >= 100) {
          return Boolean(override.enabled);
        }
      }
      return Boolean(override.enabled);
    }
  }

  return Boolean(flag.defaultEnabled);
};

export const listFeatureFlags = async (prisma, options = {}) => {
  const { limit = 20, offset = 0, definitions = featureFlagDefinitions } = options;
  await ensureFeatureFlags(prisma, definitions);
  return prisma.featureFlag.findMany({
    skip: offset,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};
