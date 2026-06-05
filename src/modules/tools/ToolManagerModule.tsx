import { Activity, BookOpen, FolderOpen, Search } from "lucide-react";
import { useState } from "react";
import { toolApi } from "../../toolApi";
import type { ToolItem } from "../../types";

export function ToolManagerModule({ tools }: { tools: ToolItem[] }) {
  const [query, setQuery] = useState("");
  const filtered = tools.filter((tool) => {
    const text = [tool.name, tool.category, tool.description, ...tool.tags].join(" ").toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <section className="module-page">
      <div className="page-heading compact-heading">
        <div>
          <h1>工具管理</h1>
          <p>以后新增工具时，在这里统一登记模块、路径和状态。</p>
        </div>
      </div>
      <label className="search-box wide">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索工具、分类或标签" />
      </label>
      <div className="manager-list">
        {filtered.map((tool) => (
          <article className="manager-row" key={tool.id}>
            <span className="manager-icon" style={{ "--tone": tool.accent } as React.CSSProperties}>
              {tool.id === "codex-usage" ? <Activity size={20} /> : <BookOpen size={20} />}
            </span>
            <div>
              <strong>{tool.name}</strong>
              <small>{tool.category} · {tool.cwd}</small>
            </div>
            <button className="icon-action" type="button" onClick={() => toolApi.openToolFolder(tool.id)}>
              <FolderOpen size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
