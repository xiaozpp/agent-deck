import {
  Activity,
  FolderOpen,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  Terminal,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toolApi } from "../../toolApi";
import { providerMeta } from "../providerMeta";
import type { SessionDetail, SessionItem, SessionList, SessionMessage } from "../../types";

// Wrap each case-insensitive occurrence of `query` in <mark> so search snippets
// show exactly what matched.
function highlight(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lc = text.toLowerCase();
  const lq = q.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  for (;;) {
    const idx = lc.indexOf(lq, i);
    if (idx < 0) { out.push(text.slice(i)); break; }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(<mark key={key++} className="sess-hit">{text.slice(idx, idx + q.length)}</mark>);
    i = idx + q.length;
  }
  return out;
}

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


function SessionMessageView({ msg }: { msg: SessionMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`sess-msg ${isUser ? "sess-msg-user" : "sess-msg-assistant"}`}>
      <div className="sess-msg-role">
        {isUser ? <User size={13} /> : <Activity size={13} />}
        <span>{isUser ? "我" : "助手"}</span>
        {msg.ts > 0 && <em>{new Date(msg.ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</em>}
      </div>
      {msg.parts.map((p, i) => {
        if (p.kind === "tool_use") {
          return (
            <details className="sess-tool" key={i}>
              <summary>🔧 {p.tool || "tool"}</summary>
              <pre data-i18n-skip>{p.text}</pre>
            </details>
          );
        }
        if (p.kind === "tool_result") {
          return (
            <details className="sess-tool sess-tool-result" key={i}>
              <summary>↳ 工具结果</summary>
              <pre data-i18n-skip>{(p.text || "").slice(0, 4000)}</pre>
            </details>
          );
        }
        if (p.kind === "thinking") {
          return (
            <details className="sess-tool sess-thinking" key={i}>
              <summary>💭 思考</summary>
              <pre data-i18n-skip>{p.text}</pre>
            </details>
          );
        }
        return <div className="sess-text" key={i} data-i18n-skip>{p.text}</div>;
      })}
    </div>
  );
}

export function SessionsModule() {
  const [data, setData] = useState<SessionList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"all" | "claude" | "codex">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SessionItem | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function refresh(opts?: { source?: string; search?: string; force?: boolean }) {
    setLoading(true);
    setError("");
    try {
      const result = await toolApi.sessionsList({
        source: (opts?.source ?? source) as "all" | "claude" | "codex",
        search: opts?.search ?? search,
        force: opts?.force,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取会话失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh({ force: true });
  }, []);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => void refresh({ search }), 250);
    return () => clearTimeout(t);
  }, [search]);

  const sessions = data?.sessions || [];
  const counts = data?.counts || { all: 0, claude: 0, codex: 0 };

  async function openSession(s: SessionItem) {
    setSelected(s);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await toolApi.sessionRead(s.file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取会话内容失败");
    } finally {
      setDetailLoading(false);
    }
  }

  const sourceTabs: Array<{ id: "all" | "claude" | "codex"; label: string; n: number }> = [
    { id: "all", label: "全部", n: counts.all },
    { id: "claude", label: "Claude Code", n: counts.claude },
    { id: "codex", label: "Codex", n: counts.codex },
  ];

  return (
    <section className="module-page">
      <div className="page-heading compact-heading">
        <div>
          <h1>会话历史</h1>
          <p>跨 Claude Code 与 Codex 的本地会话时间线，可全文搜索、查看完整对话、在原项目继续。</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => refresh({ force: true })} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          刷新
        </button>
      </div>

      <div className="control-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div className="skills-source-tabs">
          {sourceTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={source === t.id ? "range-pill active" : "range-pill"}
              onClick={() => { setSource(t.id); void refresh({ source: t.id }); }}
            >
              {t.label} <span className="skills-count">{t.n}</span>
            </button>
          ))}
        </div>
        <div className="skills-search">
          <Search size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索标题、项目或对话内容…" />
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="skills-layout">
        <div className="skills-list">
          {sessions.length === 0 && (
            <p className="empty-text">{search.trim() ? `没有匹配「${search.trim()}」的会话。` : "暂无会话历史。"}</p>
          )}
          {sessions.map((s) => {
            const sm = providerMeta(s.source);
            const active = selected?.file === s.file;
            return (
              <div
                key={s.file}
                className={`skill-card${active ? " skill-card-active" : ""}`}
                onClick={() => openSession(s)}
              >
                <div className="skill-card-head">
                  <span className="skill-card-name" data-i18n-skip title={s.title}>{s.title}</span>
                  <span className="quota-badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                    {sm.label}
                  </span>
                </div>
                <p className="skill-card-desc" data-i18n-skip>{s.preview || "（无预览）"}</p>
                {s.match?.snippet && (
                  <p className="sess-match">
                    <span className="sess-match-role">{s.match.role === "assistant" ? "助手" : "我"}</span>
                    <span data-i18n-skip>{highlight(s.match.snippet, search)}</span>
                  </p>
                )}
                <div className="skill-card-foot">
                  <span className="skill-scope" data-i18n-skip>{s.project || "未知项目"}</span>
                  {s.gitBranch && <span className="skill-scope sess-branch" data-i18n-skip>⎇ {s.gitBranch}</span>}
                  <span className="skill-scope">{s.messageCount} 条</span>
                  <span className="sess-time">{relTime(s.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="skills-editor">
          {!selected ? (
            <div className="skill-empty">
              <MessageSquare size={40} />
              <p>选择左侧的会话查看完整对话。支持搜索你说过的话或 agent 生成的内容。</p>
            </div>
          ) : (
            <div className="skill-detail">
              <div className="skill-detail-head">
                <div style={{ minWidth: 0 }}>
                  <h2 data-i18n-skip>{selected.title}</h2>
                  <div className="skill-detail-meta">
                    {(() => { const sm = providerMeta(selected.source); return (
                      <span className="quota-badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                    ); })()}
                    <span className="skill-scope" data-i18n-skip>{selected.project || "未知项目"}</span>
                    {selected.gitBranch && <span className="skill-scope sess-branch" data-i18n-skip>⎇ {selected.gitBranch}</span>}
                    <span className="skill-scope">{selected.messageCount} 条 · {relTime(selected.updatedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="skill-actions">
                <button className="primary-button" type="button" onClick={() => toolApi.sessionContinue({ cwd: selected.cwd, source: selected.source })} disabled={!selected.cwd}>
                  <Terminal size={14} /> 在此目录继续
                </button>
                <button className="secondary-button" type="button" onClick={() => toolApi.sessionOpenFolder(selected.cwd)} disabled={!selected.cwd}>
                  <FolderOpen size={14} /> 打开项目
                </button>
                <span className="sess-path" data-i18n-skip title={selected.cwd}>{selected.cwd}</span>
              </div>

              {detailLoading && <p className="empty-text">加载对话中…</p>}
              {detail && (
                <div className="sess-transcript">
                  {detail.messages.length === 0 && <p className="empty-text">该会话没有可显示的消息。</p>}
                  {detail.messages.map((m, i) => <SessionMessageView key={i} msg={m} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
