import { useCallback, useEffect, useMemo, useState } from "react";

import { featureFlagDefinitions } from "../index.js";

const emptyForm = {
  key: "",
  description: "",
  defaultEnabled: false,
};

const normalizeDescription = (value) => {
  if (value == null) return "";
  const trimmed = String(value).trim();
  return trimmed === "(null)" ? "" : trimmed;
};

const FeatureFlagsPage = ({ apiFetch, definitions = featureFlagDefinitions, title = "Future flags" }) => {
  const [flags, setFlags] = useState([]);
  const [activeFlagKey, setActiveFlagKey] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedFlags = useMemo(
    () => [...flags].sort((a, b) => a.key.localeCompare(b.key)),
    [flags],
  );

  const loadFlags = useCallback(async () => {
    if (!apiFetch) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await apiFetch("/feature-flags");
      const items = Array.isArray(response) ? response : [];
      setFlags(items);
    } catch (loadError) {
      setLoadError(loadError instanceof Error ? loadError.message : "Unable to load flags.");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  const handleToggle = async (flag) => {
    if (!apiFetch) return;
    setError("");
    try {
      const updated = await apiFetch(`/feature-flags/${encodeURIComponent(flag.key)}`, {
        method: "PATCH",
        body: JSON.stringify({ defaultEnabled: !flag.defaultEnabled }),
      });
      setFlags((prev) => prev.map((item) => (item.key === flag.key ? updated : item)));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update flag.");
    }
  };

  const handleEdit = (flag) => {
    setError("");
    setActiveFlagKey(flag.key);
    setFormValues({
      key: flag.key,
      description: normalizeDescription(flag.description),
      defaultEnabled: flag.defaultEnabled,
    });
  };

  const resetForm = () => {
    setActiveFlagKey(null);
    setFormValues(emptyForm);
    setError("");
  };

  const handleDelete = (flag) => {
    setPendingDelete(flag);
  };

  const confirmDelete = () => {
    if (!pendingDelete || !apiFetch) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    apiFetch(`/feature-flags/${encodeURIComponent(pendingDelete.key)}`, {
      method: "DELETE",
    })
      .then(() => {
        setFlags((prev) => prev.filter((flag) => flag.key !== pendingDelete.key));
        if (activeFlagKey === pendingDelete.key) {
          resetForm();
        }
        setPendingDelete(null);
      })
      .catch((actionError) => {
        setError(actionError instanceof Error ? actionError.message : "Unable to delete flag.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleSubmit = async () => {
    if (!apiFetch) return;
    setError("");
    if (!formValues.key.trim()) {
      setError("Flag key is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (activeFlagKey) {
        const updated = await apiFetch(`/feature-flags/${encodeURIComponent(activeFlagKey)}`, {
          method: "PATCH",
          body: JSON.stringify({
            description: formValues.description.trim() || null,
            defaultEnabled: formValues.defaultEnabled,
          }),
        });
        setFlags((prev) => prev.map((flag) => (flag.key === updated.key ? updated : flag)));
        resetForm();
        return;
      }

      const created = await apiFetch("/feature-flags", {
        method: "POST",
        body: JSON.stringify({
          key: formValues.key.trim(),
          description: formValues.description.trim() || null,
          defaultEnabled: formValues.defaultEnabled,
        }),
      });
      setFlags((prev) => [...prev, created]);
      resetForm();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save flag.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    void loadFlags();
  }, [loadFlags, definitions]);

  return (
    <div className="space-y-6">

      {loadError ? <p className="text-sm text-red-500">{loadError}</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {activeFlagKey ? "Edit flag" : "Create flag"}
          </h3>
          {activeFlagKey ? (
            <button
              type="button"
              className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              onClick={resetForm}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_2fr_1fr]">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Flag key
            </label>
            <input
              value={formValues.key}
              disabled={Boolean(activeFlagKey)}
              onChange={(event) => setFormValues((prev) => ({ ...prev, key: event.target.value }))}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="admin.feature_name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </label>
            <input
              value={formValues.description}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, description: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="What this flag enables"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Enabled</label>
            <button
              type="button"
              className={`h-8 w-16 rounded-full border ${
                formValues.defaultEnabled
                  ? "border-emerald-200 bg-emerald-500/20 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-500"
              }`}
              onClick={() =>
                setFormValues((prev) => ({ ...prev, defaultEnabled: !prev.defaultEnabled }))
              }
            >
              {formValues.defaultEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="h-11 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {activeFlagKey ? "Save changes" : "Create flag"}
          </button>
          <button
            type="button"
            className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600"
            onClick={resetForm}
            disabled={isSubmitting}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600">
          <span>Flags</span>
          <span className="text-xs text-slate-400">{sortedFlags.length} total</span>
        </div>
        <div className="space-y-2 px-4 pb-4">
          {isLoading ? (
            <div className="py-6 text-sm text-slate-500">Loading flags…</div>
          ) : null}
          {!isLoading && !sortedFlags.length ? (
            <div className="py-6 text-sm text-slate-500">No flags yet.</div>
          ) : null}
          {sortedFlags.map((flag) => (
            <div
              key={flag.key}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{flag.key}</p>
                <p className="truncate text-xs text-slate-500">
                  {normalizeDescription(flag.description) || "No description"}
                </p>
              </div>
              <button
                type="button"
                className={`h-9 rounded-full border px-4 text-xs font-semibold ${
                  flag.defaultEnabled
                    ? "border-emerald-200 bg-emerald-500/20 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
                onClick={() => handleToggle(flag)}
              >
                {flag.defaultEnabled ? "Enabled" : "Disabled"}
              </button>
              <button
                type="button"
                className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                onClick={() => handleEdit(flag)}
              >
                Edit
              </button>
              <button
                type="button"
                className="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-500"
                onClick={() => handleDelete(flag)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete future flag?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will remove {pendingDelete.key} from the rollout plan.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white"
                onClick={confirmDelete}
                disabled={isSubmitting}
              >
                Delete flag
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FeatureFlagsPage;
