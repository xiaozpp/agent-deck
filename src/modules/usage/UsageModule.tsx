import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toolApi } from "../../toolApi";
import { LineChart } from "./LineChart";
import { QuotaPanel } from "./QuotaPanel";
import { ProjectRankingPanel } from "./ProjectRankingPanel";
import {
  MOBY_DICK_TOKENS,
  aggregateDays,
  buildHeatmap,
  computeStreaks,
  favoriteModel,
  formatCompact,
  formatCost,
  formatNumber,
  buildUsageChartData,
  groupProjects,
  mergeProjects,
  peakHour,
  rangeTabs,
  totalValue,
} from "./usageMetrics";
import type { QuotaAccount, QuotaReport, UsageQuery, UsageReport } from "../../types";

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <strong className="stat-value" title={value}>{value}</strong>
      {hint && <small className="stat-hint">{hint}</small>}
    </div>
  );
}

export function UsageModule() {
  const [query, setQuery] = useState<UsageQuery>({ client: "all", range: "month", provider: "combined" });
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "models">("overview");
  const [projectPage, setProjectPage] = useState(1);
  const [hideDeleted, setHideDeleted] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [quota, setQuota] = useState<QuotaReport | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState("");

  useEffect(() => {
    setGranularity("day");
  }, [query.range]);

  async function refreshQuota() {
    setQuotaLoading(true);
    try {
      setQuota(await toolApi.quota());
    } catch {
      setQuota({ available: false, source: "cockpit-tools", reason: "读取配额数据失败。", providers: [] });
    } finally {
      setQuotaLoading(false);
    }
  }

  async function handleSwitchAccount(account: QuotaAccount) {
    if (!window.confirm(`切换 Codex 当前账号到「${account.email}」？\n\n这会改写 ~/.codex/auth.json（已自动备份）。若该账号 token 已过期，可能需要在 cockpit-tools 中刷新或重新登录。`)) return;
    setSwitchingId(account.id);
    try {
      const res = await toolApi.switchCodexAccount(account.id);
      if (res.ok) {
        window.alert(`已切换到 ${res.switchedTo}。\n新的 Codex 会话将使用该账号。`);
        await refreshQuota();
      } else {
        window.alert("切换失败：" + (res.message || "未知错误"));
      }
    } catch (err) {
      window.alert("切换失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setSwitchingId("");
    }
  }

  useEffect(() => {
    void refreshQuota();
  }, []);

  const requestIdRef = useRef(0);

  async function refresh(nextQuery = query) {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const result = await toolApi.usageReport(nextQuery);
      // Ignore stale responses: a slower earlier request (e.g. the 全部客户端
      // ccusage scan) must not clobber a newer one after the user switches.
      if (requestId !== requestIdRef.current) return;
      setReport(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "用量读取失败");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setProjectPage(1);
    setExpandedProjects(new Set());
  }, [report, hideDeleted]);

  const projects = useMemo(() => {
    const merged = mergeProjects(report?.summary?.entries);
    return groupProjects(merged, report?.client === "all");
  }, [report]);

  function toggleProject(groupKey: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  const filteredProjects = useMemo(() => {
    if (hideDeleted) {
      return projects.filter((p) => p.existsLocally !== false);
    }
    return projects;
  }, [projects, hideDeleted]);

  const pageSize = 8;
  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const pagedProjects = useMemo(() => {
    const startIndex = (projectPage - 1) * pageSize;
    return filteredProjects.slice(startIndex, startIndex + pageSize);
  }, [filteredProjects, projectPage]);

  const hourly = report?.hourly?.entries || [];
  const days = useMemo(() => aggregateDays(report, hourly), [report, hourly]);
  const chartData = useMemo(() => {
    return buildUsageChartData({ range: query.range, granularity, hourly, days });
  }, [query.range, granularity, hourly, days]);

  // tokscale's summary totals are occasionally returned as 0 even when the
  // per-model entries carry real tokens — sum the entries as a fallback so the
  // top tiles never show 0 while rows below clearly have usage.
  const entrySums = useMemo(() => {
    const acc = { input: 0, output: 0, cache: 0, cost: 0 };
    for (const x of report?.summary?.entries || []) {
      acc.input += Number(x.input) || 0;
      acc.output += Number(x.output) || 0;
      acc.cache += Number(x.cacheRead) || 0;
      acc.cost += Number(x.cost) || 0;
    }
    return acc;
  }, [report]);

  const totalCost = totalValue(report, ["costUSD", "totalCost"], report?.summary?.totalCost || entrySums.cost);
  const totalInput = totalValue(report, ["inputTokens"], report?.summary?.totalInput || entrySums.input);
  const totalOutput = totalValue(report, ["outputTokens"], report?.summary?.totalOutput || entrySums.output);
  const totalCache = totalValue(report, ["cachedInputTokens", "cacheReadTokens"], report?.summary?.totalCacheRead || entrySums.cache);
  const totalTokens = totalValue(report, ["totalTokens"], totalInput + totalOutput);

  const streaks = useMemo(() => computeStreaks(days), [days]);
  const heatmapWeeks = 53;
  const heatmap = useMemo(() => buildHeatmap(days, heatmapWeeks), [days]);
  const peak = useMemo(() => peakHour(hourly), [hourly]);
  const favorite = useMemo(() => favoriteModel(report?.summary?.entries), [report]);
  const projectCount = projects.length;
  const messages = report?.summary?.totalMessages || projects.reduce((sum, p) => sum + (p.messageCount || 0), 0);
  const mobyRatio = totalTokens > 0 ? Math.max(1, Math.round(totalTokens / MOBY_DICK_TOKENS)) : 0;

  const modelEntries = useMemo(() => {
    const map = new Map<string, { model: string; cost: number; input: number; output: number; cache: number }>();
    for (const entry of report?.summary?.entries || []) {
      const model = entry.model || "未识别";
      const item = map.get(model) || { model, cost: 0, input: 0, output: 0, cache: 0 };
      item.cost += entry.cost || 0;
      item.input += entry.input || 0;
      item.output += entry.output || 0;
      item.cache += entry.cacheRead || 0;
      map.set(model, item);
    }
    return [...map.values()].sort((a, b) => b.cost - a.cost);
  }, [report]);

  // 全部 → all providers (available ones render cards; unavailable like Claude
  // render an explanatory note). A specific client → just that provider.
  const quotaProviders = useMemo(() => {
    const providers = quota?.providers || [];
    if (query.client === "all") return providers;
    return providers.filter((p) => p.provider === query.client);
  }, [quota, query.client]);

  function updateQuery(patch: Partial<UsageQuery>) {
    const next = { ...query, ...patch };
    setQuery(next);
    // Clear the old report immediately so switching client/range visibly resets
    // to a loading state instead of showing stale numbers until the fetch lands.
    setReport(null);
    void refresh(next);
  }

  return (
    <section className="module-page">
      <div className="page-heading compact-heading">
        <div>
          <h1>大模型用量</h1>
          <p>{report ? `更新于 ${new Date(report.generatedAt).toLocaleString()}` : "读取 tokscale / ccusage 数据"}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => { void refresh({ ...query, force: true }); void refreshQuota(); }} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          刷新
        </button>
      </div>

      <div className="control-row">
        <select value={query.client} onChange={(event) => updateQuery({ client: event.target.value as UsageQuery["client"] })}>
          <option value="all">全部客户端</option>
          <option value="codex">Codex</option>
          <option value="claude">Claude</option>
          <option value="antigravity">Antigravity</option>
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}

      {report?.warnings && report.warnings.length > 0 && (
        <div className="usage-warning">
          ⚠️ {report.warnings.join("、")}暂时无法读取（数据源 tokscale / ccusage 偶发失败），已显示其余可用数据。可点「刷新」重试。
        </div>
      )}

      {quotaProviders.length > 0 && (
        <QuotaPanel providers={quotaProviders} loading={quotaLoading} onRefresh={refreshQuota} onSwitch={handleSwitchAccount} switchingId={switchingId} />
      )}

      <article className="stats-panel">
        <header className="stats-header">
          <div className="stats-tabs">
            <button
              type="button"
              className={tab === "overview" ? "stats-tab active" : "stats-tab"}
              onClick={() => setTab("overview")}
            >
              概览
            </button>
            <button
              type="button"
              className={tab === "models" ? "stats-tab active" : "stats-tab"}
              onClick={() => setTab("models")}
            >
              模型
            </button>
          </div>
          <div className="stats-range">
            {rangeTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={query.range === item.id ? "range-pill active" : "range-pill"}
                onClick={() => updateQuery({ range: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {tab === "overview" ? (
          <>
            <div className="stat-grid">
              <StatTile label="项目" value={formatNumber(projectCount)} hint="workspace × model" />
              <StatTile label="消息" value={formatNumber(messages)} />
              <StatTile label="总 Token" value={formatCompact(totalTokens)} />
              <StatTile label="活跃天数" value={String(streaks.active)} />
              <StatTile label="当前连续" value={`${streaks.current} 天`} />
              <StatTile label="最长连续" value={`${streaks.longest} 天`} />
              <StatTile label="活跃时段" value={peak} />
              <StatTile label="主力模型" value={favorite} />
            </div>

            <div className="heatmap" role="img" aria-label={`用量热力图 (${heatmapWeeks} 周)`}>
              {Array.from({ length: heatmapWeeks }).map((_, weekIndex) => (
                <div className="heatmap-col" key={weekIndex}>
                  {heatmap.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell) => (
                    <span
                      key={cell.date}
                      className={`heatmap-cell level-${cell.level}`}
                      title={`${cell.date} · ${formatCost(cell.cost)}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <footer className="stats-footer">
              {mobyRatio > 0
                ? `你已用掉相当于 ~${mobyRatio}× 部《白鲸记》的 token。`
                : "尚无足够数据进行有趣的对比。"}
            </footer>
          </>
        ) : (
          <div className="model-table">
            <div className="model-row model-row-head">
              <span>模型</span>
              <span>成本</span>
              <span>输入</span>
              <span>输出</span>
              <span>缓存</span>
            </div>
            {modelEntries.length === 0 && <p className="empty-text">当前范围没有模型用量数据。</p>}
            {modelEntries.map((entry) => (
              <div className="model-row" key={entry.model}>
                <span className="model-name">{entry.model}</span>
                <span>{formatCost(entry.cost)}</span>
                <span>{formatCompact(entry.input)}</span>
                <span>{formatCompact(entry.output)}</span>
                <span>{formatCompact(entry.cache)}</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="overview-grid">
        <MetricCard label="成本" value={formatCost(totalCost)} detail={`tokscale ${formatCost(report?.summary?.totalCost)}`} />
        <MetricCard label="输入" value={formatCompact(totalInput)} detail="input tokens" />
        <MetricCard label="输出" value={formatCompact(totalOutput)} detail="output tokens" />
        <MetricCard label="缓存读取" value={formatCompact(totalCache)} detail="cache tokens" />
      </div>

      <div className="split-grid">
        <ProjectRankingPanel
          filteredProjects={filteredProjects}
          pagedProjects={pagedProjects}
          pageSize={pageSize}
          projectPage={projectPage}
          totalProjectPages={totalProjectPages}
          hideDeleted={hideDeleted}
          setHideDeleted={setHideDeleted}
          setProjectPage={setProjectPage}
          expandedProjects={expandedProjects}
          toggleProject={toggleProject}
        />

        <article className="panel">
          <div className="panel-title">
            <div className="panel-title-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2>用量趋势</h2>
              <span>
                {query.range === "today" ? "24小时" : query.range === "week" ? "最近7天" : query.range === "month" ? "本月趋势" : query.range === "year" ? "本年趋势" : "所有历史"}
              </span>
            </div>
            {query.range !== "today" && (
              <div className="stats-tabs" style={{ padding: "2px", borderRadius: "6px" }}>
                <button
                  type="button"
                  className={granularity === "day" ? "stats-tab active" : "stats-tab"}
                  onClick={() => setGranularity("day")}
                  style={{ padding: "3px 8px", fontSize: "11px", borderRadius: "4px" }}
                >
                  按日
                </button>
                <button
                  type="button"
                  className={granularity === "week" ? "stats-tab active" : "stats-tab"}
                  onClick={() => setGranularity("week")}
                  style={{ padding: "3px 8px", fontSize: "11px", borderRadius: "4px" }}
                >
                  按周
                </button>
                <button
                  type="button"
                  className={granularity === "month" ? "stats-tab active" : "stats-tab"}
                  onClick={() => setGranularity("month")}
                  style={{ padding: "3px 8px", fontSize: "11px", borderRadius: "4px" }}
                >
                  按月
                </button>
              </div>
            )}
          </div>
          <div className="panel-body" style={{ marginTop: "10px" }}>
            <LineChart data={chartData} />
          </div>
        </article>
      </div>
    </section>
  );
}
