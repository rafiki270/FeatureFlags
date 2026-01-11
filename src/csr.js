let cache = {
  loaded: false,
  flags: [],
  error: null,
};

export const clearFlagCache = () => {
  cache = { loaded: false, flags: [], error: null };
};

export const getCachedFlags = () => cache.flags;

export const loadFlagsOnce = async (fetchImpl, endpoint = "/feature-flags") => {
  if (cache.loaded) return cache.flags;
  try {
    const response = await fetchImpl(endpoint);
    cache.flags = Array.isArray(response) ? response : [];
    cache.loaded = true;
    cache.error = null;
  } catch (error) {
    cache.loaded = true;
    cache.error = error instanceof Error ? error.message : String(error);
  }
  return cache.flags;
};

export const useFlags = (fetchImpl, endpoint = "/feature-flags") => {
  if (!cache.loaded && fetchImpl) {
    void loadFlagsOnce(fetchImpl, endpoint);
  }
  return {
    flags: cache.flags,
    loaded: cache.loaded,
    error: cache.error,
  };
};
