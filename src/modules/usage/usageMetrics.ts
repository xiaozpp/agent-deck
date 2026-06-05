import type { UsageQuery, UsageReport, UsageWorkspaceEntry } from "../../types";

export function formatNumber(value?: number) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value || 0);
}

export function formatCompact(value?: number) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

export function formatCost(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function totalValue(report: UsageReport | null, keys: string[], fallback = 0) {
  const totals = report?.ccusage?.totals || {};
  for (const key of keys) {
    const value = Number(totals[key]);
    // Only trust ccusage when it actually has a positive value; ccusage often
    // returns a totals object full of zeros (when it found nothing on disk),
    // and those zeros must not shadow the tokscale-derived fallback.
    if (Number.isFinite(value) && value > 0) return value;
  }
  return fallback;
}

export function mergeProjects(entries: UsageWorkspaceEntry[] = []) {
  const map = new Map<string, UsageWorkspaceEntry & { rowCount: number; models: Set<string> }>();
  for (const entry of entries) {
    if (!entry) continue;
    const key = `${entry.client || "unknown"}:${entry.workspaceLabel || entry.workspaceKey || "unknown"}`;
    const current = map.get(key) || {
      client: entry.client,
      workspaceKey: entry.workspaceKey,
      workspaceLabel: entry.workspaceLabel || entry.workspaceKey,
      input: 0,
      output: 0,
      cacheRead: 0,
      reasoning: 0,
      messageCount: 0,
      cost: 0,
      rowCount: 0,
      models: new Set<string>(),
      existsLocally: entry.existsLocally,
      displayPath: entry.displayPath,
      realName: entry.realName,
    };
    current.input = (current.input || 0) + (Number(entry.input) || 0);
    current.output = (current.output || 0) + (Number(entry.output) || 0);
    current.cacheRead = (current.cacheRead || 0) + (Number(entry.cacheRead) || 0);
    current.reasoning = (current.reasoning || 0) + (Number(entry.reasoning) || 0);
    current.messageCount = (current.messageCount || 0) + (Number(entry.messageCount) || 0);
    current.cost = (current.cost || 0) + (Number(entry.cost) || 0);
    current.rowCount += 1;
    if (entry.model) current.models.add(entry.model);
    map.set(key, current);
  }

  return [...map.values()]
    .map((entry) => ({ ...entry, model: [...entry.models].join(", ") || "-" }))
    .sort((a, b) => (b.cost || 0) - (a.cost || 0));
}

export type MergedProject = ReturnType<typeof mergeProjects>[number];
export type ProjectGroup = MergedProject & { children: MergedProject[]; clients: string[]; groupKey: string };

const CLIENT_LABELS: Record<string, string> = {
  codex: "Codex",
  claude: "Claude",
  antigravity: "反重力",
};

export function clientLabel(client?: string) {
  return (client && CLIENT_LABELS[client]) || client || "未知";
}

// Two same-folder projects only differ by drive-letter case (D: vs d:) and
// slashes, so normalize the path; fall back to the display name otherwise.
function projectGroupKey(row: MergedProject): string {
  const path = (row.displayPath || "").trim();
  if (path) return "path:" + path.toLowerCase().replace(/\\/g, "/").replace(/\/+$/, "");
  const name = row.realName || row.workspaceLabel || row.workspaceKey || "unknown";
  return "name:" + String(name).toLowerCase();
}

// In "全部" mode the same project shows up once per client; collapse those into
// one parent row (summed) whose children are the per-client breakdown.
export function groupProjects(rows: MergedProject[], isAll: boolean): ProjectGroup[] {
  if (!isAll) {
    return rows.map((row) => ({
      ...row,
      children: [],
      clients: row.client ? [row.client] : [],
      groupKey: `${row.client}:${row.workspaceLabel || row.workspaceKey}`,
    }));
  }

  const groups = new Map<string, ProjectGroup>();
  // Children are consolidated per client, so antigravity's per-conversation rows
  // that map to the same folder show up as one "反重力" line, not several.
  const childMaps = new Map<string, Map<string, MergedProject>>();

  for (const row of rows) {
    const groupKey = projectGroupKey(row);
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        ...row,
        models: new Set(row.models),
        children: [],
        clients: [],
        groupKey,
        input: 0,
        output: 0,
        cacheRead: 0,
        reasoning: 0,
        messageCount: 0,
        cost: 0,
      };
      groups.set(groupKey, group);
      childMaps.set(groupKey, new Map());
    }

    group.input = (group.input || 0) + (Number(row.input) || 0);
    group.output = (group.output || 0) + (Number(row.output) || 0);
    group.cacheRead = (group.cacheRead || 0) + (Number(row.cacheRead) || 0);
    group.reasoning = (group.reasoning || 0) + (Number(row.reasoning) || 0);
    group.messageCount = (group.messageCount || 0) + (Number(row.messageCount) || 0);
    group.cost = (group.cost || 0) + (Number(row.cost) || 0);
    for (const m of row.models) group.models.add(m);
    // Adopt a real folder name/path if the representative was missing one.
    if (!group.displayPath && row.displayPath) {
      group.displayPath = row.displayPath;
      group.realName = row.realName || group.realName;
    }

    const childMap = childMaps.get(groupKey)!;
    const clientKey = row.client || "unknown";
    const child = childMap.get(clientKey);
    if (!child) {
      childMap.set(clientKey, { ...row, models: new Set(row.models) });
    } else {
      child.input = (child.input || 0) + (Number(row.input) || 0);
      child.output = (child.output || 0) + (Number(row.output) || 0);
      child.cacheRead = (child.cacheRead || 0) + (Number(row.cacheRead) || 0);
      child.reasoning = (child.reasoning || 0) + (Number(row.reasoning) || 0);
      child.messageCount = (child.messageCount || 0) + (Number(row.messageCount) || 0);
      child.cost = (child.cost || 0) + (Number(row.cost) || 0);
      for (const m of row.models) child.models.add(m);
      if (row.existsLocally === true) child.existsLocally = true;
    }
  }

  return [...groups.values()]
    .map((group) => {
      const children = [...childMaps.get(group.groupKey)!.values()]
        .map((child) => ({ ...child, model: [...child.models].join(", ") || "-" }))
        .sort((a, b) => (b.cost || 0) - (a.cost || 0));
      return {
        ...group,
        model: [...group.models].join(", ") || "-",
        // A group is "失效" only if every contributing client's folder is gone.
        existsLocally: children.some((c) => c.existsLocally !== false),
        clients: children.map((c) => c.client || "unknown"),
        children,
      };
    })
    .sort((a, b) => (b.cost || 0) - (a.cost || 0));
}

