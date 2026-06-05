import { CheckCircle2, Download, Eye, FileDown, FileUp, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { toolApi } from "../../toolApi";
import type { SkillPreset } from "../../types";
import { usePresetMarket } from "../market/usePresetMarket";

export function SkillMarket({
  installSource,
  setInstallSource,
  installedNames,
  onInstall,
}: {
  installSource: "claude" | "codex";
  setInstallSource: (s: "claude" | "codex") => void;
  installedNames: Set<string>;
  onInstall: (preset: SkillPreset) => void;
}) {
  const [busyId, setBusyId] = useState("");
  const [showInstalled, setShowInstalled] = useState(true);
  const [preview, setPreview] = useState<SkillPreset | null>(null);
  const [message, setMessage] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const {
    query,
    setQuery,
    category,
    setCategory,
    categories,
    filtered,
    error,
    reload,
  } = usePresetMarket<SkillPreset>({
    load: () => toolApi.skillListPresets(),
    searchText: (preset) => [preset.name, preset.title, preset.description, preset.category, preset.author].join(" "),
    installedNames,
    loadError: "读取 Skill preset 失败",
    filter: (_preset, installed) => (showInstalled ? true : !installed),
  });

  async function install(preset: SkillPreset) {
    setBusyId(preset.id);
    try {
      await onInstall(preset);
    } finally {
      setBusyId("");
    }
  }

  function presetMarkdown(preset: SkillPreset) {
    return [
      "---",
      `id: ${preset.id}`,
      `name: ${preset.name}`,
      `title: ${preset.title}`,
      `author: ${preset.author}`,
      `category: ${preset.category}`,
      `description: ${preset.description}`,
      "---",
      "",
      preset.body || "",
    ].join("\n");
  }

  function downloadMarkdown(preset: SkillPreset) {
    const blob = new Blob([presetMarkdown(preset)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${preset.id || preset.name}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importLocalPresets(files?: FileList | null) {
    if (!files || files.length === 0) return;
    const payload = await Promise.all([...files].map(async (file) => ({ name: file.name, content: await file.text() })));
    const res = await toolApi.skillImportPresets(payload);
    setMessage(`已导入 ${res.count} 个本地 Skill preset。`);
    await reload();
    if (importInputRef.current) importInputRef.current.value = "";
  }

  async function exportLocalPresets() {
    const res = await toolApi.skillExportPresets();
    if (res.presets.length === 0) {
      setMessage("暂无可导出的 Skill preset。");
      return;
    }
    const blob = new Blob([res.presets.map(presetMarkdown).join("\n\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "skill-presets.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="skills-market">
      <div className="skills-market-bar">
        <span className="skills-market-hint">精选 Agent Skills，一键写入本地 SKILL.md，可随后编辑。安装到：</span>
        <div className="skills-source-tabs">
          <button type="button" className={installSource === "claude" ? "range-pill active" : "range-pill"} onClick={() => setInstallSource("claude")}>Claude Code</button>
          <button type="button" className={installSource === "codex" ? "range-pill active" : "range-pill"} onClick={() => setInstallSource("codex")}>Codex</button>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="mcp-message"><span>{message}</span></div>}

      <div className="control-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <label className="skills-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 preset、分类或作者" />
        </label>
        <div className="skills-source-tabs">
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            multiple
            style={{ display: "none" }}
            onChange={(event) => void importLocalPresets(event.target.files)}
          />
          <button type="button" className="range-pill" onClick={() => importInputRef.current?.click()}>
            <FileUp size={13} /> 导入
          </button>
          <button type="button" className="range-pill" onClick={() => void exportLocalPresets()}>
            <FileDown size={13} /> 导出本地
          </button>
          {categories.map((item) => (
            <button key={item} type="button" className={category === item ? "range-pill active" : "range-pill"} onClick={() => setCategory(item)}>
              {item === "all" ? "全部" : item}
            </button>
          ))}
          <button type="button" className={showInstalled ? "range-pill active" : "range-pill"} onClick={() => setShowInstalled((value) => !value)}>
            {showInstalled ? "含已安装" : "仅未安装"}
          </button>
        </div>
      </div>

      <div className="skills-market-grid">
        {filtered.map((preset) => {
          const installed = installedNames.has(preset.name);
          return (
            <div className="skills-market-card" key={preset.id}>
              <div className="skills-market-card-head">
                <strong>{preset.title}</strong>
                <span className="skill-scope">{preset.category}</span>
              </div>
              <p className="skills-market-desc">{preset.description}</p>
              <div className="skills-market-foot">
                <span className="skills-market-author">{preset.author}</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="secondary-button" type="button" style={{ height: "28px", minWidth: 0, fontSize: "12px" }} onClick={() => setPreview(preset)}>
                    <Eye size={13} /> 预览
                  </button>
                  <button className="secondary-button" type="button" style={{ height: "28px", minWidth: 0, fontSize: "12px" }} onClick={() => downloadMarkdown(preset)}>
                    <FileDown size={13} /> 导出
                  </button>
                  <button
                    className={installed ? "secondary-button" : "primary-button"}
                    type="button"
                    style={{ height: "28px", minWidth: 0, fontSize: "12px" }}
                    disabled={busyId === preset.id || installed}
                    onClick={() => install(preset)}
                  >
                    {installed ? <><CheckCircle2 size={13} /> 已装</> : <><Download size={13} /> 装到 {installSource === "codex" ? "Codex" : "Claude"}</>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="empty-text">没有匹配的 Skill preset。</p>}
      </div>

      {preview && (
        <div className="skill-detail" style={{ marginTop: "14px" }}>
          <div className="skill-detail-head">
            <div>
              <h2>{preview.title}</h2>
              <div className="skill-detail-meta">
                <span className="skill-scope">{preview.category}</span>
                <span className="skill-scope">{preview.author}</span>
              </div>
            </div>
            <button className="mcp-icon-btn" type="button" title="关闭预览" onClick={() => setPreview(null)}>
              <X size={16} />
            </button>
          </div>
          <p className="skill-detail-desc">{preview.description}</p>
          <pre className="skill-body">{preview.body || "（空）"}</pre>
        </div>
      )}
    </div>
  );
}
