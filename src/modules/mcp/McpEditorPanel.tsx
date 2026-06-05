import { Save } from "lucide-react";
import { useState } from "react";
import type { McpServer, McpServerSavePayload } from "../../types";

export type McpEditorState = {
  name: string;
  transport: "stdio" | "remote";
  command: string;
  args: string;
  envText: string;
  url: string;
  headersText: string;
};

export const EMPTY_EDITOR: McpEditorState = {
  name: "",
  transport: "stdio",
  command: "",
  args: "",
  envText: "",
  url: "",
  headersText: "",
};

export function serverToEditor(server: McpServer): McpEditorState {
  return {
    name: server.name,
    transport: server.transport,
    command: server.command,
    args: server.args.join(" "),
    envText: Object.entries(server.env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n"),
    url: server.url,
    headersText: Object.entries(server.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
  };
}

function parseEnvText(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function parseHeadersText(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    headers[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return headers;
}

export function McpEditorPanel({
  initial,
  onSave,
  onCancel,
}: {
  initial: McpEditorState;
  onSave: (data: McpServerSavePayload) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<McpEditorState>(initial);
  const isNew = initial.name === "";

  function handleSave() {
    const name = form.name.trim();
    if (!name) return;
    const payload: McpServerSavePayload = { name };
    if (form.transport === "remote") {
      payload.url = form.url.trim();
      const headers = parseHeadersText(form.headersText);
      if (Object.keys(headers).length > 0) payload.headers = headers;
    } else {
      payload.command = form.command.trim();
      const args = form.args.trim() ? form.args.trim().split(/\s+/) : [];
      if (args.length > 0) payload.args = args;
    }
    const env = parseEnvText(form.envText);
    if (Object.keys(env).length > 0) payload.env = env;
    onSave(payload);
  }

  return (
    <div className="mcp-editor-panel">
      <h3>{isNew ? "添加 MCP 服务器" : `编辑 ${initial.name}`}</h3>

      <label>
        服务器名称
        <input
          type="text"
          value={form.name}
          placeholder="my-server"
          disabled={!isNew}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>

      <label>
        传输类型
        <select
          value={form.transport}
          onChange={(e) =>
            setForm({ ...form, transport: e.target.value as "stdio" | "remote" })
          }
        >
          <option value="stdio">stdio（本地进程）</option>
          <option value="remote">HTTP / SSE（远程）</option>
        </select>
      </label>

      {form.transport === "stdio" ? (
        <>
          <label>
            命令 (command)
            <input
              type="text"
              value={form.command}
              placeholder="npx"
              onChange={(e) => setForm({ ...form, command: e.target.value })}
            />
          </label>
          <label>
            参数 (args，空格分隔)
            <input
              type="text"
              value={form.args}
              placeholder="-y @modelcontextprotocol/server-filesystem /path"
              onChange={(e) => setForm({ ...form, args: e.target.value })}
            />
          </label>
        </>
      ) : (
        <>
          <label>
            URL
            <input
              type="text"
              value={form.url}
              placeholder="https://your-mcp-server.com/sse"
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </label>
          <label>
            Headers（每行 Key: Value）
            <textarea
              rows={3}
              value={form.headersText}
              placeholder={"Authorization: Bearer YOUR_TOKEN"}
              onChange={(e) => setForm({ ...form, headersText: e.target.value })}
            />
          </label>
        </>
      )}

      <label>
        环境变量（每行 KEY=VALUE）
        <textarea
          rows={3}
          value={form.envText}
          placeholder={"API_KEY=sk-xxx\nDATABASE_URL=postgres://..."}
          onChange={(e) => setForm({ ...form, envText: e.target.value })}
        />
      </label>

      <div className="mcp-editor-actions">
        <button className="primary-button" type="button" onClick={handleSave}>
          <Save size={14} />
          {isNew ? "添加" : "保存"}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