export type DayBucket = { date: string; cost: number; tokens: number };

export function parseHourString(value?: string) {
  if (!value) return null;
  const match = String(value).match(/(\d{4})-?(\d{2})-?(\d{2})[\sT_-]?(\d{2})/);
  if (!match) return null;
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    hour: Number(match[4]),
  };
}

export function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function aggregateDays(
  report: UsageReport | null,
  hourly: Array<{ hour?: string; month?: string; cost?: number }> = [],
): DayBucket[] {
  const map = new Map<string, DayBucket>();
  const daily = (report?.ccusage?.daily as Array<Record<string, unknown>>) || [];
  for (const row of daily) {
    const date = String(row.date || row.day || row.startDate || "").slice(0, 10);
    if (!date) continue;
    const cost = Number(row.costUSD ?? row.totalCost ?? row.cost ?? 0) || 0;
    const tokens =
      Number(row.totalTokens ?? 0) ||
      (Number(row.inputTokens ?? 0) || 0) + (Number(row.outputTokens ?? 0) || 0);
    const existing = map.get(date) || { date, cost: 0, tokens: 0 };
    existing.cost += cost;
    existing.tokens += tokens;
    map.set(date, existing);
  }
  // Days that ccusage already covered — don't double-count those from hourly.
  const daysFromDaily = new Set(map.keys());
  for (const entry of hourly) {
    const parsed = parseHourString(entry.hour);
    if (!parsed) continue;
    if (daysFromDaily.has(parsed.date)) continue; // ccusage is authoritative for this day
    const e = entry as { cost?: number; input?: number; output?: number; totalTokens?: number };
    const cost = Number(e.cost || 0);
    const tokens = Number(e.totalTokens ?? 0) || (Number(e.input ?? 0) || 0) + (Number(e.output ?? 0) || 0);
    const existing = map.get(parsed.date) || { date: parsed.date, cost: 0, tokens: 0 };
    existing.cost += cost;
    existing.tokens += tokens;
    map.set(parsed.date, existing);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function computeStreaks(days: DayBucket[]) {
  if (days.length === 0) return { current: 0, longest: 0, active: 0 };
  const set = new Set(days.filter((d) => d.cost > 0 || d.tokens > 0).map((d) => d.date));
  const active = set.size;
  let longest = 0;
  let run = 0;
  const sorted = [...set].sort();
  let prev: Date | null = null;
  for (const key of sorted) {
    const cur = new Date(`${key}T00:00:00`);
    if (prev && (cur.getTime() - prev.getTime()) / 86400000 === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = cur;
  }
  let current = 0;
  const todayStr = dayKey(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = dayKey(yesterdayObj);

  let streakCursorStr = "";
  if (set.has(todayStr)) {
    streakCursorStr = todayStr;
  } else if (set.has(yesterdayStr)) {
    streakCursorStr = yesterdayStr;
  }

  if (streakCursorStr) {
    current = 1;
    const checkDate = new Date(streakCursorStr + "T00:00:00");
    for (let i = 0; i < set.size; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const prevKey = dayKey(checkDate);
      if (set.has(prevKey)) {
        current += 1;
      } else {
        break;
      }
    }
  }
  return { current, longest, active };
}

export function peakHour(hourly: Array<{ hour?: string; cost?: number }>) {
  const buckets = new Map<number, number>();
  for (const entry of hourly) {
    const parsed = parseHourString(entry.hour);
    if (!parsed) continue;
    buckets.set(parsed.hour, (buckets.get(parsed.hour) || 0) + Number(entry.cost || 0));
  }
  if (buckets.size === 0) return "—";
  const top = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const label = top === 0 ? "12 AM" : top < 12 ? `${top} AM` : top === 12 ? "12 PM" : `${top - 12} PM`;
  return label;
}

export function favoriteModel(entries: UsageWorkspaceEntry[] = []) {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.model) continue;
    map.set(entry.model, (map.get(entry.model) || 0) + Number(entry.cost || 0));
  }
  if (map.size === 0) return "—";
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function buildHeatmap(days: DayBucket[], weeks: number) {
  const map = new Map(days.map((d) => [d.date, d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - (weeks * 7 - 1));
  // align start to a Sunday for a tidy grid
  start.setDate(start.getDate() - start.getDay());
  const totalCells = weeks * 7;
  const cells: Array<{ date: string; level: number; cost: number }> = [];
  let max = 0;
  for (let i = 0; i < totalCells; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKey(d);
    const cost = map.get(key)?.cost || 0;
    if (cost > max) max = cost;
    cells.push({ date: key, level: 0, cost });
  }
  return cells.map((cell) => {
    if (max === 0 || cell.cost === 0) return { ...cell, level: 0 };
    const ratio = cell.cost / max;
    const level = ratio > 0.66 ? 4 : ratio > 0.33 ? 3 : ratio > 0.12 ? 2 : 1;
    return { ...cell, level };
  });
}

export type ChartGranularity = "day" | "week" | "month";

export type ChartPoint = {
  label: string;
  cost: number;
};

export function buildUsageChartData({
  range,
  granularity,
  hourly = [],
  days = [],
}: {
  range: UsageQuery["range"];
  granularity: ChartGranularity;
  hourly?: Array<{ hour?: string; cost?: number }>;
  days?: DayBucket[];
}): ChartPoint[] {
  if (range === "today") {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, "0")}:00`,
      cost: 0,
    }));
    for (const entry of hourly) {
      if (!entry) continue;
      const parsed = parseHourString(entry.hour);
      if (!parsed) continue;
      if (parsed.hour >= 0 && parsed.hour < 24 && hours[parsed.hour]) {
        hours[parsed.hour].cost += Number(entry.cost) || 0;
      }
    }
    return hours;
  }

  if (granularity === "week") {
    const map = new Map<string, { label: string; cost: number; sortKey: string }>();
    for (const d of days) {
      if (!d?.date) continue;
      const dateObj = new Date(`${d.date}T00:00:00`);
      if (Number.isNaN(dateObj.getTime())) continue;
      const sunday = new Date(dateObj);
      sunday.setDate(dateObj.getDate() - dateObj.getDay());
      const key = dayKey(sunday);
      const label = `${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}周`;
      const existing = map.get(key) || { label, cost: 0, sortKey: key };
      existing.cost += Number(d.cost) || 0;
      map.set(key, existing);
    }
    return [...map.values()]
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, cost }) => ({ label, cost }));
  }

  if (granularity === "month") {
    const map = new Map<string, { label: string; cost: number; sortKey: string }>();
    for (const d of days) {
      if (!d?.date) continue;
      const parts = d.date.split("-");
      if (parts.length < 2) continue;
      const key = `${parts[0]}-${parts[1]}`;
      const label = `${parseInt(parts[1], 10)}月`;
      const existing = map.get(key) || { label, cost: 0, sortKey: key };
      existing.cost += Number(d.cost) || 0;
      map.set(key, existing);
    }
    return [...map.values()]
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, cost }) => ({ label, cost }));
  }

  if (range === "week") {
    const today = new Date();
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dayKey(d);
      list.push({
        key,
        label: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        cost: 0,
      });
    }
    const dayMap = new Map(days.map((d) => [d.date, Number(d.cost) || 0]));
    return list.map((item) => ({ label: item.label, cost: dayMap.get(item.key) || 0 }));
  }

  if (range === "month") {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const diffDays = Math.max(0, Math.round((todayMs - startMs) / 86400000));
    const dayMap = new Map(days.map((d) => [d.date, Number(d.cost) || 0]));

    const list = [];
    for (let i = 0; i <= diffDays; i++) {
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = dayKey(cursor);
      list.push({
        label: `${String(cursor.getDate()).padStart(2, "0")}日`,
        cost: dayMap.get(key) || 0,
      });
    }
    return list;
  }

  return days
    .filter((d) => d?.date)
    .map((d) => {
      const dateObj = new Date(`${d.date}T00:00:00`);
      if (Number.isNaN(dateObj.getTime())) return null;
      return {
        label: `${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`,
        cost: Number(d.cost) || 0,
      };
    })
    .filter((item): item is ChartPoint => item != null);
}

export const MOBY_DICK_TOKENS = 270_000;

export const rangeTabs: Array<{ id: UsageQuery["range"]; label: string }> = [
  { id: "all", label: "全部" },
  { id: "year", label: "本年" },
  { id: "month", label: "本月" },
  { id: "week", label: "7 天" },
  { id: "today", label: "今天" },
];
