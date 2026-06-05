import {
  FolderGit2,
  FolderOpen,
  GitBranch,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toolApi } from "../../toolApi";
import type { ProjectConfig, ProjectItem, ProjectList } from "../../types";

function relTime(ms: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} 天前`;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


const PROJECT_CONFIG_KEYS: Array<{ key: string; label: string }> = [
  { key: "agents", label: "AGENTS.md" },
  { key: "claude", label: "CLAUDE.md" },
  { key: "mcp", label: ".mcp.json" },
];

export function ProjectsModule() {
  const [data, setData] = useState<ProjectList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProjectItem | null>(null);
  const [cfgKey, setCfgKey] = useState("agents");
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncTargets, setSyncTargets] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const r = await toolApi.projectsList();
      setData(r);
      if (selected) {
        const found = r.projects.find((p) => p.path === selected.path);
        if (found) setSelected(found);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取项目失败");
    } finally {
      setLoading(false);
    }
  }

  async function chooseRoot() {
    const res = await toolApi.projectChooseRoot();
    if (res.canceled) return;
    setSelected(null);
    await refresh();
  }

  useEffect(() => { void refresh(); }, []);

  const projects = useMemo(() => {
    const arr = data?.projects || [];
    const q = search.trim().toLowerCase();
    return q ? arr.filter((p) => p.name.toLowerCase().includes(q)) : arr;
  }, [data, search]);

  async function openProject(p: ProjectItem, key = cfgKey) {
    setSelected(p);
    setCfgKey(key);
    setEditing(false);
    setNotice("");
    setConfig(null);
    try {
      const c = await toolApi.projectReadConfig(p.path, key);
      setConfig(c);
      setDraft(c.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取配置失败");
    }
  }

  async function switchConfig(key: string) {
    if (!selected) return;
    await openProject(selected, key);
  }

  async function save() {
    if (!selected || !config) return;
    setBusy(true);
    setError("");
    try {
      const res = await toolApi.projectSaveConfig(selected.path, cfgKey, draft);
      setNotice(res.backup ? "已保存（原文件已备份）" : "已保存");
      setEditing(false);
      await openProject(selected, cfgKey);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function runSync() {
    if (!selected || !config) return;
    const targets = [...syncTargets];
    if (targets.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await toolApi.projectSyncConfig({ key: cfgKey, content: editing ? draft : config.content, targets });
      const ok = res.results.filter((r) => r.ok).length;
      setNotice(`已同步 ${config.label} 到 ${ok}/${res.results.length} 个项目（均已备份原文件）`);
      setSyncOpen(false);
      setSyncTargets(new Set());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "同步失败");
    } finally {
      setBusy(false);
    }
  }

  function toggleTarget(p: string) {
    setSyncTargets((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });
  }

  return (
    <section className="module-page">
      <div className="page-heading compact-heading">
        <div>
          <h1>项目指挥台</h1>
          <p>{data ? `扫描 ${data.root} · ${data.projects.length} 个项目` : "扫描本地项目、查看 git 状态、统一管理 AGENTS.md / .mcp.json / CLAUDE.md"}</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="secondary-button" type="button" onClick={chooseRoot} disabled={loading}>
            <FolderOpen size={16} />
            更改目录
          </button>
          <button className="secondary-button" type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            刷新
          </button>
        </div>
      </div>

      <div className="control-row" style={{ justifyContent: "flex-end" }}>
        <div className="skills-search">
          <Search size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目…" />
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {data && !data.available && <div className="error-box">未找到目录 {data.root}</div>}

      <div className="skills-layout">
        <div className="skills-list">
          {projects.length === 0 && <p className="empty-text">没有匹配的项目。</p>}
          {projects.map((p) => {
            const active = selected?.path === p.path;
            const g = p.git;
            return (
              <div key={p.path} className={`skill-card${active ? " skill-card-active" : ""}`} onClick={() => openProject(p)}>
                <div className="skill-card-head">
                  <span className="skill-card-name" title={p.path}>{p.name}</span>
                  {g.isGit ? (
                    <span className="proj-branch"><GitBranch size={11} /> {g.branch}</span>
                  ) : (
                    <span className="skill-scope">无 git</span>
                  )}
                </div>
                <div className="proj-meta">
                  {g.isGit && (g.changes ?? 0) > 0 && <span className="proj-dirty">{g.changes} 项改动</span>}
                  {g.isGit && (g.changes ?? 0) === 0 && <span className="proj-clean">干净</span>}
                  {g.isGit && (g.ahead ?? 0) > 0 && <span className="proj-ahead">↑{g.ahead}</span>}
                  {g.isGit && (g.behind ?? 0) > 0 && <span className="proj-behind">↓{g.behind}</span>}
                  {g.lastCommitAt ? <span className="sess-time">{relTime(g.lastCommitAt)}</span> : null}
                </div>
                <div className="skill-card-foot">
                  {PROJECT_CONFIG_KEYS.map((c) => (
                    <span key={c.key} className={`proj-cfg${p.config[c.key]?.present ? " proj-cfg-on" : ""}`}>{c.label}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="skills-editor">
          {!selected ? (
            <div className="skill-empty">
              <FolderGit2 size={40} />
              <p>选择左侧项目，查看 git 状态与配置文件（AGENTS.md / .mcp.json / CLAUDE.md），可编辑并一键同步到其它项目。</p>
            </div>
          ) : (
            <div className="skill-detail">
              <div className="skill-detail-head">
                <div style={{ minWidth: 0 }}>
                  <h2>{selected.name}</h2>
                  <div className="skill-detail-meta">
                    {selected.git.isGit ? (
                      <>
                        <span className="proj-branch"><GitBranch size={11} /> {selected.git.branch}</span>
                        <span className="skill-scope">{(selected.git.changes ?? 0) > 0 ? `${selected.git.changes} 项未提交` : "工作区干净"}</span>
                        {selected.git.lastSubject && <span className="skill-scope" title={selected.git.lastSubject}>最近: {selected.git.lastSubject.slice(0, 30)}</span>}
                      </>
                    ) : <span className="skill-scope">非 git 仓库</span>}
                  </div>
                </div>
              </div>

              <div className="skill-actions">
                <button className="secondary-button" type="button" onClick={() => toolApi.projectOpenFolder(selected.path)}>
                  <FolderOpen size={14} /> 打开文件夹
                </button>
                <span className="sess-path" title={selected.path}>{selected.path}</span>
              </div>

              <div className="skills-source-tabs" style={{ marginTop: "4px" }}>
                {PROJECT_CONFIG_KEYS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={cfgKey === c.key ? "range-pill active" : "range-pill"}
                    onClick={() => switchConfig(c.key)}
                  >
                    {c.label}
                    {selected.config[c.key]?.present && <span className="proj-dot" />}
                  </button>
                ))}
              </div>

              {notice && <div className="proj-notice">{notice}</div>}

              {config && (
                <>
                  <div className="skill-actions">
                    {!editing && (
                      <button className="secondary-button" type="button" onClick={() => { setEditing(true); setDraft(config.content); setNotice(""); }}>
                        <Pencil size={14} /> {config.present ? "编辑" : "创建"}
                      </button>
                    )}
                    {editing && (
                      <>
                        <button className="primary-button" type="button" onClick={save} disabled={busy}><Save size={14} /> 保存</button>
                        <button className="secondary-button" type="button" onClick={() => { setEditing(false); setDraft(config.content); }} disabled={busy}>取消</button>
                      </>
                    )}
                    <button className="secondary-button" type="button" onClick={() => { setSyncOpen(true); setSyncTargets(new Set()); }} disabled={!config.present && !editing}>
                      <Upload size={14} /> 同步到其它项目…
                    </button>
                  </div>

                  {editing ? (
                    <textarea className="skill-field-textarea proj-editor" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
                  ) : config.present ? (
                    <pre className="skill-body">{config.content}</pre>
                  ) : (
                    <p className="empty-text">该项目还没有 {config.label}，点「创建」新建一个。</p>
                  )}
                </>
              )}

              {syncOpen && config && (
                <div className="proj-sync">
                  <div className="proj-sync-head">
                    <strong>把 {config.label} 同步到：</strong>
                    <span>{syncTargets.size} 个目标</span>
                  </div>
                  <div className="proj-sync-list">
                    {(data?.projects || []).filter((p) => p.path !== selected.path).map((p) => (
                      <label key={p.path} className="proj-sync-item">
                        <input type="checkbox" checked={syncTargets.has(p.path)} onChange={() => toggleTarget(p.path)} />
                        <span>{p.name}</span>
                        {p.config[cfgKey]?.present && <em>将覆盖（已备份）</em>}
                      </label>
                    ))}
                  </div>
                  <div className="skill-actions">
                    <button className="primary-button" type="button" onClick={runSync} disabled={busy || syncTargets.size === 0}>
                      <Upload size={14} /> 确认同步到 {syncTargets.size} 个项目
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setSyncOpen(false)} disabled={busy}>取消</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

