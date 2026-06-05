import { CheckCircle2, Download, ExternalLink, FileDown, FileUp, Search, SlidersHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import { toolApi } from "../../toolApi";
import type { McpClientSummary, McpPreset } from "../../types";
import { usePresetMarket } from "../market/usePresetMarket";

type InstallVariables = Record<string, string>;

function downloadJson(name: string, value: unknown) {
  const json = JSON.stringify(value, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function McpMarket({
  clients,
  selectedClient,
  installedNames,
  onInstall,
}: {
  clients: McpClientSummary[];
  selectedClient: string;
  installedNames: Set<string>;
  onInstall: (preset: McpPreset, variables: InstallVariables) => void;
}) {
  const [busyId, setBusyId] = useState("");
  const [runtime, setRuntime] = useState("all");
  const [status, setStatus] = useState<"all" | "missing" | "installed" | "needs-config">("all");
  const [selectedPreset, setSelectedPreset] = useState<McpPreset | null>(null);
  const [variables, setVariables] = useState<InstallVariables>({});
  const [message, setMessage] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const {
    presets,
    query,
    setQuery,
    category,
    setCategory,
    categories,
    filtered,
    error,
    reload,
  } = usePresetMarket<McpPreset>({
    load: () => toolApi.mcpListPresets(),
    searchText: (preset) => [preset.name, preset.title, preset.description, preset.category, preset.author, preset.runtime].join(" "),
    installedNames,
    loadError: "读取 MCP preset 失败",
    filter: (preset, installed) => {
      if (runtime !== "all" && preset.runtime !== runtime && preset.transport !== runtime) return false;
      if (status === "missing" && installed) return false;
      if (status === "installed" && !installed) return false;
      if (status === "needs-config" && preset.variables.length === 0) return false;
      return true;
    },
  });

  const targetLabel = clients.find((client) => client.id === selectedClient)?.label || "-";
  const runtimes = ["all", ...new Set(presets.map((preset) => preset.runtime || preset.transport).filter(Boolean))];

  function beginInstall(preset: McpPreset) {
    setSelectedPreset(preset);
    setVariables(Object.fromEntries(preset.variables.map((item) => [item.name, item.defaultValue === "${HOME}" ? "" : item.defaultValue])));
  }

  async function install(preset: McpPreset, vars: InstallVariables) {
    setBusyId(preset.id);
    try {
      await onInstall(preset, vars);
      setSelectedPreset(null);
      setVariables({});
    } finally {
      setBusyId("");
    }
  }

  async function importLocalPresets(file?: File) {
    if (!file) return;
    const res = await toolApi.mcpImportPresets(await file.text());
    setMessage(`已导入 ${res.count} 个本地 MCP preset。`);
    await reload();
    if (importInputRef.current) importInputRef.current.value = "";
  }

  async function exportLocalPresets() {
    const res = await toolApi.mcpExportPresets();
    downloadJson("mcp-presets.json", res.presets);
  }

  async function exportPreset(preset: McpPreset) {
    const res = await toolApi.mcpExportPreset(preset.id);
    downloadJson(`${preset.id || preset.name}-mcp-preset.json`, [res.preset]);
  }

  return (
    <article className="panel mcp-server-panel">
      <div className="panel-title">
        <h2>精选 MCP 市场</h2>
        <span className="mcp-market-target">安装到：<strong>{targetLabel}</strong></span>
      </div>
      <p className="mcp-market-hint">
        以下均为写配置即用的服务。安装只会写入所选客户端配置并自动备份，不会执行安装命令；带变量的 preset 可在安装前填写 token 或路径。
      </p>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="mcp-message"><span>{message}</span></div>}

      <div className="control-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <label className="skills-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 MCP、分类或作者" />
        </label>
        <div className="skills-source-tabs">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(event) => void importLocalPresets(event.target.files?.[0])}
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
        </div>
      </div>

      <div className="control-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div className="skills-source-tabs">
          {runtimes.map((item) => (
            <button key={item} type="button" className={runtime === item ? "range-pill active" : "range-pill"} onClick={() => setRuntime(item)}>
              {item === "all" ? "全部运行时" : item}
            </button>
          ))}
        </div>
        <div className="skills-source-tabs">
          {[
            ["all", "全部"],
            ["missing", "未安装"],
            ["installed", "已安装"],
            ["needs-config", "需配置"],
          ].map(([id, label]) => (
            <button key={id} type="button" className={status === id ? "range-pill active" : "range-pill"} onClick={() => setStatus(id as typeof status)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mcp-market-grid">
        {filtered.map((preset) => {
          const installed = installedNames.has(preset.name);
          const isSelected = selectedPreset?.id === preset.id;
          return (
            <div className="mcp-market-card" key={preset.id}>
              <div className="mcp-market-card-head">
                <strong>{preset.title}</strong>
                <span className={`mcp-transport-badge mcp-transport-${preset.transport}`}>
                  {preset.transport === "remote" ? "HTTP" : preset.runtime}
                </span>
              </div>
              <p className="mcp-market-desc">{preset.description}</p>
              <div className="mcp-market-meta">
                <span className="mcp-market-cat">{preset.category}</span>
                <span className="mcp-market-author">{preset.author}</span>
                {preset.homepage && (
                  <a href={preset.homepage} target="_blank" rel="noopener noreferrer" className="mcp-market-link">
                    <ExternalLink size={11} /> 源
                  </a>
                )}
              </div>
              {preset.needsConfig && <div className="mcp-market-needs"><SlidersHorizontal size={12} /> {preset.needsConfig}</div>}
              {isSelected && preset.variables.length > 0 && (
                <div className="mcp-editor-panel" style={{ padding: "8px", marginTop: "8px", gap: "8px" }}>
                  {preset.variables.map((item) => (
                    <label key={item.name}>
                      {item.name}
                      <input
                        type={item.secret ? "password" : "text"}
                        value={variables[item.name] || ""}
                        placeholder={item.defaultValue === "${HOME}" ? "留空使用当前用户目录" : item.defaultValue || `填写 ${item.name}`}
                        onChange={(event) => setVariables((prev) => ({ ...prev, [item.name]: event.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <button
                  className={installed ? "secondary-button mcp-market-installed" : "primary-button"}
                  type="button"
                  style={{ height: "30px", minWidth: 0, fontSize: "12px" }}
                  disabled={!selectedClient || busyId === preset.id || installed}
                  onClick={() => {
                    if (preset.variables.length > 0 && selectedPreset?.id !== preset.id) beginInstall(preset);
                    else void install(preset, variables);
                  }}
                >
                  {installed ? <><CheckCircle2 size={13} /> 已安装</> : <><Download size={13} /> {preset.variables.length > 0 && selectedPreset?.id !== preset.id ? "配置后装到 " + targetLabel : "装到 " + targetLabel}</>}
                </button>
                <button className="secondary-button" type="button" style={{ height: "30px", minWidth: 0, fontSize: "12px" }} onClick={() => void exportPreset(preset)}>
                  <FileDown size={13} /> 导出
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="empty-text">没有匹配的 MCP preset。</p>}
      </div>
    </article>
  );
}
