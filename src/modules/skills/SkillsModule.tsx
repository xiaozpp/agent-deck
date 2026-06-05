import {
  Blocks,
  Download,
  FolderOpen,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toolApi } from "../../toolApi";
import { SkillMarket } from "./SkillMarket";
import { providerMeta } from "../providerMeta";
import { SkillEditor } from "./SkillEditor";
import type { SkillDetail, SkillItem, SkillList, SkillPreset } from "../../types";

const SKILL_SCOPE_LABELS: Record<string, string> = {
  personal: "个人",
  plugin: "插件",
  system: "内置",
  desktop: "桌面版",
  prompt: "提示",
};

export function SkillsModule() {
  const [view, setView] = useState<"manage" | "market">("manage");
  const [data, setData] = useState<SkillList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"all" | "claude" | "codex">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SkillItem | null>(null);
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [form, setForm] = useState({ name: "", description: "", allowedTools: "", body: "" });
  const [createSource, setCreateSource] = useState<"claude" | "codex">("claude");
  const [installSource, setInstallSource] = useState<"claude" | "codex">("claude");
  const [busy, setBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh(keepSelectionPath?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await toolApi.skillsList();
      setData(result);
      if (keepSelectionPath) {
        const found = result.skills.find((s) => s.path === keepSelectionPath);
        if (found) setSelected(found);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取 skills 失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const skills = useMemo(() => {
    let arr = data?.skills || [];
    if (source !== "all") arr = arr.filter((s) => s.source === source);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((s) => s.name.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q));
    return arr;
  }, [data, source, search]);

  const counts = useMemo(() => {
    const all = data?.skills || [];
    return {
      all: all.length,
      claude: all.filter((s) => s.source === "claude").length,
      codex: all.filter((s) => s.source === "codex").length,
    };
  }, [data]);

  async function openSkill(skill: SkillItem) {
    setSelected(skill);
    setMode("view");
    setDetail(null);
    try {
      const d = await toolApi.skillRead(skill.path);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取内容失败");
    }
  }

  function startCreate(presetSource?: "claude" | "codex") {
    setSelected(null);
    setDetail(null);
    setMode("create");
    // Default the new skill to the provider the user is currently filtering by,
    // so "新建" on the Claude tab creates a Claude skill (and vice-versa).
    setCreateSource(presetSource || (source === "codex" ? "codex" : "claude"));
    setForm({ name: "", description: "", allowedTools: "", body: "" });
  }

  function startEdit() {
    if (!selected || !detail) return;
    setForm({
      name: detail.name,
      description: detail.description,
      allowedTools: (detail.allowedTools || []).join(", "),
      body: detail.body,
    });
    setMode("edit");
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const allowedTools = form.allowedTools.split(",").map((s) => s.trim()).filter(Boolean);
      if (mode === "create") {
        const res = await toolApi.skillCreate({ source: createSource, name: form.name, description: form.description, body: form.body });
        await refresh(res.path);
        const created = (await toolApi.skillsList()).skills.find((s) => s.path === res.path);
        if (created) await openSkill(created);
      } else if (mode === "edit" && selected) {
        await toolApi.skillSave(selected.path, { name: form.name, description: form.description, allowedTools, body: form.body });
        await refresh(selected.path);
        const d = await toolApi.skillRead(selected.path);
        setDetail(d);
        setMode("view");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(skill: SkillItem) {
    setBusy(true);
    try {
      const res = await toolApi.skillToggle(skill.path, !skill.enabled);
      await refresh(res.path);
      if (selected?.path === skill.path) {
        const next = (await toolApi.skillsList()).skills.find((s) => s.path === res.path);
        if (next) setSelected(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "切换状态失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(skill: SkillItem) {
    if (!window.confirm(`确定删除 skill「${skill.name}」？该操作会删除本地文件，不可恢复。`)) return;
    setBusy(true);
    try {
      await toolApi.skillDelete(skill.path);
      if (selected?.path === skill.path) {
        setSelected(null);
        setDetail(null);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleInstallPreset(preset: SkillPreset) {
    setError("");
    try {
      const res = await toolApi.skillInstallPreset(installSource, preset.id);
      await refresh(res.path);
      const created = (await toolApi.skillsList()).skills.find((skill) => skill.path === res.path);
      if (created) await openSkill(created);
      setView("manage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "安装失败（可能同名已存在）");
    }
  }

  function parseImportedSkill(raw: string, fallbackName: string) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    const data: Record<string, string> = {};
    let body = raw;
    if (match) {
      body = match[2] || "";
      for (const line of match[1].split(/\r?\n/)) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
    return {
      name: data.name || fallbackName.replace(/\.md$/i, ""),
      description: data.description || "",
      allowedTools: data["allowed-tools"] || data.allowedTools || "",
      body,
    };
  }

  async function importSkillFile(file?: File) {
    if (!file) return;
    const raw = await file.text();
    setForm(parseImportedSkill(raw, file.name));
    setCreateSource(source === "codex" ? "codex" : "claude");
    setSelected(null);
    setDetail(null);
    setMode("create");
    setView("manage");
    if (importInputRef.current) importInputRef.current.value = "";
  }

  function exportSkill() {
    if (!selected || !detail) return;
    const blob = new Blob([detail.raw], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.name || "SKILL"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function getSkillExportName() {
    if (!selected) return "SKILL.md";
    const base = selected.name || detail?.name || "SKILL";
    return `${base}.md`;
  }

  const sources: Array<{ id: "all" | "claude" | "codex"; label: string; n: number }> = [
    { id: "all", label: "全部", n: counts.all },
    { id: "claude", label: "Claude Code", n: counts.claude },
    { id: "codex", label: "Codex", n: counts.codex },
  ];

  const installedNames = useMemo(
    () => new Set((data?.skills || []).filter((s) => s.source === installSource).map((s) => s.name)),
    [data, installSource],
  );

  const editing = mode === "edit" || mode === "create";

  return (
    <section className="module-page">
      <div className="page-heading compact-heading">
        <div>
          <h1>Skills 管理</h1>
          <p>统一管理 Claude Code 与 Codex 的 Agent Skills（~/.claude/skills 与 ~/.codex/skills，同为 SKILL.md 格式）</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="skills-source-tabs">
            <button type="button" className={view === "manage" ? "range-pill active" : "range-pill"} onClick={() => setView("manage")}>
              <Blocks size={13} /> 管理
            </button>
            <button type="button" className={view === "market" ? "range-pill active" : "range-pill"} onClick={() => setView("market")}>
              <Store size={13} /> 市场
            </button>
          </div>
          <button className="secondary-button" type="button" onClick={() => refresh(selected?.path)} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            刷新
          </button>
          {view === "manage" && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".md,text/markdown,text/plain"
                style={{ display: "none" }}
                onChange={(event) => void importSkillFile(event.target.files?.[0])}
              />
              <button className="secondary-button" type="button" onClick={() => importInputRef.current?.click()}>
                <Upload size={16} />
                导入
              </button>
              <button className="primary-button" type="button" onClick={() => startCreate()}>
                <Plus size={16} />
                新建
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {view === "market" ? (
        <SkillMarket
          installSource={installSource}
          setInstallSource={setInstallSource}
          installedNames={installedNames}
          onInstall={handleInstallPreset}
        />
      ) : (
      <>
      <div className="control-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div className="skills-source-tabs">
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              className={source === s.id ? "range-pill active" : "range-pill"}
              onClick={() => setSource(s.id)}
            >
              {s.label} <span className="skills-count">{s.n}</span>
            </button>
          ))}
        </div>
        <div className="skills-search">
          <Search size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索名称或描述…" />
        </div>
      </div>

      <div className="skills-layout">
        <div className="skills-list">
          {skills.length === 0 && (
            search.trim() ? (
              <p className="empty-text">没有匹配「{search.trim()}」的 skill。</p>
            ) : (
              <div className="skills-empty-list">
                <Blocks size={28} />
                <p>
                  {source === "claude"
                    ? "Claude Code 还没有任何 skill。"
                    : source === "codex"
                      ? "Codex 还没有个人 skill。"
                      : "还没有任何 skill。"}
                </p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => startCreate(source === "codex" ? "codex" : source === "claude" ? "claude" : undefined)}
                >
                  <Plus size={15} /> 新建第一个 skill
                </button>
              </div>
            )
          )}
          {skills.map((skill) => {
            const sm = providerMeta(skill.source);
            const active = selected?.path === skill.path;
            return (
              <div
                key={skill.path}
                className={`skill-card${active ? " skill-card-active" : ""}${skill.enabled ? "" : " skill-card-off"}`}
                onClick={() => openSkill(skill)}
              >
                <div className="skill-card-head">
                  <span className="skill-card-name" title={skill.name}>{skill.name}</span>
                  <span className="quota-badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                    {sm.label}
                  </span>
                </div>
                <p className="skill-card-desc">{skill.description || "（无描述）"}</p>
                <div className="skill-card-foot">
                  <span className="skill-scope">{SKILL_SCOPE_LABELS[skill.scope] || skill.scope}</span>
                  {skill.readOnly && <span className="skill-scope skill-scope-ro">只读</span>}
                  {!skill.enabled && <span className="skill-scope skill-scope-off">已禁用</span>}
                  {skill.allowedTools.length > 0 && <span className="skill-scope">tools: {skill.allowedTools.length}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="skills-editor">
          {mode === "create" ? (
            <SkillEditor
              title="新建 Skill"
              isCreate
              createSource={createSource}
              onCreateSource={setCreateSource}
              form={form}
              setForm={setForm}
              busy={busy}
              onSave={save}
              onCancel={() => setMode("view")}
            />
          ) : mode === "edit" && selected ? (
            <SkillEditor
              title={`编辑 · ${selected.name}`}
              isCreate={false}
              isClaude={selected.source === "claude"}
              form={form}
              setForm={setForm}
              busy={busy}
              onSave={save}
              onCancel={() => setMode("view")}
            />
          ) : selected && detail ? (
            <div className="skill-detail">
              <div className="skill-detail-head">
                <div style={{ minWidth: 0 }}>
                  <h2>{selected.name}</h2>
                  <div className="skill-detail-meta">
                    {(() => { const sm = providerMeta(selected.source); return (
                      <span className="quota-badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                    ); })()}
                    <span className="skill-scope">{SKILL_SCOPE_LABELS[selected.scope] || selected.scope}</span>
                    {selected.enabled ? <span className="skill-scope skill-scope-on">已启用</span> : <span className="skill-scope skill-scope-off">已禁用</span>}
                  </div>
                </div>
              </div>

              <div className="skill-actions">
                {!selected.readOnly && (
                  <button className="secondary-button" type="button" onClick={startEdit}><Pencil size={14} /> 编辑</button>
                )}
                {!selected.readOnly && (
                  <button className="secondary-button" type="button" onClick={() => toggle(selected)} disabled={busy}>
                    <Power size={14} /> {selected.enabled ? "禁用" : "启用"}
                  </button>
                )}
                <button className="secondary-button" type="button" onClick={() => toolApi.skillOpenFolder(selected.path)}>
                  <FolderOpen size={14} /> 打开文件夹
                </button>
                <button className="secondary-button" type="button" onClick={exportSkill}>
                  <Download size={14} /> 导出 {getSkillExportName()}
                </button>
                {!selected.readOnly && (
                  <button className="danger-button" type="button" onClick={() => remove(selected)} disabled={busy}>
                    <Trash2 size={14} /> 删除
                  </button>
                )}
              </div>

              {detail.description && <p className="skill-detail-desc">{detail.description}</p>}
              {detail.allowedTools.length > 0 && (
                <div className="skill-tools">
                  {detail.allowedTools.map((t) => <span key={t} className="skill-tool-chip">{t}</span>)}
                </div>
              )}
              <pre className="skill-body">{detail.body || "（空）"}</pre>
              {selected.readOnly && (
                <p className="skill-ro-note">
                  {selected.scope === "desktop"
                    ? "Claude 桌面版的托管 skill 为只读；如需新增个人 skill，可在桌面版「Customize → Skills」中添加，或在此处为 Claude Code（~/.claude/skills）新建。"
                    : selected.scope === "system"
                      ? "Codex 内置 skill 为只读，无法在此修改。"
                      : "插件内置 skill 为只读，如需修改请在对应插件中调整。"}
                </p>
              )}
            </div>
          ) : (
            <div className="skill-empty">
              <Blocks size={40} />
              <p>选择左侧的 skill 查看与编辑，或点击「新建」创建一个。</p>
              {data && !data.available.claude && !data.available.codex && (
                <p className="empty-text">未检测到 ~/.claude 或 ~/.codex 目录。</p>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </section>
  );
}
