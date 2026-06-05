import { useCallback, useEffect, useMemo, useState } from "react";

export type PresetFilterOption<TId extends string = string> = {
  id: TId;
  label: string;
};

export type PresetBase = {
  name: string;
  title: string;
  description: string;
  category: string;
  author: string;
};

export function usePresetMarket<TPreset extends PresetBase>({
  load,
  searchText,
  installedNames,
  filter,
  loadError,
}: {
  load: () => Promise<TPreset[]>;
  searchText: (preset: TPreset) => string;
  installedNames: Set<string>;
  filter?: (preset: TPreset, installed: boolean) => boolean;
  loadError: string;
}) {
  const [presets, setPresets] = useState<TPreset[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const reload = useCallback(async () => {
    await load()
      .then((items) => {
        setPresets(items);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : loadError));
  }, []);

  useEffect(() => {
    void reload();
  }, []);

  const categories = useMemo(
    () => ["all", ...new Set(presets.map((preset) => preset.category).filter(Boolean))],
    [presets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presets.filter((preset) => {
      const installed = installedNames.has(preset.name);
      if (category !== "all" && preset.category !== category) return false;
      if (filter && !filter(preset, installed)) return false;
      if (!q) return true;
      return searchText(preset).toLowerCase().includes(q);
    });
  }, [presets, installedNames, category, filter, query, searchText]);

  return {
    presets,
    error,
    setError,
    query,
    setQuery,
    category,
    setCategory,
    categories,
    filtered,
    reload,
  };
}
