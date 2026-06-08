import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Network,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Store,
  Terminal,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toolApi } from "../../toolApi";
import { McpMarket } from "./McpMarket";
import { EMPTY_EDITOR, McpEditorPanel, serverToEditor, type McpEditorState } from "./McpEditorPanel";
import type { McpClientSummary, McpServer, McpServerSavePayload, McpPreset } from "../../types";

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

const CLIENT_ICON: Record<string, typeof Plug> = {
  antigravity: TestTube2,
  "claude-code": Terminal,
  codex: Network,
};

function McpClientCard({
  client,
  selected,
  onClick,
}: {
  client: McpClientSummary;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = CLIENT_ICON[client.id] || Plug;
  return (
    <button
      className={selected ? "mcp-client-card mcp-client-card-active" : "mcp-client-card"}
      type="button"
      onClick={onClick}
    >
      <div className="mcp-client-icon">
        <Icon size={20} />
      </div>
      <div className="mcp-client-meta">
        <strong>{client.label}</strong>
        <small>
          {client.configExists
            ? `${client.enabledCount} / ${client.serverCount} 启用`
            : "未检测到配置文件"}
        </small>
      </div>
      {client.configExists && (
        <span className="mcp-client-badge">{client.serverCount}</span>
      )}
    </button>
  );
}

function McpServerRow({
  server,
  clients,
  onToggle,
  onEdit,
  onRemove,
  onDuplicate,
}: {
  server: McpServer;
  clients: McpClientSummary[];
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onRemove: () => void;
  onDuplicate: (targetClientId: string) => void;
}) {
  const [showDup, setShowDup] = useState(false);
  const summary =
    server.transport === "remote"
      ? server.url
      : [server.command, ...server.args].join(" ");
  const envCount = Object.keys(server.env).length;

  return (
    <div className={server.enabled ? "mcp-server-row" : "mcp-server-row mcp-server-disabled"}>
      <div className="mcp-server-info">
        <div className="mcp-server-name-row">
          <strong data-i18n-skip>{server.name}</strong>
          <span className={`mcp-transport-badge mcp-transport-${server.transport}`}>
            {server.transport === "remote" ? "HTTP" : "stdio"}
          </span>
          {envCount > 0 && (
            <span className="mcp-env-badge">{envCount} env</span>
          )}
          {server.issues && server.issues.length > 0 && (
            <span className="mcp-env-badge" title={server.issues.join(", ")}>
              需检查
            </span>
          )}
        </div>
        <small title={summary} data-i18n-skip>{summary || "-"}</small>
      </div>
      <div className="mcp-server-actions">
        <button
          className="mcp-toggle-btn"
          type="button"
          title={server.enabled ? "禁用" : "启用"}
          onClick={() => onToggle(!server.enabled)}
        >
          {server.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>
        <button className="mcp-icon-btn" type="button" title="编辑" onClick={onEdit}>
          <Pencil size={14} />
        </button>
        <button
          className="mcp-icon-btn"
          type="button"
          title="复制到其他客户端"
          onClick={() => setShowDup(!showDup)}
        >
          <Copy size={14} />
        </button>
        <button className="mcp-icon-btn mcp-danger-btn" type="button" title="删除" onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      </div>
      {showDup && (
        <div className="mcp-dup-row">
          <span>复制到：</span>
          {clients
            .filter((c) => c.id !== server.clientId)
            .map((c) => (
              <button
                key={c.id}
                className="mcp-dup-target"
                type="button"
                onClick={() => {
                  onDuplicate(c.id);
                  setShowDup(false);
                }}
              >
                {c.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function McpModule() {
  const [view, setView] = useState<"manage" | "market">("manage");
  const [clients, setClients] = useState<McpClientSummary[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [servers, setServers] = useState<McpServer[]>([]);
  const [editing, setEditing] = useState<McpEditorState | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const clientList = await toolApi.mcpListClients();
    setClients(clientList);

    const target = selectedClient || clientList.find((c) => c.configExists)?.id || clientList[0]?.id || "";
    setSelectedClient(target);

    if (target) {
      const serverList = await toolApi.mcpListServers(target);
      setServers(serverList);
    } else {
      setServers([]);
    }
  }

  async function selectClient(clientId: string) {
    setSelectedClient(clientId);
    setEditing(null);
    const serverList = await toolApi.mcpListServers(clientId);
    setServers(serverList);
  }

  async function handleToggle(server: McpServer, enabled: boolean) {
    await toolApi.mcpToggleServer(server.clientId, server.name, enabled);
    setMessage(`${server.name} 已${enabled ? "启用" : "禁用"}。`);
    await refresh();
  }

  async function handleSave(data: McpServerSavePayload) {
    await toolApi.mcpSaveServer(selectedClient, data);
    setEditing(null);
    setMessage(`${data.name} 已保存。`);
    await refresh();
  }

  async function handleRemove(server: McpServer) {
    await toolApi.mcpRemoveServer(server.clientId, server.name);
    setMessage(`${server.name} 已删除。`);
    await refresh();
  }

  async function handleDuplicate(server: McpServer, targetClientId: string) {
    await toolApi.mcpDuplicateServer(server.clientId, server.name, targetClientId);
    const targetLabel = clients.find((c) => c.id === targetClientId)?.label || targetClientId;
    setMessage(`${server.name} 已复制到 ${targetLabel}。`);
    await refresh();
  }

  async function handleInstallPreset(preset: McpPreset, variables: Record<string, string>) {
    const res = await toolApi.mcpInstallPreset(selectedClient, preset.id, variables);
    if (res.ok) {
      const targetLabel = clients.find((c) => c.id === selectedClient)?.label || selectedClient;
      setMessage(`${preset.title} 已安装到 ${targetLabel}${preset.needsConfig ? "（记得在「管理」里填入所需 token）" : ""}。`);
      const syncTargets = clients.filter((client) => client.id !== selectedClient && client.configExists);
      if (syncTargets.length > 0 && window.confirm(`是否同步 ${preset.title} 到其他已检测到的客户端？`)) {
        await Promise.all(syncTargets.map((client) => toolApi.mcpDuplicateServer(selectedClient, preset.name, client.id)));
        setMessage(`${preset.title} 已安装到 ${targetLabel}，并同步到 ${syncTargets.map((client) => client.label).join("、")}。`);
      }
      await refresh();
      setView("manage");
    } else {
      setMessage(`安装 ${preset.title} 失败。`);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const activeClient = clients.find((c) => c.id === selectedClient);
  const totalServers = clients.reduce((sum, c) => sum + c.serverCount, 0);
  const totalEnabled = clients.reduce((sum, c) => sum + c.enabledCount, 0);
  const detectedClients = clients.filter((c) => c.configExists).length;

  return (
    <section className="module-page">
      <div className="page-heading compact-heading">
        <div>
          <h1>MCP 服务管理</h1>
          <p>
            跨 AI 客户端统一管理你的 Model Context Protocol 服务器配置。支持
            反重力、Codex 和 Claude Code。
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="skills-source-tabs">
            <button type="button" className={view === "manage" ? "range-pill active" : "range-pill"} onClick={() => setView("manage")}>
              <Network size={13} /> 管理
            </button>
            <button type="button" className={view === "market" ? "range-pill active" : "range-pill"} onClick={() => setView("market")}>
              <Store size={13} /> 市场
            </button>
          </div>
          <button className="secondary-button" type="button" onClick={refresh}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </div>

      <div className="overview-grid">
        <MetricCard
          label="客户端"
          value={`${detectedClients} / ${clients.length}`}
          detail="已检测到配置文件"
        />
        <MetricCard
          label="MCP 服务器"
          value={String(totalServers)}
          detail={`${totalEnabled} 个已启用`}
        />
        <MetricCard
          label="当前客户端"
          value={activeClient?.label || "-"}
          detail={activeClient?.configPath || "请选择一个客户端"}
        />
      </div>

      {message && (
        <div className="mcp-message">
          <CheckCircle2 size={14} />
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")}>
            <X size={12} />
          </button>
        </div>
      )}

      <div className="mcp-layout">
        <aside className="mcp-client-list">
          <h2>客户端</h2>
          {clients.map((client) => (
            <McpClientCard
              key={client.id}
              client={client}
              selected={client.id === selectedClient}
              onClick={() => selectClient(client.id)}
            />
          ))}
        </aside>

        {view === "market" ? (
          <McpMarket
            clients={clients}
            selectedClient={selectedClient}
            installedNames={new Set(servers.map((s) => s.name))}
            onInstall={handleInstallPreset}
          />
        ) : (
        <article className="panel mcp-server-panel">
          <div className="panel-title">
            <h2>{activeClient?.label || "MCP 服务器"}</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              {activeClient?.docUrl && (
                <a
                  className="secondary-button"
                  href={activeClient.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", height: "32px", minWidth: 0, padding: "0 10px", fontSize: "12px" }}
                >
                  <ExternalLink size={13} />
                  文档
                </a>
              )}
              <button
                className="primary-button"
                type="button"
                style={{ height: "32px", minWidth: 0, padding: "0 12px", fontSize: "12px" }}
                onClick={() => setEditing({ ...EMPTY_EDITOR })}
              >
                <Plus size={14} />
                添加服务器
              </button>
            </div>
          </div>

          {editing && (
            <McpEditorPanel
              initial={editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          )}

          {!activeClient?.configExists && (
            <p className="empty-text">
              该客户端的配置文件尚未创建。添加第一个 MCP 服务器后将自动创建。
            </p>
          )}

          {servers.length === 0 && activeClient?.configExists && !editing && (
            <p className="empty-text">该客户端下没有配置 MCP 服务器。</p>
          )}

          <div className="mcp-server-list">
            {servers.map((server) => (
              <McpServerRow
                key={`${server.clientId}-${server.name}`}
                server={server}
                clients={clients}
                onToggle={(enabled) => handleToggle(server, enabled)}
                onEdit={() => setEditing(serverToEditor(server))}
                onRemove={() => handleRemove(server)}
                onDuplicate={(targetId) => handleDuplicate(server, targetId)}
              />
            ))}
          </div>
        </article>
        )}
      </div>
    </section>
  );
}
